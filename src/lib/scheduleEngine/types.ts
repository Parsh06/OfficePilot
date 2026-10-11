export type BaseWorkMode = 'WFO' | 'WFH' | 'OFF' | 'FLEXIBLE';

export type ResolvedWorkMode = 'WFO' | 'WFH' | 'OFF' | 'FLEXIBLE' | 'LEAVE' | 'HOLIDAY' | 'TRAVEL';

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type ExceptionType =
  | 'HOLIDAY'
  | 'LEAVE'
  | 'EXPLICIT_WFH_OVERRIDE'
  | 'EXPLICIT_WFO_OVERRIDE'
  | 'EXPLICIT_OFF_OVERRIDE'
  | 'USER_OVERRIDE'
  | 'TRAVEL';

export type LeaveCategory = 'CASUAL' | 'SICK' | 'PLANNED' | 'OTHER';

export type ExceptionSource = 'USER' | 'SYSTEM' | 'AI';

export interface NormalSchedule {
  userId: string;
  timezone: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD
  monday: BaseWorkMode;
  tuesday: BaseWorkMode;
  wednesday: BaseWorkMode;
  thursday: BaseWorkMode;
  friday: BaseWorkMode;
  saturday: BaseWorkMode;
  sunday: BaseWorkMode;
  homeCity?: string;
  officeCity?: string;
  wfoTargetDaysPerMonth?: number;
  standardWfoDays?: string[];
  batchingCadence?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleException {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: ExceptionType;
  resolvedMode?: ResolvedWorkMode;
  reason?: string;
  holidayName?: string;
  leaveType?: LeaveCategory;
  source?: ExceptionSource;
  status?: 'PENDING' | 'APPROVED' | 'CONFIRMED';
  tripId?: string;
  estimatedCost?: number;
  hasOvernightStay?: boolean;
  location?: string;
  version?: number;
  createdAt: string;
  updatedAt?: string;
}

export type ConflictType =
  | 'HOLIDAY_ON_WFO'
  | 'LEAVE_ON_WFO'
  | 'MULTIPLE_OVERRIDES'
  | 'TRAVEL_OVERLAP'
  | 'CUSTOM';

export interface ResolvedDaySchedule {
  date: string; // YYYY-MM-DD
  dayOfWeek: WeekDay;
  baseMode: BaseWorkMode;
  resolvedMode: ResolvedWorkMode;
  finalMode: ResolvedWorkMode;
  isOverridden: boolean;
  holiday?: {
    name: string;
    source: string;
  };
  leave?: {
    type: LeaveCategory | string;
    reason?: string;
    status: string;
  };
  override?: {
    type: ExceptionType;
    reason?: string;
    source: ExceptionSource;
  };
  appliedException?: ScheduleException;
  conflict: boolean;
  conflictType?: ConflictType;
  conflictMessage?: string;
  requiresPlanning: boolean;
  isWorkingDay: boolean;
  estimatedCost?: number;
  actualCost?: number;
  tripId?: string;
  hasOvernightStay?: boolean;
  location?: string;
  notes?: string;
}

export interface ScheduleMetrics {
  totalDays: number;
  totalWorkingDays: number;
  wfoDays: number;
  wfhDays: number;
  offDays: number;
  flexibleDays: number;
  leaveDays: number;
  holidayDays: number;
  travelDays: number;
  wfoPercentage: number;
  wfhPercentage: number;
  conflictsCount: number;
  requiresPlanningCount: number;
}
