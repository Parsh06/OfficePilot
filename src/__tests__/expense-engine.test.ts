import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateExpenseVariance,
  validateExpenseAmount,
  createDefaultExpenseTemplates,
  generatePlannedExpensesForTrip,
  calculateExpenseSummary,
} from '@/lib/expenseEngine';
import type {
  ExpenseRecord,
  ExpenseTemplate,
} from '@/lib/expenseEngine';
import type { TripBlock } from '@/lib/travelEngine';

vi.mock('@/lib/firebase/services/expenseService', () => ({
  getExpenses: vi.fn().mockResolvedValue([]),
  saveExpense: vi.fn().mockResolvedValue(undefined),
  batchSaveExpenses: vi.fn().mockResolvedValue(undefined),
  deleteExpense: vi.fn().mockResolvedValue(undefined),
  getExpenseTemplates: vi.fn().mockResolvedValue([]),
  saveExpenseTemplate: vi.fn().mockImplementation((_userId, t) => Promise.resolve({ ...t, id: t.id || 'tmpl_saved' })),
}));

import { useExpenseStore } from '@/stores/expenseStore';

describe('Expense Engine - Planned vs Actual & Variance', () => {
  it('returns 0 variance when actual amount is undefined', () => {
    expect(calculateExpenseVariance(100, undefined)).toBe(0);
  });

  it('calculates negative variance as cost savings when actual is less than planned', () => {
    // Example: Breakfast Planned ₹100, Actual ₹72 => Variance -₹28
    const variance = calculateExpenseVariance(100, 72);
    expect(variance).toBe(-28);
  });

  it('calculates positive variance when actual exceeds planned amount', () => {
    // Example: Lunch Planned ₹180, Actual ₹220 => Variance +₹40
    const variance = calculateExpenseVariance(180, 220);
    expect(variance).toBe(40);
  });

  it('calculates 0 variance when actual exactly matches planned', () => {
    expect(calculateExpenseVariance(850, 850)).toBe(0);
  });
});

describe('Expense Amount Validation', () => {
  it('rejects negative amounts', () => {
    expect(validateExpenseAmount(-50)).toBe(false);
    expect(validateExpenseAmount(-0.01)).toBe(false);
  });

  it('rejects non-numeric NaN values', () => {
    expect(validateExpenseAmount(NaN)).toBe(false);
  });

  it('accepts valid zero and positive numbers', () => {
    expect(validateExpenseAmount(0)).toBe(true);
    expect(validateExpenseAmount(150.5)).toBe(true);
  });
});

describe('Expense Templates', () => {
  it('creates default templates for a user', () => {
    const templates = createDefaultExpenseTemplates('user-123');
    expect(templates.length).toBeGreaterThanOrEqual(5);

    const breakfast = templates.find((t) => t.subcategory === 'breakfast');
    expect(breakfast).toBeDefined();
    expect(breakfast?.category).toBe('FOOD');
    expect(breakfast?.defaultAmount).toBe(120);

    const lunch = templates.find((t) => t.subcategory === 'lunch');
    expect(lunch).toBeDefined();
    expect(lunch?.defaultAmount).toBe(180);

    const dinner = templates.find((t) => t.subcategory === 'dinner');
    expect(dinner).toBeDefined();
    expect(dinner?.defaultAmount).toBe(280);
  });
});

describe('Planned Expense Generation from TripBlock', () => {
  const mockTrip: any = {
    id: 'trip_pune_sprint',
    userId: 'user-test-1',
    profileId: 'prof_mumbai_pune',
    startDate: '2026-10-13', // Tuesday
    endDate: '2026-10-15',   // Thursday (3 days: Oct 13, 14, 15)
    origin: 'Mumbai',
    destination: 'Pune',
    title: 'Pune Office Trip',
    workDays: ['2026-10-13', '2026-10-14', '2026-10-15'],
    outboundSegments: [
      { id: 'seg_rapido_out', mode: 'rapido', label: 'Home to Station', origin: 'Home', destination: 'Station', estimatedCost: 120, estimatedDuration: 20, sequence: 1, direction: 'OUTBOUND', active: true },
      { id: 'seg_train_out', mode: 'train', label: 'Vande Bharat', origin: 'Mumbai', destination: 'Pune', estimatedCost: 850, estimatedDuration: 180, sequence: 2, direction: 'OUTBOUND', active: true },
      { id: 'seg_metro_out', mode: 'metro', label: 'Metro to Office', origin: 'Pune Station', destination: 'Office', estimatedCost: 40, estimatedDuration: 25, sequence: 3, direction: 'OUTBOUND', active: true },
    ],
    returnSegments: [
      { id: 'seg_metro_ret', mode: 'metro', label: 'Metro from Office', origin: 'Office', destination: 'Pune Station', estimatedCost: 40, estimatedDuration: 25, sequence: 1, direction: 'RETURN', active: true },
      { id: 'seg_train_ret', mode: 'train', label: 'Return Express', origin: 'Pune', destination: 'Mumbai', estimatedCost: 850, estimatedDuration: 180, sequence: 2, direction: 'RETURN', active: true },
      { id: 'seg_rapido_ret', mode: 'rapido', label: 'Station to Home', origin: 'Station', destination: 'Home', estimatedCost: 120, estimatedDuration: 20, sequence: 3, direction: 'RETURN', active: true },
    ],
    accommodationNights: [
      { date: '2026-10-13', accommodationType: 'HOTEL', estimatedCost: 2500, label: 'Pune Tech Stay' },
      { date: '2026-10-14', accommodationType: 'HOTEL', estimatedCost: 2500, label: 'Pune Tech Stay' },
    ],
    totalDurationNights: 2,
    nightsCount: 2,
    totalCost: 7500,
    currency: 'INR',
    status: 'PLANNED',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const templates: ExpenseTemplate[] = [
    { id: 't1', userId: 'user-test-1', name: 'Breakfast', category: 'FOOD', subcategory: 'breakfast', defaultAmount: 100, isPerDiem: true, appliesToDays: ['TUESDAY', 'WEDNESDAY', 'THURSDAY'] },
    { id: 't2', userId: 'user-test-1', name: 'Lunch', category: 'FOOD', subcategory: 'lunch', defaultAmount: 140, isPerDiem: true, appliesToDays: ['TUESDAY', 'WEDNESDAY', 'THURSDAY'] },
    { id: 't3', userId: 'user-test-1', name: 'Snacks', category: 'FOOD', subcategory: 'snacks', defaultAmount: 100, isPerDiem: true, appliesToDays: ['TUESDAY', 'WEDNESDAY', 'THURSDAY'] },
    { id: 't4', userId: 'user-test-1', name: 'Dinner', category: 'FOOD', subcategory: 'dinner', defaultAmount: 250, isPerDiem: true, appliesToDays: ['TUESDAY', 'WEDNESDAY', 'THURSDAY'] },
    { id: 't5', userId: 'user-test-1', name: 'Misc Per Diem', category: 'MISCELLANEOUS', subcategory: 'other', defaultAmount: 100, isPerDiem: true, appliesToDays: ['TUESDAY', 'WEDNESDAY', 'THURSDAY'] },
  ];

  it('generates planned expenses for outbound, stay, food templates, and return segments', () => {
    const generated = generatePlannedExpensesForTrip(mockTrip as TripBlock, templates, []);
    expect(generated.length).toBeGreaterThan(0);

    // Check Outbound Day (Tuesday, 2026-10-13)
    const tuesdayExpenses = generated.filter((e) => e.date === '2026-10-13');
    // Rapido, Train, Metro (3) + Breakfast, Lunch, Snacks, Dinner, Misc (5) + Hotel (1) = 9
    expect(tuesdayExpenses.length).toBe(9);

    const rapido = tuesdayExpenses.find((e) => e.subcategory === 'rapido');
    expect(rapido).toBeDefined();
    expect(rapido?.plannedAmount).toBe(120);
    expect(rapido?.actualAmount).toBeUndefined();
    expect(rapido?.status).toBe('PLANNED');
    expect(rapido?.source).toBe('generated');

    // Check Middle Day (Wednesday, 2026-10-14)
    const wednesdayExpenses = generated.filter((e) => e.date === '2026-10-14');
    // Food (5) + Hotel (1) = 6
    expect(wednesdayExpenses.length).toBe(6);

    // Check Return Day (Thursday, 2026-10-15)
    const thursdayExpenses = generated.filter((e) => e.date === '2026-10-15');
    // Food (5) + Metro, Train, Rapido (3) = 8
    expect(thursdayExpenses.length).toBe(8);

    // Total should be 9 + 6 + 8 = 23
    expect(generated.length).toBe(23);
  });

  it('ensures idempotency and duplicate prevention via generationKey', () => {
    const firstRun = generatePlannedExpensesForTrip(mockTrip as TripBlock, templates, []);
    expect(firstRun.length).toBe(23);

    // Running again with existing generated expenses passed in
    const secondRun = generatePlannedExpensesForTrip(mockTrip as TripBlock, templates, firstRun);
    expect(secondRun.length).toBe(0); // All 23 skipped due to generationKey matching
  });

  it('generates only missing items if some expenses were already logged', () => {
    // Pre-populate only the outbound Rapido expense
    const existingRapido: ExpenseRecord = {
      id: 'existing_exp_1',
      userId: 'user-test-1',
      tripId: mockTrip.id,
      date: '2026-10-13',
      title: 'Rapido Outbound',
      category: 'TRAVEL',
      subcategory: 'rapido',
      plannedAmount: 120,
      actualAmount: 110,
      variance: -10,
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      generationKey: `gen_${mockTrip.id}_2026-10-13_TRAVEL_rapido_seg_rapido_out`,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    const partialRun = generatePlannedExpensesForTrip(mockTrip as TripBlock, templates, [existingRapido]);
    expect(partialRun.length).toBe(22); // 23 - 1 = 22
    expect(partialRun.find((e) => e.generationKey === existingRapido.generationKey)).toBeUndefined();
  });
});

describe('Expense Summary Metrics', () => {
  const sampleExpenses: ExpenseRecord[] = [
    {
      id: '1',
      userId: 'u1',
      date: '2026-10-13',
      title: 'Train',
      category: 'TRAVEL',
      subcategory: 'train',
      plannedAmount: 850,
      actualAmount: 850,
      variance: 0,
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'generated',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '2',
      userId: 'u1',
      date: '2026-10-13',
      title: 'Breakfast',
      category: 'FOOD',
      subcategory: 'breakfast',
      plannedAmount: 100,
      actualAmount: 72,
      variance: -28, // saved ₹28
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '3',
      userId: 'u1',
      date: '2026-10-14',
      title: 'Lunch',
      category: 'FOOD',
      subcategory: 'lunch',
      plannedAmount: 180,
      actualAmount: 220,
      variance: 40, // overrun ₹40
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '4',
      userId: 'u1',
      date: '2026-10-15',
      title: 'Dinner (Pending actual)',
      category: 'FOOD',
      subcategory: 'dinner',
      plannedAmount: 250,
      actualAmount: undefined,
      variance: 0,
      currency: 'INR',
      status: 'PLANNED',
      source: 'generated',
      reimbursable: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  it('aggregates total planned, total actual, and net variance', () => {
    const summary = calculateExpenseSummary(sampleExpenses);
    // Total planned: 850 + 100 + 180 + 250 = 1380
    expect(summary.totalPlanned).toBe(1380);

    // Total actual: 850 + 72 + 220 = 1142
    expect(summary.totalActual).toBe(1142);

    // Net variance for confirmed items: 0 + (-28) + (+40) = +12
    expect(summary.totalVariance).toBe(12);

    // Counts
    expect(summary.plannedCount).toBe(1);
    expect(summary.confirmedCount).toBe(3);

    // Category breakdown
    expect(summary.categoryBreakdown.TRAVEL.planned).toBe(850);
    expect(summary.categoryBreakdown.TRAVEL.actual).toBe(850);
    expect(summary.categoryBreakdown.FOOD.planned).toBe(100 + 180 + 250); // 530
    expect(summary.categoryBreakdown.FOOD.actual).toBe(72 + 220); // 292
  });
});

describe('useExpenseStore State Operations', () => {
  beforeEach(() => {
    useExpenseStore.setState({
      expenses: [],
      selectedExpenseId: null,
    });
  });

  it('adds an expense and calculates variance automatically', () => {
    const store = useExpenseStore.getState();
    const created = store.addExpense({
      title: 'Client Dinner',
      date: '2026-10-13',
      category: 'FOOD',
      subcategory: 'dinner',
      plannedAmount: 500,
      actualAmount: 420,
    });

    expect(created.id).toBeDefined();
    expect(created.variance).toBe(-80); // Saved ₹80
    expect(created.status).toBe('CONFIRMED');

    const expenses = useExpenseStore.getState().expenses;
    expect(expenses.length).toBe(1);
  });

  it('marks actual amount and updates variance without losing planned historical value', async () => {
    const store = useExpenseStore.getState();
    const created = store.addExpense({
      title: 'Metro Ticket',
      date: '2026-10-13',
      category: 'TRAVEL',
      subcategory: 'metro',
      plannedAmount: 50,
      status: 'PLANNED',
    });

    expect(created.plannedAmount).toBe(50);
    expect(created.actualAmount).toBeUndefined();

    // Now mark actual
    await store.markActual(created.id, 40, 'UPI');

    const updated = useExpenseStore.getState().getExpenseById(created.id);
    expect(updated).toBeDefined();
    expect(updated?.plannedAmount).toBe(50); // Historical value preserved
    expect(updated?.actualAmount).toBe(40);
    expect(updated?.variance).toBe(-10); // Saved ₹10
    expect(updated?.status).toBe('CONFIRMED');
    expect(updated?.paymentMethod).toBe('UPI');
  });

  it('deletes an expense and cleans up selectedExpenseId', async () => {
    const store = useExpenseStore.getState();
    const created = store.addExpense({
      title: 'To Delete',
      date: '2026-10-13',
      category: 'MISCELLANEOUS',
      plannedAmount: 100,
    });

    store.setSelectedExpenseId(created.id);
    expect(useExpenseStore.getState().selectedExpenseId).toBe(created.id);

    await store.deleteExpense(created.id);
    expect(useExpenseStore.getState().expenses.length).toBe(0);
    expect(useExpenseStore.getState().selectedExpenseId).toBeNull();
  });
});
