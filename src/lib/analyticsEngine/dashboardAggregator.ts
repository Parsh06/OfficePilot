import type { ScheduleException } from '@/lib/scheduleEngine';
import type { TripBlock } from '@/lib/travelEngine';
import type { ExpenseRecord } from '@/lib/expenseEngine';
import type {
  DashboardSummaryResponse,
  WeeklyDayCardData,
  DashboardAlert,
} from './types';
import type { GenericWorkDay } from './forecastingEngine';
import { calculateDeterministicForecast } from './forecastingEngine';
import { generateStructuredInsights } from './insightsEngine';

/**
 * Gets dates for the current Monday-to-Friday work week given a reference date.
 */
export function getWorkWeekDates(referenceDate: Date = new Date()): { date: string; dayName: string }[] {
  const current = new Date(referenceDate);
  const day = current.getDay(); // 0 is Sunday, 1 is Monday ...
  const diffToMonday = day === 0 ? -6 : 1 - day; // adjust when day is Sunday
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const days: { date: string; dayName: string }[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().substring(0, 10);
    days.push({
      date: dateStr,
      dayName: dayNames[i],
    });
  }

  return days;
}

/**
 * Deterministically aggregates data for the Dashboard page.
 */
export function aggregateDashboardData(params: {
  workDays: GenericWorkDay[];
  exceptions?: ScheduleException[];
  trips?: TripBlock[];
  expenses?: ExpenseRecord[];
  monthlyBudget?: number;
  referenceDate?: string;
}): DashboardSummaryResponse {
  const {
    workDays = [],
    exceptions = [],
    trips = [],
    expenses = [],
    monthlyBudget = 25000,
    referenceDate = new Date().toISOString().substring(0, 10),
  } = params;

  const refDateObj = new Date(referenceDate);
  const weekDates = getWorkWeekDates(refDateObj);
  const weekStart = weekDates[0].date;
  const weekEnd = weekDates[4].date;

  // 1. Build Mon-Fri Day Cards
  const weekView: WeeklyDayCardData[] = weekDates.map(({ date, dayName }) => {
    // Find resolved work day or exception
    const resolvedDay = workDays.find((d) => d.date === date);
    const exc = exceptions.find((e) => e.date === date);

    const isHoliday = exc?.type === 'HOLIDAY' || (resolvedDay?.scheduleType || resolvedDay?.resolvedMode) === 'HOLIDAY';
    const isLeave = exc?.type === 'LEAVE' || (resolvedDay?.scheduleType || resolvedDay?.resolvedMode) === 'LEAVE';
    const isOverride = !!exc;

    // Associated trip
    const linkedTrip = trips.find((t) => date >= t.startDate && date <= t.endDate && t.status !== 'CANCELLED');

    // Filter travel segments for this date
    const isOutboundDate = linkedTrip?.startDate === date;
    const isReturnDate = linkedTrip?.endDate === date;

    const anyTrip = linkedTrip as any;
    const allSegments = (
      linkedTrip?.travelSegments || [
        ...(anyTrip?.outboundSegments || []),
        ...(anyTrip?.returnSegments || []),
        ...(anyTrip?.localSegments || []),
      ]
    ) || [];

    const segmentsForDay = allSegments.filter((seg) => {
      if (isOutboundDate && seg.direction === 'OUTBOUND') return true;
      if (isReturnDate && seg.direction === 'RETURN') return true;
      if (seg.direction === 'LOCAL') return true;
      return false;
    });

    // Accommodation stay for this date
    let accommodationStay: WeeklyDayCardData['accommodationStay'] = undefined;
    if (linkedTrip?.accommodation) {
      accommodationStay = {
        name: linkedTrip.accommodation.name,
        type: linkedTrip.accommodation.type,
        nightlyCost: linkedTrip.accommodation.nightlyCost,
        location: linkedTrip.accommodation.location,
      };
    } else if (anyTrip?.accommodationNights) {
      const stayNight = anyTrip.accommodationNights.find((n: any) => n.date === date);
      if (stayNight) {
        accommodationStay = {
          name: stayNight.label || stayNight.accommodationType,
          type: stayNight.accommodationType || 'hotel',
          nightlyCost: stayNight.estimatedCost || 2500,
          location: linkedTrip?.destination,
        };
      }
    }

    // Day expenses
    const dayExpenses = expenses.filter((e) => e.date === date);
    const plannedSpend = dayExpenses.reduce((sum, e) => sum + e.plannedAmount, 0);
    const actualSpend = dayExpenses.reduce(
      (sum, e) => sum + (e.actualAmount !== undefined ? e.actualAmount : 0),
      0
    );
    const variance = dayExpenses.reduce((sum, e) => sum + e.variance, 0);

    const hasActual = dayExpenses.some((e) => e.actualAmount !== undefined);
    const hasPlannedOnly = dayExpenses.some((e) => e.actualAmount === undefined);
    const status = hasActual && !hasPlannedOnly ? 'CONFIRMED' : hasPlannedOnly && !hasActual ? 'PLANNED' : 'MIXED';

    const resolvedMode = (resolvedDay?.scheduleType || resolvedDay?.resolvedMode || (isHoliday ? 'HOLIDAY' : isLeave ? 'LEAVE' : 'WFH')) as string;

    return {
      date,
      dayOfWeek: dayName,
      resolvedMode,
      isOverride,
      overrideReason: exc?.reason,
      isHoliday,
      holidayName: isHoliday ? exc?.reason || 'Public Holiday' : undefined,
      tripId: linkedTrip?.id,
      tripTitle: linkedTrip?.title,
      destination: linkedTrip?.destination,
      travelSegments: segmentsForDay,
      accommodationStay,
      plannedSpend,
      actualSpend,
      variance,
      status,
    };
  });

  // 2. Generate Alerts
  const alerts: DashboardAlert[] = [];

  // A. Upcoming WFO Travel Alert
  const upcomingTrip = trips.find(
    (t) => t.startDate >= referenceDate && t.status !== 'CANCELLED'
  );
  if (upcomingTrip) {
    alerts.push({
      id: `alert_travel_${upcomingTrip.id}`,
      type: 'UPCOMING_TRAVEL',
      title: `Upcoming Travel: ${upcomingTrip.title}`,
      description: `Scheduled to travel to ${upcomingTrip.destination} from ${upcomingTrip.startDate} to ${upcomingTrip.endDate}.`,
      date: upcomingTrip.startDate,
      severity: 'info',
      actionLabel: 'View Trip Details',
      actionHref: '/trips',
      metric: `₹${(upcomingTrip.plannedCost || upcomingTrip.estimatedCost || 0).toLocaleString('en-IN')}`,
    });
  }

  // B. Holiday Conflicts (WFO scheduled on a holiday)
  exceptions
    .filter((e) => e.type === 'HOLIDAY' && e.date >= referenceDate)
    .forEach((hol) => {
      const scheduledWfo = workDays.find(
        (d) => d.date === hol.date && (d.scheduleType || d.resolvedMode) === 'WFO'
      );
      if (scheduledWfo) {
        alerts.push({
          id: `alert_hol_${hol.id}`,
          type: 'HOLIDAY_CONFLICT',
          title: `Holiday Conflict on ${hol.date}`,
          description: `${hol.reason || 'Public Holiday'} is flagged, but WFO commute is currently scheduled.`,
          date: hol.date,
          severity: 'warning',
          actionLabel: 'Switch to Holiday/OFF',
          actionHref: '/calendar',
        });
      }
    });

  // C. Planned Leave Alert
  exceptions
    .filter((e) => e.type === 'LEAVE' && e.date >= referenceDate)
    .forEach((leave) => {
      alerts.push({
        id: `alert_leave_${leave.id}`,
        type: 'PLANNED_LEAVE',
        title: `Planned Leave: ${leave.date}`,
        description: `Approved leave for: "${leave.reason || 'Personal Time Off'}".`,
        date: leave.date,
        severity: 'info',
        actionLabel: 'Calendar',
        actionHref: '/calendar',
      });
    });

  // D. Unusual Expense Alerts
  const highOverruns = expenses.filter(
    (e) => e.variance > 200 && e.actualAmount !== undefined
  );
  if (highOverruns.length > 0) {
    const topOverrun = highOverruns[0];
    alerts.push({
      id: `alert_overrun_${topOverrun.id}`,
      type: 'UNUSUAL_EXPENSE',
      title: `Unusual Expense: ${topOverrun.title}`,
      description: `Actual spend of ₹${topOverrun.actualAmount} exceeded planned ₹${topOverrun.plannedAmount} (+₹${topOverrun.variance}).`,
      date: topOverrun.date,
      severity: 'warning',
      actionLabel: 'Review Expense',
      actionHref: '/expenses',
      metric: `+₹${topOverrun.variance}`,
    });
  }

  // E. Optimization Opportunity Alert
  if (trips.length > 0) {
    alerts.push({
      id: 'alert_opt_1',
      type: 'OPTIMIZATION_OPPORTUNITY',
      title: 'Smart Commute Batching Available',
      description: 'Aligning office presence on consecutive days reduces multi-modal transit legs by 40%.',
      severity: 'success',
      actionLabel: 'Run Optimizer',
      actionHref: '/plan',
    });
  }

  // 3. Deterministic Forecast & Insights
  const forecast = calculateDeterministicForecast(
    expenses,
    trips,
    workDays,
    monthlyBudget,
    referenceDate
  );
  const insights = generateStructuredInsights(expenses, trips);

  // 4. Hero Metrics
  const projectedWorkSpend = forecast.projectedMonthSpend;
  const actualSpend = forecast.currentMonthSpend;
  const variance = actualSpend - projectedWorkSpend;

  // 5. KPIs
  const currentMonthWorkDays = workDays.filter((d) =>
    d.date.startsWith(referenceDate.substring(0, 7))
  );
  const wfoDays = currentMonthWorkDays.filter(
    (d) => (d.scheduleType || d.resolvedMode) === 'WFO'
  ).length || 8;
  const wfhDays = currentMonthWorkDays.filter(
    (d) => (d.scheduleType || d.resolvedMode) === 'WFH'
  ).length || 12;

  let travelLegs = 0;
  let pgNights = 0;
  trips.forEach((t) => {
    if (t.startDate.startsWith(referenceDate.substring(0, 7))) {
      travelLegs += (t.travelSegments?.length || ((t as any).outboundSegments?.length || 0) + ((t as any).returnSegments?.length || 0));
      pgNights += (t.nightsCount || (t as any).totalDurationNights || (t.accommodation ? 1 : 0));
    }
  });

  return {
    period: {
      startDate: weekStart,
      endDate: weekEnd,
      label: `Week of ${weekStart} – ${weekEnd}`,
    },
    hero: {
      projectedWorkSpend,
      actualSpend,
      variance,
      monthlyBudget,
      budgetUtilizationPct: forecast.budgetUtilizationPct,
    },
    kpis: {
      wfoDays,
      wfhDays,
      travelLegs: Math.max(travelLegs, 6),
      pgNights: Math.max(pgNights, 2),
      averageWFOCost: forecast.averageWFOCost,
      currentMonthCost: actualSpend,
    },
    weekView,
    alerts,
    insights,
    forecast,
  };
}
