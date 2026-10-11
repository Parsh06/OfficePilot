import type {
  NormalSchedule,
  BaseWorkMode,
  ResolvedWorkMode,
  WeekDay,
  ScheduleException,
  ResolvedDaySchedule,
  ScheduleMetrics,
  ConflictType,
} from './types';

const WEEKDAYS_MAP: WeekDay[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Extracts weekday name ('monday' ... 'sunday') for any ISO date string or Date instance.
 */
export function getDayOfWeek(dateInput: string | Date): WeekDay {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput.substring(0, 10)}T00:00:00`) : dateInput;
  return WEEKDAYS_MAP[date.getDay()];
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates default normal schedule.
 */
export function createDefaultSchedule(
  userId: string,
  overrides: Partial<NormalSchedule> = {}
): NormalSchedule {
  const now = new Date().toISOString();
  return {
    userId,
    timezone: 'Asia/Kolkata',
    effectiveFrom: '2026-01-01',
    monday: 'WFH',
    tuesday: 'WFO',
    wednesday: 'WFO',
    thursday: 'WFO',
    friday: 'WFH',
    saturday: 'OFF',
    sunday: 'OFF',
    homeCity: 'Bengaluru',
    officeCity: 'Mumbai HQ',
    wfoTargetDaysPerMonth: 8,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Resolves the baseline normal work mode for a specific date without exceptions.
 */
export function resolveBaseWorkMode(
  dateInput: string | Date,
  schedule: NormalSchedule
): BaseWorkMode {
  const weekday = getDayOfWeek(dateInput);
  return schedule[weekday] || 'WFH';
}

/**
 * Deterministically resolves a single calendar day with conflict detection and strict precedence:
 * Approved Leave -> Holiday -> Explicit User Override -> Normal Schedule
 */
export function resolveWorkDay(
  dateInput: string | Date,
  schedule: NormalSchedule,
  exceptions: ScheduleException[] = []
): ResolvedDaySchedule {
  const dateStr = typeof dateInput === 'string' ? dateInput.substring(0, 10) : formatDate(dateInput);
  const dayOfWeek = getDayOfWeek(dateStr);
  const baseMode = resolveBaseWorkMode(dateStr, schedule);

  // Find all exceptions matching this exact date
  const matchingExceptions = exceptions.filter((ex) => ex.date === dateStr);

  let finalMode: ResolvedWorkMode = baseMode;
  let isOverridden = false;
  let appliedException: ScheduleException | undefined;

  let conflict = false;
  let conflictType: ConflictType | undefined;
  let conflictMessage: string | undefined;
  let requiresPlanning = false;

  let holidayInfo: ResolvedDaySchedule['holiday'];
  let leaveInfo: ResolvedDaySchedule['leave'];
  let overrideInfo: ResolvedDaySchedule['override'];

  if (matchingExceptions.length > 0) {
    // 1. Check if multiple distinct overrides exist for the same date
    if (matchingExceptions.length > 1) {
      conflict = true;
      conflictType = 'MULTIPLE_OVERRIDES';
      conflictMessage = `Multiple conflicting schedule exceptions (${matchingExceptions.length}) registered for this date.`;
      requiresPlanning = true;
    }

    // Sort by deterministic precedence: LEAVE -> HOLIDAY -> TRAVEL -> EXPLICIT OVERRIDES -> USER_OVERRIDE
    const precedenceOrder: Record<string, number> = {
      LEAVE: 1,
      HOLIDAY: 2,
      TRAVEL: 3,
      EXPLICIT_WFO_OVERRIDE: 4,
      EXPLICIT_WFH_OVERRIDE: 4,
      EXPLICIT_OFF_OVERRIDE: 4,
      USER_OVERRIDE: 5,
    };

    const sortedExceptions = [...matchingExceptions].sort(
      (a, b) => (precedenceOrder[a.type] || 99) - (precedenceOrder[b.type] || 99)
    );

    appliedException = sortedExceptions[0];
    isOverridden = true;

    // Process highest precedence exception
    switch (appliedException.type) {
      case 'LEAVE': {
        finalMode = 'LEAVE';
        leaveInfo = {
          type: appliedException.leaveType || 'PLANNED',
          reason: appliedException.reason,
          status: appliedException.status || 'APPROVED',
        };

        // Conflict check: Leave scheduled on an expected in-office (WFO) day
        if (baseMode === 'WFO') {
          conflict = true;
          conflictType = conflictType || 'LEAVE_ON_WFO';
          conflictMessage = conflictMessage || 'Approved leave during a scheduled in-office attendance day.';
          requiresPlanning = true;
        }
        break;
      }

      case 'HOLIDAY': {
        finalMode = 'HOLIDAY';
        holidayInfo = {
          name: appliedException.holidayName || appliedException.reason || 'Public Holiday',
          source: appliedException.source || 'USER',
        };

        // Conflict check: Holiday occurs on a planned in-office (WFO) day
        if (baseMode === 'WFO') {
          conflict = true;
          conflictType = conflictType || 'HOLIDAY_ON_WFO';
          conflictMessage = conflictMessage || 'Public holiday occurs on scheduled in-office day. In-person goal may require schedule adjustment.';
          requiresPlanning = true;
        }
        break;
      }

      case 'TRAVEL': {
        finalMode = 'TRAVEL';
        overrideInfo = {
          type: 'TRAVEL',
          reason: appliedException.reason || 'Transit Corridor',
          source: appliedException.source || 'USER',
        };
        break;
      }

      case 'EXPLICIT_WFH_OVERRIDE': {
        finalMode = 'WFH';
        overrideInfo = {
          type: 'EXPLICIT_WFH_OVERRIDE',
          reason: appliedException.reason,
          source: appliedException.source || 'USER',
        };
        break;
      }

      case 'EXPLICIT_WFO_OVERRIDE': {
        finalMode = 'WFO';
        overrideInfo = {
          type: 'EXPLICIT_WFO_OVERRIDE',
          reason: appliedException.reason,
          source: appliedException.source || 'USER',
        };
        break;
      }

      case 'EXPLICIT_OFF_OVERRIDE': {
        finalMode = 'OFF';
        overrideInfo = {
          type: 'EXPLICIT_OFF_OVERRIDE',
          reason: appliedException.reason,
          source: appliedException.source || 'USER',
        };
        break;
      }

      case 'USER_OVERRIDE': {
        finalMode = appliedException.resolvedMode || 'WFH';
        overrideInfo = {
          type: 'USER_OVERRIDE',
          reason: appliedException.reason,
          source: appliedException.source || 'USER',
        };
        break;
      }

      default:
        finalMode = appliedException.resolvedMode || baseMode;
    }
  }

  const isWorkingDay = finalMode !== 'OFF' && finalMode !== 'HOLIDAY' && finalMode !== 'LEAVE';

  return {
    date: dateStr,
    dayOfWeek,
    baseMode,
    resolvedMode: finalMode,
    finalMode,
    isOverridden,
    appliedException,
    holiday: holidayInfo,
    leave: leaveInfo,
    override: overrideInfo,
    conflict,
    conflictType,
    conflictMessage,
    requiresPlanning,
    isWorkingDay,
    tripId: appliedException?.tripId,
    estimatedCost: appliedException?.estimatedCost,
    hasOvernightStay: appliedException?.hasOvernightStay,
    location: appliedException?.location || (finalMode === 'WFO' ? schedule.officeCity : schedule.homeCity),
  };
}

/**
 * Deterministically resolves an entire date range day-by-day.
 */
export function resolveDateRange(
  startDateInput: string | Date,
  endDateInput: string | Date,
  schedule: NormalSchedule,
  exceptions: ScheduleException[] = []
): ResolvedDaySchedule[] {
  const start = typeof startDateInput === 'string' ? new Date(`${startDateInput.substring(0, 10)}T00:00:00`) : new Date(startDateInput);
  const end = typeof endDateInput === 'string' ? new Date(`${endDateInput.substring(0, 10)}T00:00:00`) : new Date(endDateInput);

  if (start > end) {
    return [];
  }

  const result: ResolvedDaySchedule[] = [];
  const current = new Date(start);

  while (current <= end) {
    result.push(resolveWorkDay(new Date(current), schedule, exceptions));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Computes deterministic metrics over a resolved date range.
 */
export function calculateScheduleMetrics(
  days: ResolvedDaySchedule[]
): ScheduleMetrics {
  let wfoDays = 0;
  let wfhDays = 0;
  let offDays = 0;
  let flexibleDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let travelDays = 0;
  let conflictsCount = 0;
  let requiresPlanningCount = 0;

  for (const day of days) {
    if (day.conflict) conflictsCount++;
    if (day.requiresPlanning) requiresPlanningCount++;

    switch (day.resolvedMode) {
      case 'WFO':
        wfoDays++;
        break;
      case 'WFH':
        wfhDays++;
        break;
      case 'OFF':
        offDays++;
        break;
      case 'FLEXIBLE':
        flexibleDays++;
        break;
      case 'LEAVE':
        leaveDays++;
        break;
      case 'HOLIDAY':
        holidayDays++;
        break;
      case 'TRAVEL':
        travelDays++;
        break;
    }
  }

  const totalDays = days.length;
  const totalWorkingDays = wfoDays + wfhDays + flexibleDays + travelDays;
  const wfoPercentage = totalWorkingDays > 0 ? Math.round((wfoDays / totalWorkingDays) * 100) : 0;
  const wfhPercentage = totalWorkingDays > 0 ? Math.round((wfhDays / totalWorkingDays) * 100) : 0;

  return {
    totalDays,
    totalWorkingDays,
    wfoDays,
    wfhDays,
    offDays,
    flexibleDays,
    leaveDays,
    holidayDays,
    travelDays,
    wfoPercentage,
    wfhPercentage,
    conflictsCount,
    requiresPlanningCount,
  };
}
