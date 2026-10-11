import { create } from 'zustand';
import type {
  NormalSchedule,
  ScheduleException,
  ResolvedDaySchedule,
  ScheduleMetrics,
} from '@/lib/scheduleEngine';
import {
  createDefaultSchedule,
  resolveWorkDay,
  resolveDateRange,
  calculateScheduleMetrics,
  formatDate,
} from '@/lib/scheduleEngine';
import {
  getWorkSchedule,
  saveWorkSchedule,
} from '@/lib/firebase/services/workScheduleService';
import {
  getScheduleExceptions,
  saveScheduleException,
  deleteScheduleException,
  deleteExceptionsByDate,
} from '@/lib/firebase/services/scheduleExceptionService';

interface ScheduleState {
  userId: string;
  normalSchedule: NormalSchedule;
  exceptions: ScheduleException[];
  selectedDate: string;
  viewMode: 'month' | 'week' | 'day';
  currentMonth: Date;
  isLoading: boolean;

  // Actions
  setUserId: (userId: string) => void;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  setCurrentMonth: (date: Date) => void;

  // Schedule & Exceptions
  fetchUserScheduleData: (userId: string) => Promise<void>;
  updateNormalSchedule: (schedule: Partial<NormalSchedule>) => Promise<void>;
  addOrUpdateException: (
    exception: Omit<ScheduleException, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & { id?: string }
  ) => Promise<ScheduleException>;
  removeExceptionById: (exceptionId: string) => Promise<void>;
  resetDayToNormal: (date: string) => Promise<void>;

  // Engine queries
  getResolvedDay: (date: string) => ResolvedDaySchedule;
  getResolvedRange: (startDate: string, endDate: string) => ResolvedDaySchedule[];
  getMonthlyMetrics: (year: number, month: number) => ScheduleMetrics;

  // Legacy store compatibility
  schedules: import('@/types').DaySchedule[];
  setDayMode: (date: string, mode: import('@/lib/scheduleEngine').BaseWorkMode, notes?: string, location?: string) => void;
  batchSetDays: (
    daysOrDates: { date: string; mode: import('@/lib/scheduleEngine').BaseWorkMode; notes?: string }[] | string[],
    mode?: import('@/lib/scheduleEngine').BaseWorkMode
  ) => void;
  getDaySchedule: (date: string) => { mode: import('@/lib/scheduleEngine').ResolvedWorkMode; notes?: string; location?: string } | undefined;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  userId: 'demo-traveler-uid-001',
  normalSchedule: createDefaultSchedule('demo-traveler-uid-001'),
  exceptions: [
    {
      id: 'ex_default_01',
      userId: 'demo-traveler-uid-001',
      date: '2026-10-13',
      type: 'HOLIDAY',
      resolvedMode: 'HOLIDAY',
      holidayName: 'Company Observance Day',
      source: 'SYSTEM',
      createdAt: '2026-01-01',
    },
    {
      id: 'ex_default_02',
      userId: 'demo-traveler-uid-001',
      date: '2026-10-23',
      type: 'LEAVE',
      resolvedMode: 'LEAVE',
      leaveType: 'CASUAL',
      reason: 'Personal Family Function',
      source: 'USER',
      status: 'APPROVED',
      createdAt: '2026-01-01',
    },
    {
      id: 'ex_default_03',
      userId: 'demo-traveler-uid-001',
      date: '2026-10-15',
      type: 'TRAVEL',
      resolvedMode: 'TRAVEL',
      reason: 'Outbound SFO $\\rightarrow$ SEA Flight',
      source: 'USER',
      estimatedCost: 4500,
      hasOvernightStay: true,
      tripId: 'trip_sea_01',
      createdAt: '2026-01-01',
    },
  ],
  selectedDate: formatDate(new Date()),
  viewMode: 'month',
  currentMonth: new Date(),
  isLoading: false,

  setUserId: (userId) => set({ userId }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentMonth: (date) => set({ currentMonth: date }),

  fetchUserScheduleData: async (userId: string) => {
    if (!userId) return;
    set({ isLoading: true, userId });
    try {
      const [scheduleDoc, exceptionsList] = await Promise.all([
        getWorkSchedule(userId),
        getScheduleExceptions(userId),
      ]);

      const mergedSchedule: NormalSchedule = {
        userId,
        timezone: scheduleDoc.timezone || 'Asia/Kolkata',
        effectiveFrom: scheduleDoc.effectiveFrom || '2026-01-01',
        monday: scheduleDoc.monday || 'WFH',
        tuesday: scheduleDoc.tuesday || 'WFO',
        wednesday: scheduleDoc.wednesday || 'WFO',
        thursday: scheduleDoc.thursday || 'WFO',
        friday: scheduleDoc.friday || 'WFH',
        saturday: scheduleDoc.saturday || 'OFF',
        sunday: scheduleDoc.sunday || 'OFF',
        homeCity: scheduleDoc.homeCity || 'Bengaluru',
        officeCity: scheduleDoc.officeCity || 'Mumbai HQ',
        wfoTargetDaysPerMonth: scheduleDoc.wfoTargetDaysPerMonth || 8,
        version: scheduleDoc.version || 1,
        createdAt: scheduleDoc.createdAt || new Date().toISOString(),
        updatedAt: scheduleDoc.updatedAt || new Date().toISOString(),
      };

      set({
        normalSchedule: mergedSchedule,
        exceptions: exceptionsList.length > 0 ? exceptionsList : get().exceptions,
        isLoading: false,
      });
    } catch (err) {
      console.warn('[scheduleStore] Failed to fetch remote schedule:', err);
      set({ isLoading: false });
    }
  },

  updateNormalSchedule: async (data: Partial<NormalSchedule>) => {
    const { userId, normalSchedule } = get();
    const updated: NormalSchedule = {
      ...normalSchedule,
      ...data,
      userId,
      updatedAt: new Date().toISOString(),
    };
    set({ normalSchedule: updated });
    await saveWorkSchedule(userId, updated);
  },

  addOrUpdateException: async (exceptionData) => {
    const { userId, exceptions } = get();
    const saved = await saveScheduleException(userId, {
      ...exceptionData,
      userId,
    });

    const filtered = exceptions.filter((e) => e.id !== saved.id && e.date !== saved.date);
    set({ exceptions: [...filtered, saved] });
    return saved;
  },

  removeExceptionById: async (exceptionId: string) => {
    const { userId, exceptions } = get();
    await deleteScheduleException(userId, exceptionId);
    set({ exceptions: exceptions.filter((e) => e.id !== exceptionId) });
  },

  resetDayToNormal: async (date: string) => {
    const { userId, exceptions } = get();
    await deleteExceptionsByDate(userId, date);
    set({ exceptions: exceptions.filter((e) => e.date !== date) });
  },

  getResolvedDay: (date: string) => {
    const { normalSchedule, exceptions } = get();
    return resolveWorkDay(date, normalSchedule, exceptions);
  },

  getResolvedRange: (startDate: string, endDate: string) => {
    const { normalSchedule, exceptions } = get();
    return resolveDateRange(startDate, endDate, normalSchedule, exceptions);
  },

  getMonthlyMetrics: (year: number, month: number) => {
    const { normalSchedule, exceptions } = get();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = resolveDateRange(formatDate(firstDay), formatDate(lastDay), normalSchedule, exceptions);
    return calculateScheduleMetrics(days);
  },

  schedules: [
    { id: '1', date: '2026-10-12', mode: 'WFH', location: 'Home Office' },
    { id: '2', date: '2026-10-13', mode: 'WFO', location: 'Seattle HQ' },
    { id: '3', date: '2026-10-14', mode: 'WFO', location: 'Seattle HQ' },
    { id: '4', date: '2026-10-15', mode: 'WFO', location: 'Seattle HQ' },
    { id: '5', date: '2026-10-16', mode: 'WFH', location: 'Home Office' },
  ],

  setDayMode: (date, mode, notes, location) => {
    const { exceptions } = get();
    const type = mode === 'WFO' ? 'EXPLICIT_WFO_OVERRIDE' : mode === 'WFH' ? 'EXPLICIT_WFH_OVERRIDE' : 'EXPLICIT_OFF_OVERRIDE';
    const newEx: ScheduleException = {
      id: `local_ovr_${Date.now()}`,
      userId: get().userId,
      date,
      type,
      resolvedMode: mode,
      reason: notes,
      location,
      createdAt: new Date().toISOString(),
    };
    const filtered = exceptions.filter((e) => e.date !== date);
    set({ exceptions: [...filtered, newEx] });
  },

  batchSetDays: (daysOrDates, maybeMode) => {
    const { exceptions } = get();
    const newExceptions = [...exceptions];
    let normalizedDays: { date: string; mode: import('@/lib/scheduleEngine').BaseWorkMode; notes?: string }[] = [];
    if (Array.isArray(daysOrDates) && typeof daysOrDates[0] === 'string') {
      const mode = (maybeMode || 'WFO') as import('@/lib/scheduleEngine').BaseWorkMode;
      normalizedDays = (daysOrDates as string[]).map((d) => ({ date: d, mode }));
    } else {
      normalizedDays = (daysOrDates as { date: string; mode: import('@/lib/scheduleEngine').BaseWorkMode; notes?: string }[]) || [];
    }

    normalizedDays.forEach((d) => {
      const type = d.mode === 'WFO' ? 'EXPLICIT_WFO_OVERRIDE' : d.mode === 'WFH' ? 'EXPLICIT_WFH_OVERRIDE' : 'EXPLICIT_OFF_OVERRIDE';
      const existingIdx = newExceptions.findIndex((e) => e.date === d.date);
      const ex: ScheduleException = {
        id: `local_ovr_${Date.now()}_${d.date}`,
        userId: get().userId,
        date: d.date,
        type,
        resolvedMode: d.mode,
        reason: d.notes,
        createdAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        newExceptions[existingIdx] = ex;
      } else {
        newExceptions.push(ex);
      }
    });
    set({ exceptions: newExceptions });
  },

  getDaySchedule: (date) => {
    const resolved = get().getResolvedDay(date);
    return {
      mode: resolved.resolvedMode,
      notes: resolved.appliedException?.reason,
      location: resolved.location,
    };
  },
}));
