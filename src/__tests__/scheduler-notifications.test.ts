import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserLocalDates,
  runDailyScheduler,
  getActiveUserIds,
} from '@/server/services/cronDispatcherService';
import {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllUserNotificationsAsRead,
  deleteUserNotification,
  clearAllUserNotifications,
  registerUserFCMToken,
  removeUserFCMToken,
} from '@/server/services/notificationService';
import {
  findScheduledJob,
} from '@/server/repositories/scheduledJobRepository';
import { getWeeklyPlan } from '@/server/repositories/weeklyPlanRepository';
import { findWorkDaysByRange } from '@/server/repositories/workDayRepository';
import dailyCronHandler from '../../api/cron/daily';

describe('Phase 12: Background Scheduling, Central Cron & Notifications', () => {
  const testUserId = 'test_traveler_cron_12';

  beforeEach(() => {
    // Reset test state if needed
  });

  describe('1. Timezone Resolution', () => {
    it('computes localized dates accurately for Asia/Kolkata timezone', () => {
      const fixedUtcDate = new Date('2026-10-14T20:00:00Z'); // In UTC: 14th 8 PM, but in IST (+5:30): 15th 1:30 AM
      const istDates = getUserLocalDates('Asia/Kolkata', fixedUtcDate);

      expect(istDates.todayStr).toBe('2026-10-15');
      expect(istDates.tomorrowStr).toBe('2026-10-16');
      expect(istDates.yesterdayStr).toBe('2026-10-14');
      expect(istDates.todayDayName).toBe('THURSDAY');
    });

    it('computes localized week bounds (Monday to Sunday) deterministically', () => {
      const baseDate = new Date('2026-10-15T00:00:00Z'); // Thursday
      const dates = getUserLocalDates('Asia/Kolkata', baseDate);

      expect(dates.weekStartStr).toBe('2026-10-12'); // Monday
      expect(dates.weekEndStr).toBe('2026-10-18'); // Sunday
    });
  });

  describe('2. Cron Endpoint Security & Authorization', () => {
    it('rejects unauthorized invocation when CRON_SECRET is set', async () => {
      process.env.CRON_SECRET = 'secret_cron_token_12345';

      let statusCode = 200;
      let jsonResult: any = null;

      const mockReq: any = {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong_token',
        },
      };

      const mockRes: any = {
        setHeader: () => mockRes,
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          jsonResult = data;
        },
        send: () => {},
      };

      await dailyCronHandler(mockReq, mockRes);
      expect(statusCode).toBe(401);
      expect(jsonResult.error.code).toBe('UNAUTHORIZED');

      delete process.env.CRON_SECRET;
    });

    it('allows authorized invocation when CRON_SECRET matches', async () => {
      process.env.CRON_SECRET = 'valid_secret_999';

      let statusCode = 200;
      let jsonResult: any = null;

      const mockReq: any = {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_secret_999',
        },
        query: { force: 'true' },
      };

      const mockRes: any = {
        setHeader: () => mockRes,
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          jsonResult = data;
        },
        send: () => {},
      };

      await dailyCronHandler(mockReq, mockRes);
      expect(statusCode).toBe(200);
      expect(jsonResult.data.job).toBe('central_daily_scheduler');

      delete process.env.CRON_SECRET;
    });
  });

  describe('3. Central Daily Scheduler & Job Persistence', () => {
    it('executes daily scheduler, resolves schedule, and generates weekly plan', async () => {
      const result = await runDailyScheduler({ force: true });

      expect(result.status).toBe('COMPLETED');
      expect(result.usersProcessed).toBeGreaterThan(0);
      expect(result.plansGenerated).toBeGreaterThan(0);

      // Verify persisted job record
      const dates = getUserLocalDates('Asia/Kolkata');
      const userIds = await getActiveUserIds();
      const primaryUser = userIds[0];

      const jobRecord = await findScheduledJob(primaryUser, 'DAILY_DISPATCH', dates.todayStr);
      expect(jobRecord).toBeDefined();
      expect(jobRecord?.status).toBe('COMPLETED');

      // Verify generated weekly plan
      const weeklyPlan = await getWeeklyPlan(primaryUser, dates.weekStartStr);
      expect(weeklyPlan).toBeDefined();
      expect(weeklyPlan?.dayPlans.length).toBe(7);
      expect(weeklyPlan?.projectedCost).toBeGreaterThan(0);

      // Verify MongoDB workDays synchronization
      const syncedWorkDays = await findWorkDaysByRange(primaryUser, dates.weekStartStr, dates.weekEndStr);
      expect(syncedWorkDays.length).toBe(7);
    });

    it('enforces idempotency: does not duplicate jobs or work when invoked multiple times', async () => {
      // First run
      const firstRun = await runDailyScheduler();
      expect(firstRun.status).toBe('COMPLETED');

      // Second run on the same day without force
      const secondRun = await runDailyScheduler();
      expect(secondRun.status).toBe('COMPLETED');
      // Skipped duplicate user processing because job was already COMPLETED
      expect(secondRun.usersProcessed).toBe(0);
      expect(secondRun.notificationsCreated).toBe(0);
    });
  });

  describe('4. Notification Deduplication & Dispatch', () => {
    it('sends notification and blocks duplicate alerts with same dedupKey', async () => {
      const firstNotif = await sendNotification({
        userId: testUserId,
        type: 'WFO_REMINDER',
        title: 'Tomorrow is an in-office day',
        message: 'Scheduled WFO in Pune HQ. Commute estimate: ₹1,700.',
        targetDate: '2026-10-20',
        entityId: 'office_pune_20',
        link: '/calendar',
      });

      expect(firstNotif.sent).toBe(true);
      expect(firstNotif.isDuplicate).toBe(false);

      // Duplicate attempt on the same day & entity
      const duplicateNotif = await sendNotification({
        userId: testUserId,
        type: 'WFO_REMINDER',
        title: 'Tomorrow is an in-office day',
        message: 'Scheduled WFO in Pune HQ.',
        targetDate: '2026-10-20',
        entityId: 'office_pune_20',
        link: '/calendar',
      });

      expect(duplicateNotif.sent).toBe(false);
      expect(duplicateNotif.isDuplicate).toBe(true);
      expect(duplicateNotif.reason).toBe('DUPLICATE_ALERT');
    });

    it('supports read, unread, and deletion lifecycle operations', async () => {
      const notif = await sendNotification({
        userId: testUserId,
        type: 'EXPENSE_REMINDER',
        title: 'Record travel expenses',
        message: 'You have unrecorded expenses from yesterday.',
        targetDate: '2026-10-21',
        entityId: 'exp_21',
      });

      expect(notif.notification).toBeDefined();
      const notifId = notif.notification!.id;

      // Fetch
      const notifs = await getUserNotifications(testUserId);
      expect(notifs.some((n) => n.id === notifId)).toBe(true);

      // Mark read
      await markNotificationAsRead(testUserId, notifId);
      const updated = await getUserNotifications(testUserId);
      const target = updated.find((n) => n.id === notifId);
      expect(target?.read).toBe(true);

      // Mark all read
      await markAllUserNotificationsAsRead(testUserId);

      // Delete
      await deleteUserNotification(testUserId, notifId);
      const remaining = await getUserNotifications(testUserId);
      expect(remaining.some((n) => n.id === notifId)).toBe(false);

      // Clear all
      await clearAllUserNotifications(testUserId);
      const cleared = await getUserNotifications(testUserId);
      expect(cleared.length).toBe(0);
    });
  });

  describe('5. Push Token Registration Lifecycle', () => {
    it('registers and removes FCM push tokens server-side', async () => {
      const mockToken = 'fcm_token_test_abc_123';
      const saved = await registerUserFCMToken(testUserId, mockToken, 'Mozilla/5.0 (Windows NT 10.0)');
      expect(saved.token).toBe(mockToken);
      expect(saved.userId).toBe(testUserId);

      const deleted = await removeUserFCMToken(testUserId, mockToken);
      expect(deleted).toBe(true);
    });
  });
});
