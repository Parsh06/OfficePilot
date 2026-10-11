import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHealthStatus } from '@/server/services/healthService';
import { ensureDatabaseIndexes } from '@/server/db/indexes';
import {
  getUserProfileData,
  updateUserProfileData,
  updateUserPreferencesData,
} from '@/server/services/profileService';
import { getUserSchedule, getCalendarRange, setCalendarDayMode } from '@/server/services/scheduleService';
import {
  listUserTrips,
  createUserTrip,
  listUserExpenses,
  createUserExpense,
} from '@/server/services/tripExpenseService';
import {
  getUserAnalytics,
  getUserScenarios,
  runOptimizer,
  processAIMessage,
} from '@/server/services/auxiliaryServices';

describe('Backend Services & Repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getHealthStatus reports status, version, and database checks', async () => {
    const health = await getHealthStatus();
    expect(health.version).toBe('1.0.0');
    expect(['HEALTHY', 'DEGRADED', 'DOWN']).toContain(health.status);
    expect(health.databases).toBeDefined();
  });

  it('ensureDatabaseIndexes registers all specified MongoDB indexes', async () => {
    const mockCreatedIndexes: string[] = [];
    const mockDb: any = {
      collection: vi.fn().mockReturnValue({
        createIndex: vi.fn().mockImplementation((_spec, opts) => {
          mockCreatedIndexes.push(opts?.name || 'unnamed');
          return Promise.resolve(opts?.name || 'unnamed');
        }),
      }),
    };

    const result = await ensureDatabaseIndexes(mockDb);
    expect(result.created.length).toBeGreaterThanOrEqual(5);
    expect(result.errors.length).toBe(0);
  });

  it('profileService provides defaults and updates cleanly', async () => {
    const profile = await getUserProfileData('user_test_99');
    expect(profile.profile.uid).toBe('user_test_99');
    expect(profile.preferences.optimizationMode).toBe('BALANCED');

    const updateRes = await updateUserProfileData('user_test_99', { homeCity: 'Austin, TX' });
    expect(updateRes.updated).toBe(true);

    const prefRes = await updateUserPreferencesData('user_test_99', { optimizationMode: 'COST' });
    expect(prefRes.updated).toBe(true);
  });

  it('scheduleService handles schedule and calendar work day updates', async () => {
    const sched = await getUserSchedule('user_test_99');
    expect(sched.wfoTargetDaysPerMonth).toBe(8);

    const savedDay = await setCalendarDayMode('user_test_99', {
      date: '2026-10-15',
      mode: 'WFO',
      location: 'Seattle Campus',
    });
    expect(savedDay.date).toBe('2026-10-15');
    expect(savedDay.mode).toBe('WFO');

    const range = await getCalendarRange('user_test_99', '2026-10-01', '2026-10-31');
    expect(Array.isArray(range)).toBe(true);
  });

  it('tripExpenseService creates and queries scoped trips and expenses', async () => {
    const trip = await createUserTrip('user_test_99', {
      title: 'October Quarterly Planning',
      origin: 'San Francisco',
      destination: 'Seattle',
      officeLocation: 'HQ',
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      status: 'CONFIRMED',
      estimatedCost: 1150,
      segments: [],
      aiOptimizationScore: 92,
    });
    expect(trip.title).toBe('October Quarterly Planning');
    expect(trip.userId).toBe('user_test_99');

    const trips = await listUserTrips('user_test_99');
    expect(Array.isArray(trips)).toBe(true);

    const expense = await createUserExpense('user_test_99', {
      title: 'Airport Ride Lyft',
      category: 'COMMUTE',
      amount: 48.5,
      currency: 'USD',
      date: '2026-10-12',
      reimbursable: true,
      status: 'APPROVED',
    });
    expect(expense.amount).toBe(48.5);
    expect(expense.userId).toBe('user_test_99');

    const expensesRes = await listUserExpenses('user_test_99');
    expect(Array.isArray(expensesRes.expenses)).toBe(true);
  });

  it('auxiliaryServices processes analytics, scenarios, optimizer, and AI chat', async () => {
    const analytics = await getUserAnalytics('user_test_99');
    expect(analytics.monthlyBudget).toBe(3500);

    const scenarios = await getUserScenarios('user_test_99');
    expect(scenarios.length).toBeGreaterThan(0);

    const optimizer = await runOptimizer('user_test_99');
    expect(optimizer.optimizationScore).toBe(94);

    const aiResponse = await processAIMessage('user_test_99', undefined, 'Can I save money on my next Seattle trip?');
    expect(aiResponse.conversationId).toBeDefined();
    expect(aiResponse.message.role).toBe('assistant');
  });
});
