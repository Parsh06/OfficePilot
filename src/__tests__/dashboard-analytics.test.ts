import { describe, it, expect } from 'vitest';
import {
  calculateCostPerWFODay,
  calculateDeterministicForecast,
  generateStructuredInsights,
  aggregateDashboardData,
  getWorkWeekDates,
  computeHistoricalAnalytics,
} from '@/lib/analyticsEngine';
import type { ExpenseRecord } from '@/lib/expenseEngine';
import type { TripBlock } from '@/lib/travelEngine';
import type { ScheduleException } from '@/lib/scheduleEngine';
import { getDashboardSummary } from '@/server/services/dashboardService';

describe('Forecasting Engine & Cost Per WFO Day', () => {
  const sampleExpenses: ExpenseRecord[] = [
    {
      id: 'e1',
      userId: 'u1',
      date: '2026-10-13',
      title: 'Vande Bharat Train',
      category: 'TRAVEL',
      subcategory: 'train',
      plannedAmount: 850,
      actualAmount: 850,
      variance: 0,
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'e2',
      userId: 'u1',
      date: '2026-10-13',
      title: 'Hotel Suite',
      category: 'ACCOMMODATION',
      subcategory: 'hotel',
      plannedAmount: 2500,
      actualAmount: 2500,
      variance: 0,
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'e3',
      userId: 'u1',
      date: '2026-10-13',
      title: 'Lunch',
      category: 'FOOD',
      subcategory: 'lunch',
      plannedAmount: 180,
      actualAmount: 200,
      variance: 20,
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'e4',
      userId: 'u1',
      date: '2026-10-14',
      title: 'Return Train',
      category: 'TRAVEL',
      subcategory: 'train',
      plannedAmount: 850,
      actualAmount: 850,
      variance: 0,
      currency: 'INR',
      status: 'CONFIRMED',
      source: 'user',
      reimbursable: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  const workDays = [
    { date: '2026-10-13', scheduleType: 'WFO' },
    { date: '2026-10-14', scheduleType: 'WFO' },
  ];

  it('calculates transparent Cost Per WFO Day with component breakdown', () => {
    const breakdown = calculateCostPerWFODay(sampleExpenses, workDays);
    expect(breakdown.wfoDaysCount).toBe(2);
    // Total cost = 850 (train) + 2500 (hotel) + 200 (food) + 850 (return train) = 4400
    expect(breakdown.totalRelevantCost).toBe(4400);
    // Cost per WFO day = 4400 / 2 = 2200
    expect(breakdown.costPerWFODay).toBe(2200);
    expect(breakdown.components.travelCost).toBe(1700);
    expect(breakdown.components.accommodationCost).toBe(2500);
    expect(breakdown.components.foodPerDiemCost).toBe(200);
    expect(breakdown.formulaExplanation).toContain('Total Relevant WFO Cost');
  });

  it('calculates deterministic monthly and yearly forecast without AI hallucinations', () => {
    const forecast = calculateDeterministicForecast(
      sampleExpenses,
      [],
      workDays,
      25000,
      '2026-10-13'
    );

    expect(forecast.currentMonthSpend).toBe(4400);
    expect(forecast.projectedMonthSpend).toBeGreaterThanOrEqual(4400);
    expect(forecast.projectedYearSpend).toBe(forecast.projectedMonthSpend * 12);
    expect(forecast.averageWFOCost).toBe(2200);
    expect(forecast.monthlyBudget).toBe(25000);
    expect(forecast.budgetUtilizationPct).toBe(Math.round((4400 / 25000) * 100));
  });
});

describe('Structured Insight Candidates Generator', () => {
  it('detects highest cost day, primary category driver, and budget overrun outliers', () => {
    const expenses: ExpenseRecord[] = [
      {
        id: 'e1',
        userId: 'u1',
        date: '2026-10-13',
        title: 'Flight Ticket',
        category: 'TRAVEL',
        subcategory: 'flight',
        plannedAmount: 4500,
        actualAmount: 5200,
        variance: 700, // Significant overrun
        currency: 'INR',
        status: 'CONFIRMED',
        source: 'user',
        reimbursable: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'e2',
        userId: 'u1',
        date: '2026-10-14',
        title: 'Dinner',
        category: 'FOOD',
        subcategory: 'dinner',
        plannedAmount: 400,
        actualAmount: 350,
        variance: -50, // Cost savings
        currency: 'INR',
        status: 'CONFIRMED',
        source: 'user',
        reimbursable: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const insights = generateStructuredInsights(expenses);
    expect(insights.length).toBeGreaterThanOrEqual(3);

    const peakDay = insights.find((i) => i.type === 'HIGHEST_COST_DAY');
    expect(peakDay).toBeDefined();
    expect(peakDay?.dataPoints.date).toBe('2026-10-13');

    const topCategory = insights.find((i) => i.type === 'HIGHEST_COST_CATEGORY');
    expect(topCategory).toBeDefined();
    expect(topCategory?.dataPoints.category).toBe('TRAVEL');

    const overrun = insights.find((i) => i.type === 'UNUSUAL_EXPENSE');
    expect(overrun).toBeDefined();
    expect(overrun?.impactAmount).toBe(700);
  });
});

describe('Dashboard Aggregation & Week View', () => {
  it('resolves Monday-Friday work week dates accurately', () => {
    // Wednesday Oct 14, 2026
    const ref = new Date('2026-10-14T00:00:00Z');
    const weekDates = getWorkWeekDates(ref);

    expect(weekDates.length).toBe(5);
    expect(weekDates[0].dayName).toBe('Monday');
    expect(weekDates[0].date).toBe('2026-10-12');
    expect(weekDates[4].dayName).toBe('Friday');
    expect(weekDates[4].date).toBe('2026-10-16');
  });

  it('aggregates week view cards with resolved schedule, travel legs, stay, and alerts', () => {
    const workDays = [
      { date: '2026-10-12', scheduleType: 'WFH' },
      { date: '2026-10-13', scheduleType: 'WFO' },
      { date: '2026-10-14', scheduleType: 'WFO' },
      { date: '2026-10-15', scheduleType: 'WFO' },
      { date: '2026-10-16', scheduleType: 'WFH' },
    ];

    const exceptions: ScheduleException[] = [
      {
        id: 'exc_hol_1',
        userId: 'u1',
        date: '2026-10-15',
        type: 'HOLIDAY',
        reason: 'State Holiday',
        source: 'USER',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];

    const trips: TripBlock[] = [
      {
        id: 'trip_pune',
        userId: 'u1',
        title: 'Pune Sprint',
        startDate: '2026-10-13',
        endDate: '2026-10-14',
        origin: 'Mumbai',
        destination: 'Pune',
        officeLocation: 'Pune HQ',
        purpose: 'Sprint',
        workDays: ['2026-10-13', '2026-10-14'],
        travelSegments: [
          { id: 's1', mode: 'train', label: 'Express', origin: 'Mumbai', destination: 'Pune', estimatedCost: 850, sequence: 1, direction: 'OUTBOUND', active: true },
          { id: 's2', mode: 'train', label: 'Return Express', origin: 'Pune', destination: 'Mumbai', estimatedCost: 850, sequence: 1, direction: 'RETURN', active: true },
        ],
        accommodation: {
          id: 'acc_1',
          name: 'The Ritz',
          type: 'hotel',
          nightlyCost: 3000,
          location: 'Pune',
          checkIn: '2026-10-13',
          checkOut: '2026-10-14',
          nights: 1,
          totalCost: 3000,
        },
        plannedTravelCost: 1700,
        plannedStayCost: 3000,
        plannedCost: 4700,
        status: 'CONFIRMED',
        nightsCount: 1,
        aiOptimizationScore: 92,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const expenses: ExpenseRecord[] = [
      {
        id: 'e1',
        userId: 'u1',
        date: '2026-10-13',
        title: 'Train Outbound',
        category: 'TRAVEL',
        subcategory: 'train',
        plannedAmount: 850,
        actualAmount: 850,
        variance: 0,
        currency: 'INR',
        status: 'CONFIRMED',
        source: 'user',
        reimbursable: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const dashboard = aggregateDashboardData({
      workDays,
      exceptions,
      trips,
      expenses,
      monthlyBudget: 25000,
      referenceDate: '2026-10-13',
    });

    expect(dashboard.weekView.length).toBe(5);

    // Tuesday card (Oct 13)
    const tuesday = dashboard.weekView.find((d) => d.dayOfWeek === 'Tuesday');
    expect(tuesday).toBeDefined();
    expect(tuesday?.resolvedMode).toBe('WFO');
    expect(tuesday?.travelSegments.length).toBe(1);
    expect(tuesday?.accommodationStay?.name).toBe('The Ritz');
    expect(tuesday?.actualSpend).toBe(850);

    // Alerts check (Holiday conflict on Oct 15)
    const holidayAlert = dashboard.alerts.find((a) => a.type === 'HOLIDAY_CONFLICT');
    expect(holidayAlert).toBeDefined();
    expect(holidayAlert?.title).toContain('Holiday Conflict');

    // Upcoming travel alert
    const travelAlert = dashboard.alerts.find((a) => a.type === 'UPCOMING_TRAVEL');
    expect(travelAlert).toBeDefined();
    expect(travelAlert?.title).toContain('Pune Sprint');
  });
});

describe('Historical Analytics Aggregation', () => {
  it('computes monthly trends, category breakdown, weekday comparison, and city breakdown', () => {
    const expenses: ExpenseRecord[] = [
      {
        id: 'e1',
        userId: 'u1',
        date: '2026-10-13', // Tuesday
        title: 'Train',
        category: 'TRAVEL',
        subcategory: 'train',
        plannedAmount: 850,
        actualAmount: 850,
        variance: 0,
        currency: 'INR',
        status: 'CONFIRMED',
        source: 'user',
        reimbursable: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'e2',
        userId: 'u1',
        date: '2026-10-13',
        title: 'Hotel',
        category: 'ACCOMMODATION',
        subcategory: 'hotel',
        plannedAmount: 2500,
        actualAmount: 2500,
        variance: 0,
        currency: 'INR',
        status: 'CONFIRMED',
        source: 'user',
        reimbursable: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const trips: TripBlock[] = [
      {
        id: 't1',
        userId: 'u1',
        title: 'Pune Sprint',
        startDate: '2026-10-13',
        endDate: '2026-10-14',
        origin: 'Mumbai',
        destination: 'Pune',
        officeLocation: 'Pune HQ',
        purpose: 'Sprint',
        workDays: ['2026-10-13'],
        travelSegments: [],
        plannedTravelCost: 850,
        plannedStayCost: 2500,
        plannedCost: 3350,
        status: 'CONFIRMED',
        nightsCount: 1,
        aiOptimizationScore: 92,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const analytics = computeHistoricalAnalytics(expenses, trips, []);
    expect(analytics.monthlyTrends.length).toBeGreaterThanOrEqual(1);
    expect(analytics.categoryBreakdown.find((c) => c.category === 'TRAVEL')?.actual).toBe(850);
    expect(analytics.categoryBreakdown.find((c) => c.category === 'ACCOMMODATION')?.actual).toBe(2500);

    const tuesday = analytics.weekdayComparison.find((w) => w.weekday === 'Tuesday');
    expect(tuesday?.totalCost).toBe(3350);

    expect(analytics.cityComparison[0].city).toBe('Pune');
  });
});

describe('Backend Serverless Dashboard Service', () => {
  it('returns consolidated dashboard summary payload for authenticated user', async () => {
    const summary = await getDashboardSummary('demo-traveler-uid-001', '2026-10-13');
    expect(summary).toBeDefined();
    expect(summary.period).toBeDefined();
    expect(summary.hero).toBeDefined();
    expect(summary.kpis).toBeDefined();
    expect(summary.weekView.length).toBe(5);
    expect(Array.isArray(summary.alerts)).toBe(true);
    expect(Array.isArray(summary.insights)).toBe(true);
  });
});
