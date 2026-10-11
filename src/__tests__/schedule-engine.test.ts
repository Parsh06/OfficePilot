import { describe, it, expect } from 'vitest';
import {
  getDayOfWeek,
  resolveBaseWorkMode,
  resolveWorkDay,
  resolveDateRange,
  calculateScheduleMetrics,
  createDefaultSchedule,
} from '@/lib/scheduleEngine';
import type { NormalSchedule, ScheduleException } from '@/lib/scheduleEngine';

describe('Deterministic Schedule Engine', () => {
  const hybridSchedule: NormalSchedule = {
    userId: 'user_101',
    timezone: 'Asia/Kolkata',
    effectiveFrom: '2026-01-01',
    monday: 'WFH',
    tuesday: 'WFO',
    wednesday: 'WFO',
    thursday: 'WFO',
    friday: 'WFH',
    saturday: 'OFF',
    sunday: 'OFF',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('correctly extracts weekday for dates', () => {
    expect(getDayOfWeek('2026-10-12')).toBe('monday');
    expect(getDayOfWeek('2026-10-13')).toBe('tuesday');
    expect(getDayOfWeek('2026-10-14')).toBe('wednesday');
    expect(getDayOfWeek('2026-10-15')).toBe('thursday');
    expect(getDayOfWeek('2026-10-16')).toBe('friday');
    expect(getDayOfWeek('2026-10-17')).toBe('saturday');
    expect(getDayOfWeek('2026-10-18')).toBe('sunday');
  });

  describe('resolveBaseWorkMode', () => {
    it('resolves each weekday according to user normal schedule', () => {
      expect(resolveBaseWorkMode('2026-10-12', hybridSchedule)).toBe('WFH'); // Mon
      expect(resolveBaseWorkMode('2026-10-13', hybridSchedule)).toBe('WFO'); // Tue
      expect(resolveBaseWorkMode('2026-10-14', hybridSchedule)).toBe('WFO'); // Wed
      expect(resolveBaseWorkMode('2026-10-15', hybridSchedule)).toBe('WFO'); // Thu
      expect(resolveBaseWorkMode('2026-10-16', hybridSchedule)).toBe('WFH'); // Fri
      expect(resolveBaseWorkMode('2026-10-17', hybridSchedule)).toBe('OFF'); // Sat
      expect(resolveBaseWorkMode('2026-10-18', hybridSchedule)).toBe('OFF'); // Sun
    });

    it('works for all-WFH pattern', () => {
      const allWfh: NormalSchedule = {
        ...hybridSchedule,
        monday: 'WFH',
        tuesday: 'WFH',
        wednesday: 'WFH',
        thursday: 'WFH',
        friday: 'WFH',
        saturday: 'OFF',
        sunday: 'OFF',
      };
      expect(resolveBaseWorkMode('2026-10-13', allWfh)).toBe('WFH');
      expect(resolveBaseWorkMode('2026-10-14', allWfh)).toBe('WFH');
    });

    it('works for all-WFO pattern', () => {
      const allWfo: NormalSchedule = {
        ...hybridSchedule,
        monday: 'WFO',
        tuesday: 'WFO',
        wednesday: 'WFO',
        thursday: 'WFO',
        friday: 'WFO',
        saturday: 'WFO',
        sunday: 'OFF',
      };
      expect(resolveBaseWorkMode('2026-10-12', allWfo)).toBe('WFO');
      expect(resolveBaseWorkMode('2026-10-17', allWfo)).toBe('WFO');
    });

    it('works for flexible day pattern', () => {
      const flexSchedule: NormalSchedule = {
        ...hybridSchedule,
        monday: 'FLEXIBLE',
        friday: 'FLEXIBLE',
      };
      expect(resolveBaseWorkMode('2026-10-12', flexSchedule)).toBe('FLEXIBLE');
      expect(resolveBaseWorkMode('2026-10-16', flexSchedule)).toBe('FLEXIBLE');
    });
  });

  describe('Exception Precedence & Hierarchy', () => {
    it('holiday overrides normal WFO/WFH to HOLIDAY and marks non-working day', () => {
      const holidayException: ScheduleException = {
        id: 'ex_1',
        userId: 'user_101',
        date: '2026-10-13', // Tuesday (Normally WFO)
        type: 'HOLIDAY',
        resolvedMode: 'HOLIDAY',
        reason: 'Diwali',
        createdAt: '2026-01-01',
      };

      const resolved = resolveWorkDay('2026-10-13', hybridSchedule, [holidayException]);
      expect(resolved.baseMode).toBe('WFO');
      expect(resolved.finalMode).toBe('HOLIDAY');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(false);
    });

    it('leave overrides normal work day to LEAVE and marks non-working day', () => {
      const leaveException: ScheduleException = {
        id: 'ex_2',
        userId: 'user_101',
        date: '2026-10-14', // Wednesday (Normally WFO)
        type: 'LEAVE',
        resolvedMode: 'LEAVE',
        reason: 'Annual Leave',
        createdAt: '2026-01-01',
      };

      const resolved = resolveWorkDay('2026-10-14', hybridSchedule, [leaveException]);
      expect(resolved.baseMode).toBe('WFO');
      expect(resolved.finalMode).toBe('LEAVE');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(false);
    });

    it('explicit WFH override turns a normal WFO day into WFH', () => {
      const wfhException: ScheduleException = {
        id: 'ex_3',
        userId: 'user_101',
        date: '2026-10-15', // Thursday (Normally WFO)
        type: 'EXPLICIT_WFH_OVERRIDE',
        resolvedMode: 'WFH',
        createdAt: '2026-01-01',
      };

      const resolved = resolveWorkDay('2026-10-15', hybridSchedule, [wfhException]);
      expect(resolved.baseMode).toBe('WFO');
      expect(resolved.finalMode).toBe('WFH');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(true);
    });

    it('explicit WFO override turns a normal WFH day into WFO', () => {
      const wfoException: ScheduleException = {
        id: 'ex_4',
        userId: 'user_101',
        date: '2026-10-12', // Monday (Normally WFH)
        type: 'EXPLICIT_WFO_OVERRIDE',
        resolvedMode: 'WFO',
        createdAt: '2026-01-01',
      };

      const resolved = resolveWorkDay('2026-10-12', hybridSchedule, [wfoException]);
      expect(resolved.baseMode).toBe('WFH');
      expect(resolved.finalMode).toBe('WFO');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(true);
    });

    it('travel exception marks day in transit with associated tripId', () => {
      const travelException: ScheduleException = {
        id: 'ex_5',
        userId: 'user_101',
        date: '2026-10-12',
        type: 'TRAVEL',
        resolvedMode: 'TRAVEL',
        tripId: 'trip_sea_01',
        createdAt: '2026-01-01',
      };

      const resolved = resolveWorkDay('2026-10-12', hybridSchedule, [travelException]);
      expect(resolved.finalMode).toBe('TRAVEL');
      expect(resolved.tripId).toBe('trip_sea_01');
      expect(resolved.isWorkingDay).toBe(true);
    });
  });

  describe('resolveDateRange & calculateScheduleMetrics', () => {
    it('resolves an entire full week deterministically', () => {
      const days = resolveDateRange('2026-10-12', '2026-10-18', hybridSchedule);
      expect(days.length).toBe(7);
      expect(days[0].date).toBe('2026-10-12');
      expect(days[0].finalMode).toBe('WFH');
      expect(days[1].finalMode).toBe('WFO');
      expect(days[2].finalMode).toBe('WFO');
      expect(days[3].finalMode).toBe('WFO');
      expect(days[4].finalMode).toBe('WFH');
      expect(days[5].finalMode).toBe('OFF');
      expect(days[6].finalMode).toBe('OFF');

      const metrics = calculateScheduleMetrics(days);
      expect(metrics.totalDays).toBe(7);
      expect(metrics.totalWorkingDays).toBe(5);
      expect(metrics.wfoDays).toBe(3);
      expect(metrics.wfhDays).toBe(2);
      expect(metrics.offDays).toBe(2);
      expect(metrics.wfoPercentage).toBe(60);
      expect(metrics.wfhPercentage).toBe(40);
    });

    it('returns empty array when startDate is after endDate', () => {
      const days = resolveDateRange('2026-10-20', '2026-10-10', hybridSchedule);
      expect(days).toEqual([]);
    });

    it('createDefaultSchedule sets up initial schedule defaults properly', () => {
      const def = createDefaultSchedule('user_202', { homeCity: 'Delhi' });
      expect(def.userId).toBe('user_202');
      expect(def.timezone).toBe('Asia/Kolkata');
      expect(def.monday).toBe('WFH');
      expect(def.tuesday).toBe('WFO');
      expect(def.saturday).toBe('OFF');
      expect(def.sunday).toBe('OFF');
    });
  });
});
