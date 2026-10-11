import {
  findScheduledJob,
  createOrUpdateScheduledJob,
  markScheduledJobCompleted,
  markScheduledJobFailed,
} from '../repositories/scheduledJobRepository';
import {
  getAdminWorkSchedule,
  getAdminTravelProfile,
  getAdminScheduleExceptions,
  getAdminUserProfile,
} from '../repositories/firestoreAdminRepository';
import { sendNotification } from './notificationService';
import { saveWeeklyPlan } from '../repositories/weeklyPlanRepository';
import { upsertWorkDays } from '../repositories/workDayRepository';
import { getAdminFirestore } from '../db/firestoreAdmin';
import { getCollection } from '../db/mongodb';
import type { DayPlanItem } from '../types';

/**
 * Helper to compute localized ISO dates and day names for a specific timezone.
 */
export function getUserLocalDates(timezone: string = 'Asia/Kolkata', baseDate: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.format(baseDate); // YYYY-MM-DD
  const today = new Date(parts + 'T00:00:00Z');

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  const formatIso = (d: Date) => d.toISOString().substring(0, 10);

  // Compute Monday of current week
  const dayOfWeekIndex = today.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeekIndex === 0 ? -6 : 1 - dayOfWeekIndex;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + distanceToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  return {
    todayStr: formatIso(today),
    tomorrowStr: formatIso(tomorrow),
    yesterdayStr: formatIso(yesterday),
    weekStartStr: formatIso(monday),
    weekEndStr: formatIso(sunday),
    todayDayName: dayNames[today.getUTCDay()],
    tomorrowDayName: dayNames[tomorrow.getUTCDay()],
  };
}

/**
 * Discovers active user IDs from Firestore or MongoDB.
 */
export async function getActiveUserIds(): Promise<string[]> {
  const userIds = new Set<string>();

  // 1. Check Firestore
  try {
    const db = getAdminFirestore();
    if (db) {
      const snapshot = await db.collection('users').limit(50).get();
      snapshot.forEach((doc: any) => userIds.add(doc.id));
    }
  } catch {
    // Firestore offline
  }

  // 2. Check MongoDB
  try {
    const col = await getCollection<any>('users');
    if (col) {
      const mongoUsers = await col.find({}, { projection: { userId: 1, uid: 1 } }).limit(50).toArray();
      mongoUsers.forEach((u: any) => {
        if (u.userId) userIds.add(u.userId);
        if (u.uid) userIds.add(u.uid);
      });
    }
  } catch {
    // MongoDB offline
  }

  // Default fallback user for testing / single tenant environments
  if (userIds.size === 0) {
    userIds.add('demo-traveler-uid-001');
  }

  return Array.from(userIds);
}

export interface CronExecutionResult {
  job: string;
  status: 'COMPLETED' | 'FAILED';
  processedAt: string;
  usersProcessed: number;
  notificationsCreated: number;
  plansGenerated: number;
  errors: Array<{ userId: string; error: string }>;
  summary: string;
}

/**
 * Central daily scheduler.
 * 
 * Iterates through active users, resolves timezone-aware schedules,
 * updates weekly planning data, and dispatches deduplicated notifications.
 */
export async function runDailyScheduler(options: { force?: boolean } = {}): Promise<CronExecutionResult> {
  const activeUserIds = await getActiveUserIds();
  const errors: Array<{ userId: string; error: string }> = [];
  let notificationsCreated = 0;
  let plansGenerated = 0;
  let usersProcessed = 0;

  for (const userId of activeUserIds) {
    try {
      // 1. Fetch user profile for timezone
      const profile = await getAdminUserProfile(userId);
      const timezone = profile?.timezone || 'Asia/Kolkata';
      const localDates = getUserLocalDates(timezone);
      const { todayStr, tomorrowStr, weekStartStr, weekEndStr, tomorrowDayName, todayDayName } = localDates;

      // 2. Check Idempotency Guard (has DAILY_DISPATCH already completed for today?)
      if (!options.force) {
        const existingJob = await findScheduledJob(userId, 'DAILY_DISPATCH', todayStr);
        if (existingJob && existingJob.status === 'COMPLETED') {
          continue; // Already executed today, skip duplicate run
        }
      }

      await createOrUpdateScheduledJob({
        jobId: `job_daily_${userId}_${todayStr}`,
        type: 'DAILY_DISPATCH',
        userId,
        scheduledFor: todayStr,
        status: 'RUNNING',
        attempts: 1,
        lastAttemptAt: new Date().toISOString(),
      });

      // 3. Load user configurations
      const [schedule, travelProfile, exceptions] = await Promise.all([
        getAdminWorkSchedule(userId),
        getAdminTravelProfile(userId),
        getAdminScheduleExceptions(userId),
      ]);

      const defaultSchedule = {
        monday: schedule?.monday || 'WFH',
        tuesday: schedule?.tuesday || 'WFO',
        wednesday: schedule?.wednesday || 'WFO',
        thursday: schedule?.thursday || 'WFO',
        friday: schedule?.friday || 'WFH',
        saturday: schedule?.saturday || 'OFF',
        sunday: schedule?.sunday || 'OFF',
      };

      // 4. Resolve Tomorrow's Schedule
      const tomorrowException = exceptions.find((e) => e.date === tomorrowStr);
      const tomorrowDayKey = tomorrowDayName.toLowerCase() as keyof typeof defaultSchedule;
      const tomorrowMode = tomorrowException ? tomorrowException.mode : (defaultSchedule[tomorrowDayKey] || 'WFH');

      // 5. Generate Upcoming WFO & Travel Notifications
      if (tomorrowMode === 'WFO') {
        const transitCost = (travelProfile?.outboundCostEstimate || 850) + (travelProfile?.returnCostEstimate || 850);
        const wfoNotif = await sendNotification({
          userId,
          type: 'WFO_REMINDER',
          title: 'Upcoming Office Attendance Tomorrow',
          message: `Tomorrow (${tomorrowStr}) is a scheduled in-office day at ${profile?.officeCity || 'Pune HQ'}. Estimated commute: ₹${transitCost}.`,
          targetDate: tomorrowStr,
          entityId: 'wfo_tomorrow',
          link: '/calendar',
        });
        if (wfoNotif.sent) notificationsCreated++;

        const travelNotif = await sendNotification({
          userId,
          type: 'TRAVEL_REMINDER',
          title: 'Transit Route Reminder',
          message: `Vande Bharat Express departure recommended at 07:15 AM from ${profile?.homeCity || 'Mumbai'}.`,
          targetDate: tomorrowStr,
          entityId: 'transit_tomorrow',
          link: '/trips',
        });
        if (travelNotif.sent) notificationsCreated++;
      }

      // 6. Check Holiday Conflicts
      const knownHolidays: Record<string, string> = {
        '2026-10-14': 'Diwali Eve',
        '2026-10-15': 'Diwali Festival',
        '2026-11-01': 'State Foundation Day',
        '2026-12-25': 'Christmas',
      };

      if (knownHolidays[tomorrowStr] && tomorrowMode === 'WFO') {
        const holidayNotif = await sendNotification({
          userId,
          type: 'HOLIDAY_CONFLICT',
          title: `Public Holiday Detected: ${knownHolidays[tomorrowStr]}`,
          message: `You have WFO scheduled on ${knownHolidays[tomorrowStr]} (${tomorrowStr}). Switch to WFH to save transit fares.`,
          targetDate: tomorrowStr,
          entityId: `holiday_${tomorrowStr}`,
          link: '/plan/scenarios',
        });
        if (holidayNotif.sent) notificationsCreated++;
      }

      // 7. Check Unrecorded Expense Reminder
      const yesterdayException = exceptions.find((e) => e.date === localDates.yesterdayStr);
      const yesterdayDayKey = localDates.todayDayName.toLowerCase() as keyof typeof defaultSchedule;
      const yesterdayMode = yesterdayException ? yesterdayException.mode : defaultSchedule[yesterdayDayKey];

      if (yesterdayMode === 'WFO') {
        const expNotif = await sendNotification({
          userId,
          type: 'EXPENSE_REMINDER',
          title: 'Record Yesterday’s Commute Expenses',
          message: `You completed an office day yesterday (${localDates.yesterdayStr}). Record actual receipts to keep budget variance accurate.`,
          targetDate: localDates.yesterdayStr,
          entityId: `exp_remind_${localDates.yesterdayStr}`,
          link: '/expenses',
        });
        if (expNotif.sent) notificationsCreated++;
      }

      // 8. Generate / Update Deterministic Weekly Plan
      const dayPlans: DayPlanItem[] = [];
      const mondayDate = new Date(weekStartStr + 'T00:00:00Z');
      let totalWeekCost = 0;
      let wfoCount = 0;
      let wfhCount = 0;
      let transitLegs = 0;

      for (let i = 0; i < 7; i++) {
        const cur = new Date(mondayDate);
        cur.setUTCDate(mondayDate.getUTCDate() + i);
        const curDateStr = cur.toISOString().substring(0, 10);
        const curDayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][cur.getUTCDay()];
        const dayKey = curDayName.toLowerCase() as keyof typeof defaultSchedule;

        const exc = exceptions.find((e) => e.date === curDateStr);
        const resolvedMode = (exc ? exc.mode : defaultSchedule[dayKey]) as any;

        let cost = 0;
        if (resolvedMode === 'WFO') {
          cost = (travelProfile?.outboundCostEstimate || 850) + (travelProfile?.returnCostEstimate || 850) + 450;
          wfoCount++;
          transitLegs += 2;
        } else if (resolvedMode === 'WFH') {
          cost = 150;
          wfhCount++;
        }

        totalWeekCost += cost;

        dayPlans.push({
          date: curDateStr,
          dayOfWeek: curDayName,
          mode: resolvedMode,
          estimatedCost: cost,
          isException: !!exc,
        });
      }

      await saveWeeklyPlan({
        userId,
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        projectedCost: totalWeekCost,
        wfoDaysCount: wfoCount,
        wfhDaysCount: wfhCount,
        transitLegsCount: transitLegs,
        lodgingNightsCount: Math.max(0, wfoCount - 1),
        dayPlans,
      });

      // Synchronize derived workDays in MongoDB for calendar/dashboard
      await upsertWorkDays(
        userId,
        dayPlans.map((dp) => ({
          date: dp.date,
          mode: dp.mode,
          notes: dp.isException ? 'Exception Override' : 'Standard Weekly Plan',
        }))
      );
      plansGenerated++;

      // 9. Scan for Optimization Opportunities & Weekly Summary
      if (todayDayName === 'MONDAY' || todayDayName === 'SUNDAY') {
        const sumNotif = await sendNotification({
          userId,
          type: 'WEEKLY_SUMMARY',
          title: `Weekly WorkTrip Plan (${weekStartStr} to ${weekEndStr})`,
          message: `Your upcoming week includes ${wfoCount} WFO days with ₹${totalWeekCost.toLocaleString('en-IN')} projected travel spend.`,
          targetDate: weekStartStr,
          entityId: `summary_${weekStartStr}`,
          link: '/dashboard',
        });
        if (sumNotif.sent) notificationsCreated++;
      }

      if (wfoCount >= 3) {
        const optNotif = await sendNotification({
          userId,
          type: 'OPTIMIZATION_OPPORTUNITY',
          title: 'Commute Batching Opportunity',
          message: 'Batching your mid-week office attendance into a 2-day contiguous block saves an estimated ₹1,850.',
          targetDate: todayStr,
          entityId: `opt_batch_${weekStartStr}`,
          link: '/plan/optimizer',
        });
        if (optNotif.sent) notificationsCreated++;
      }

      // 10. Mark Job Completed
      await markScheduledJobCompleted(userId, 'DAILY_DISPATCH', todayStr);
      usersProcessed++;
    } catch (err: any) {
      console.error(`[CronDispatcher] Error processing user ${userId}:`, err);
      errors.push({ userId, error: err?.message || 'Unknown error' });
      await markScheduledJobFailed(userId, 'DAILY_DISPATCH', new Date().toISOString().substring(0, 10), err?.message || 'Failure');
    }
  }

  return {
    job: 'central_daily_scheduler',
    status: errors.length > 0 && usersProcessed === 0 ? 'FAILED' : 'COMPLETED',
    processedAt: new Date().toISOString(),
    usersProcessed,
    notificationsCreated,
    plansGenerated,
    errors,
    summary: `Daily scheduler completed. Processed ${usersProcessed} users, generated ${plansGenerated} weekly plans, dispatched ${notificationsCreated} notifications.`,
  };
}
