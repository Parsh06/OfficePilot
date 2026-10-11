import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveWorkDay,
  resolveDateRange,
  calculateScheduleMetrics,
} from '@/lib/scheduleEngine';
import type { NormalSchedule, ScheduleException } from '@/lib/scheduleEngine';
import {
  getScheduleExceptions,
  saveScheduleException,
  deleteScheduleException,
  deleteExceptionsByDate,
} from '@/lib/firebase/services/scheduleExceptionService';

// Mock Firebase Firestore SDK
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(() => 'mock-collection-ref'),
    doc: vi.fn((_db, ...pathSegments) => ({
      path: pathSegments.join('/'),
      id: pathSegments[pathSegments.length - 1] || 'mock-auto-id',
    })),
    getDocs: vi.fn().mockImplementation(() => {
      const mockDocs = [
        {
          id: 'ex-001',
          data: () => ({
            userId: 'user-cal-1',
            date: '2026-10-13',
            type: 'HOLIDAY',
            holidayName: 'Dussehra',
            reason: 'Festival',
            source: 'USER',
            createdAt: '2026-10-01T00:00:00Z',
          }),
        },
        {
          id: 'ex-002',
          data: () => ({
            userId: 'user-cal-1',
            date: '2026-10-14',
            type: 'LEAVE',
            leaveType: 'CASUAL',
            reason: 'Personal errands',
            status: 'APPROVED',
            source: 'USER',
            createdAt: '2026-10-01T00:00:00Z',
          }),
        },
      ];
      return Promise.resolve({
        empty: false,
        size: mockDocs.length,
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      });
    }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  };
});

describe('Phase 5 - Calendar & Schedule Exception System', () => {
  const baseSchedule: NormalSchedule = {
    userId: 'user_dev_01',
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
    wfoTargetDaysPerMonth: 12,
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Normal Weekly Schedule Resolution', () => {
    it('resolves regular work week deterministically without exceptions', () => {
      // 2026-10-12 is Monday (WFH), 2026-10-13 is Tuesday (WFO), 2026-10-17 is Saturday (OFF)
      const mon = resolveWorkDay('2026-10-12', baseSchedule, []);
      expect(mon.baseMode).toBe('WFH');
      expect(mon.resolvedMode).toBe('WFH');
      expect(mon.isOverridden).toBe(false);
      expect(mon.conflict).toBe(false);
      expect(mon.requiresPlanning).toBe(false);
      expect(mon.isWorkingDay).toBe(true);

      const tue = resolveWorkDay('2026-10-13', baseSchedule, []);
      expect(tue.baseMode).toBe('WFO');
      expect(tue.resolvedMode).toBe('WFO');
      expect(tue.isOverridden).toBe(false);
      expect(tue.conflict).toBe(false);

      const sat = resolveWorkDay('2026-10-17', baseSchedule, []);
      expect(sat.baseMode).toBe('OFF');
      expect(sat.resolvedMode).toBe('OFF');
      expect(sat.isWorkingDay).toBe(false);
    });
  });

  describe('2. Holiday Handling & Conflict Detection', () => {
    it('resolves holiday on WFO day: sets resolvedMode to HOLIDAY and flags CONFLICT / REQUIRES PLANNING', () => {
      // Tuesday 2026-10-13 is normally WFO
      const holidayException: ScheduleException = {
        id: 'hol-1',
        userId: 'user_dev_01',
        date: '2026-10-13',
        type: 'HOLIDAY',
        holidayName: 'Dussehra',
        reason: 'National Holiday',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-13', baseSchedule, [holidayException]);
      expect(resolved.baseMode).toBe('WFO');
      expect(resolved.resolvedMode).toBe('HOLIDAY');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(false);
      expect(resolved.holiday?.name).toBe('Dussehra');
      expect(resolved.conflict).toBe(true);
      expect(resolved.conflictType).toBe('HOLIDAY_ON_WFO');
      expect(resolved.requiresPlanning).toBe(true);
      expect(resolved.conflictMessage).toContain('Public holiday occurs on scheduled in-office day');
    });

    it('resolves holiday on WFH day: sets resolvedMode to HOLIDAY without attendance conflict', () => {
      // Monday 2026-10-12 is normally WFH
      const holidayException: ScheduleException = {
        id: 'hol-2',
        userId: 'user_dev_01',
        date: '2026-10-12',
        type: 'HOLIDAY',
        holidayName: 'Regional Holiday',
        reason: 'State Foundation Day',
        source: 'SYSTEM',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-12', baseSchedule, [holidayException]);
      expect(resolved.baseMode).toBe('WFH');
      expect(resolved.resolvedMode).toBe('HOLIDAY');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(false);
      expect(resolved.holiday?.name).toBe('Regional Holiday');
      expect(resolved.conflict).toBe(false);
      expect(resolved.requiresPlanning).toBe(false);
    });
  });

  describe('3. Leave Handling & Conflict Detection', () => {
    it('resolves Leave on WFO day: sets resolvedMode to LEAVE and flags conflict', () => {
      // Wednesday 2026-10-14 is normally WFO
      const leaveException: ScheduleException = {
        id: 'leave-1',
        userId: 'user_dev_01',
        date: '2026-10-14',
        type: 'LEAVE',
        leaveType: 'CASUAL',
        reason: 'Personal appointment',
        status: 'APPROVED',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-14', baseSchedule, [leaveException]);
      expect(resolved.baseMode).toBe('WFO');
      expect(resolved.resolvedMode).toBe('LEAVE');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(false);
      expect(resolved.leave?.type).toBe('CASUAL');
      expect(resolved.leave?.status).toBe('APPROVED');
      expect(resolved.conflict).toBe(true);
      expect(resolved.conflictType).toBe('LEAVE_ON_WFO');
      expect(resolved.requiresPlanning).toBe(true);
    });

    it('resolves Leave on WFH day: sets resolvedMode to LEAVE without WFO conflict', () => {
      // Friday 2026-10-16 is normally WFH
      const leaveException: ScheduleException = {
        id: 'leave-2',
        userId: 'user_dev_01',
        date: '2026-10-16',
        type: 'LEAVE',
        leaveType: 'SICK',
        reason: 'Medical rest',
        status: 'APPROVED',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-16', baseSchedule, [leaveException]);
      expect(resolved.baseMode).toBe('WFH');
      expect(resolved.resolvedMode).toBe('LEAVE');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(false);
      expect(resolved.leave?.type).toBe('SICK');
      expect(resolved.conflict).toBe(false);
      expect(resolved.requiresPlanning).toBe(false);
    });
  });

  describe('4. Explicit Work Mode Overrides', () => {
    it('WFH override on normal WFO day resolves to WFH as a working day', () => {
      const override: ScheduleException = {
        id: 'ovr-1',
        userId: 'user_dev_01',
        date: '2026-10-15', // Thursday (Normally WFO)
        type: 'EXPLICIT_WFH_OVERRIDE',
        reason: 'Plumber visit',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-15', baseSchedule, [override]);
      expect(resolved.baseMode).toBe('WFO');
      expect(resolved.resolvedMode).toBe('WFH');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(true);
      expect(resolved.override?.type).toBe('EXPLICIT_WFH_OVERRIDE');
      expect(resolved.override?.reason).toBe('Plumber visit');
    });

    it('WFO override on normal WFH day resolves to WFO as a working day', () => {
      const override: ScheduleException = {
        id: 'ovr-2',
        userId: 'user_dev_01',
        date: '2026-10-12', // Monday (Normally WFH)
        type: 'EXPLICIT_WFO_OVERRIDE',
        reason: 'Client workshop at office',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-12', baseSchedule, [override]);
      expect(resolved.baseMode).toBe('WFH');
      expect(resolved.resolvedMode).toBe('WFO');
      expect(resolved.isOverridden).toBe(true);
      expect(resolved.isWorkingDay).toBe(true);
      expect(resolved.override?.type).toBe('EXPLICIT_WFO_OVERRIDE');
    });

    it('OFF override turns working day into OFF', () => {
      const override: ScheduleException = {
        id: 'ovr-3',
        userId: 'user_dev_01',
        date: '2026-10-16', // Friday
        type: 'EXPLICIT_OFF_OVERRIDE',
        reason: 'Off-site team retreat',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      };

      const resolved = resolveWorkDay('2026-10-16', baseSchedule, [override]);
      expect(resolved.resolvedMode).toBe('OFF');
      expect(resolved.isWorkingDay).toBe(false);
    });
  });

  describe('5. Precedence Rules & Multiple Overrides', () => {
    it('Leave takes precedence over Holiday and User Overrides', () => {
      const exceptions: ScheduleException[] = [
        {
          id: 'ex-wfo',
          userId: 'user_dev_01',
          date: '2026-10-13',
          type: 'EXPLICIT_WFO_OVERRIDE',
          source: 'USER',
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'ex-hol',
          userId: 'user_dev_01',
          date: '2026-10-13',
          type: 'HOLIDAY',
          holidayName: 'Gandhi Jayanti observed',
          source: 'SYSTEM',
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'ex-leave',
          userId: 'user_dev_01',
          date: '2026-10-13',
          type: 'LEAVE',
          leaveType: 'PLANNED',
          reason: 'Pre-booked vacation',
          status: 'APPROVED',
          source: 'USER',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ];

      const resolved = resolveWorkDay('2026-10-13', baseSchedule, exceptions);
      // LEAVE has top precedence (1 < 2 < 4)
      expect(resolved.resolvedMode).toBe('LEAVE');
      // Multiple exceptions flag a MULTIPLE_OVERRIDES conflict
      expect(resolved.conflict).toBe(true);
      expect(resolved.conflictType).toBe('MULTIPLE_OVERRIDES');
      expect(resolved.requiresPlanning).toBe(true);
    });

    it('Holiday takes precedence over explicit work mode overrides', () => {
      const exceptions: ScheduleException[] = [
        {
          id: 'ex-wfo',
          userId: 'user_dev_01',
          date: '2026-10-15',
          type: 'EXPLICIT_WFO_OVERRIDE',
          source: 'USER',
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'ex-hol',
          userId: 'user_dev_01',
          date: '2026-10-15',
          type: 'HOLIDAY',
          holidayName: 'State Holiday',
          source: 'USER',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ];

      const resolved = resolveWorkDay('2026-10-15', baseSchedule, exceptions);
      expect(resolved.resolvedMode).toBe('HOLIDAY');
      expect(resolved.conflict).toBe(true); // Multiple overrides
    });
  });

  describe('6. Date Range Resolution & Metrics Calculation', () => {
    it('resolves date ranges across full week and tallies metrics accurately', () => {
      const exceptions: ScheduleException[] = [
        {
          id: 'e-1',
          userId: 'user_dev_01',
          date: '2026-10-13', // Tuesday WFO -> Holiday
          type: 'HOLIDAY',
          holidayName: 'Dussehra',
          source: 'USER',
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'e-2',
          userId: 'user_dev_01',
          date: '2026-10-16', // Friday WFH -> WFO override
          type: 'EXPLICIT_WFO_OVERRIDE',
          source: 'USER',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ];

      const days = resolveDateRange('2026-10-12', '2026-10-18', baseSchedule, exceptions);
      expect(days.length).toBe(7);

      expect(days[0].resolvedMode).toBe('WFH'); // Mon
      expect(days[1].resolvedMode).toBe('HOLIDAY'); // Tue (Holiday)
      expect(days[1].conflict).toBe(true); // Holiday on normal WFO
      expect(days[2].resolvedMode).toBe('WFO'); // Wed
      expect(days[3].resolvedMode).toBe('WFO'); // Thu
      expect(days[4].resolvedMode).toBe('WFO'); // Fri (Overridden from WFH)
      expect(days[5].resolvedMode).toBe('OFF'); // Sat
      expect(days[6].resolvedMode).toBe('OFF'); // Sun

      const metrics = calculateScheduleMetrics(days);
      expect(metrics.totalDays).toBe(7);
      expect(metrics.totalWorkingDays).toBe(4); // Mon(WFH), Wed(WFO), Thu(WFO), Fri(WFO)
      expect(metrics.wfoDays).toBe(3);
      expect(metrics.wfhDays).toBe(1);
      expect(metrics.holidayDays).toBe(1);
      expect(metrics.offDays).toBe(2);
      expect(metrics.conflictsCount).toBe(1);
      expect(metrics.requiresPlanningCount).toBe(1);
      expect(metrics.wfoPercentage).toBe(75);
      expect(metrics.wfhPercentage).toBe(25);
    });
  });

  describe('7. Firestore scheduleExceptionService', () => {
    it('fetches schedule exceptions for user from Firestore subcollection', async () => {
      const exceptions = await getScheduleExceptions('user-cal-1');
      expect(exceptions.length).toBe(2);
      expect(exceptions[0].id).toBe('ex-001');
      expect(exceptions[0].type).toBe('HOLIDAY');
      expect(exceptions[1].id).toBe('ex-002');
      expect(exceptions[1].type).toBe('LEAVE');
    });

    it('saves a new schedule exception with generated ID and timestamps', async () => {
      const newException = await saveScheduleException('user-cal-1', {
        date: '2026-10-20',
        type: 'EXPLICIT_WFH_OVERRIDE',
        reason: 'Working remotely for doctor appointment',
        source: 'USER',
      });

      expect(newException.userId).toBe('user-cal-1');
      expect(newException.date).toBe('2026-10-20');
      expect(newException.type).toBe('EXPLICIT_WFH_OVERRIDE');
      expect(newException.id).toBeDefined();
    });

    it('deletes a schedule exception by id', async () => {
      await expect(deleteScheduleException('user-cal-1', 'ex-001')).resolves.not.toThrow();
    });

    it('deletes all exceptions for a given date', async () => {
      await expect(deleteExceptionsByDate('user-cal-1', '2026-10-13')).resolves.not.toThrow();
    });
  });
});
