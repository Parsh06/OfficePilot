import type { ExpenseRecord } from '@/lib/expenseEngine';
import type { TripBlock } from '@/lib/travelEngine';
import type {
  HistoricalAnalyticsData,
  CategorySpendItem,
  WeekdaySpendItem,
  MonthlyTrendItem,
} from './types';
import type { GenericWorkDay } from './forecastingEngine';

/**
 * Computes deterministic historical analytics across expenses, trips, and work days.
 */
export function computeHistoricalAnalytics(
  expenses: ExpenseRecord[],
  trips: TripBlock[] = [],
  workDays: GenericWorkDay[] = []
): HistoricalAnalyticsData {
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 1. Monthly Trends
  const monthlyGroups: Record<string, { planned: number; actual: number; dates: Set<string> }> = {};
  expenses.forEach((e) => {
    const ym = e.date.substring(0, 7); // e.g. "2026-10"
    if (!monthlyGroups[ym]) {
      monthlyGroups[ym] = { planned: 0, actual: 0, dates: new Set() };
    }
    monthlyGroups[ym].planned += e.plannedAmount || 0;
    if (e.actualAmount !== undefined) {
      monthlyGroups[ym].actual += e.actualAmount;
    } else {
      monthlyGroups[ym].actual += e.plannedAmount;
    }
    monthlyGroups[ym].dates.add(e.date);
  });

  const monthKeys = Object.keys(monthlyGroups).sort();
  if (monthKeys.length === 0) {
    monthKeys.push(new Date().toISOString().substring(0, 7));
  }

  const monthlyTrends: MonthlyTrendItem[] = monthKeys.map((ym) => {
    const group = monthlyGroups[ym] || { planned: 0, actual: 0, dates: new Set() };
    const [yearStr, monthStr] = ym.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const dateObj = new Date(year, monthIndex, 1);
    const monthName = dateObj.toLocaleString('en-US', { month: 'short' });

    // WFO days in this month
    const monthWfoDays = workDays.filter(
      (d) => d.date.startsWith(ym) && (d.scheduleType || d.resolvedMode || d.mode) === 'WFO'
    ).length;
    const effectiveWfoDays = Math.max(1, monthWfoDays || group.dates.size);
    const costPerWFO = Math.round(group.actual / effectiveWfoDays);

    return {
      month: `${monthName} '${yearStr.slice(-2)}`,
      year,
      planned: group.planned,
      actual: group.actual,
      wfoDays: effectiveWfoDays,
      costPerWFO,
    };
  });

  // 2. Category Breakdown
  const catTotals: Record<string, { planned: number; actual: number }> = {
    TRAVEL: { planned: 0, actual: 0 },
    FOOD: { planned: 0, actual: 0 },
    ACCOMMODATION: { planned: 0, actual: 0 },
    WORK: { planned: 0, actual: 0 },
    MISCELLANEOUS: { planned: 0, actual: 0 },
  };

  let totalAllActual = 0;
  expenses.forEach((e) => {
    const cat = catTotals[e.category] ? e.category : 'MISCELLANEOUS';
    const planned = e.plannedAmount || 0;
    const actual = e.actualAmount !== undefined ? e.actualAmount : planned;
    catTotals[cat].planned += planned;
    catTotals[cat].actual += actual;
    totalAllActual += actual;
  });

  const categoryBreakdown: CategorySpendItem[] = Object.entries(catTotals).map(
    ([category, vals]) => {
      const percentage =
        totalAllActual > 0 ? Math.round((vals.actual / totalAllActual) * 100) : 0;
      return {
        category,
        planned: vals.planned,
        actual: vals.actual,
        percentage,
      };
    }
  );

  // 3. Weekday Cost Comparison
  const weekdayTotals: Record<string, { total: number; count: number }> = {
    Monday: { total: 0, count: 0 },
    Tuesday: { total: 0, count: 0 },
    Wednesday: { total: 0, count: 0 },
    Thursday: { total: 0, count: 0 },
    Friday: { total: 0, count: 0 },
  };

  expenses.forEach((e) => {
    const d = new Date(e.date + 'T00:00:00Z');
    const dayName = weekdayNames[d.getUTCDay()];
    if (weekdayTotals[dayName]) {
      const amt = e.actualAmount !== undefined ? e.actualAmount : e.plannedAmount;
      weekdayTotals[dayName].total += amt;
      weekdayTotals[dayName].count += 1;
    }
  });

  const weekdayComparison: WeekdaySpendItem[] = Object.entries(weekdayTotals).map(
    ([weekday, data]) => ({
      weekday,
      totalCost: data.total,
      count: data.count,
      averageCost: data.count > 0 ? Math.round(data.total / data.count) : 0,
    })
  );

  // 4. City Comparison
  const cityTotals: Record<string, { total: number; tripsCount: number }> = {};
  trips.forEach((t) => {
    const dest = t.destination || 'Office City';
    if (!cityTotals[dest]) {
      cityTotals[dest] = { total: 0, tripsCount: 0 };
    }
    cityTotals[dest].tripsCount += 1;
    cityTotals[dest].total += t.plannedCost || t.estimatedCost || 0;
  });

  const cityComparison = Object.entries(cityTotals).map(([city, data]) => ({
    city,
    totalCost: data.total,
    tripsCount: data.tripsCount,
  }));

  // 5. WFO Cost Trends over Time
  const wfoDates = new Set(
    workDays
      .filter((d) => (d.scheduleType || d.resolvedMode || d.mode) === 'WFO')
      .map((d) => d.date)
  );
  const wfoCostTrends: { date: string; costPerWFODay: number; plannedCost: number }[] = [];

  const dateToExpenses: Record<string, { planned: number; actual: number }> = {};
  expenses.forEach((e) => {
    if (!dateToExpenses[e.date]) {
      dateToExpenses[e.date] = { planned: 0, actual: 0 };
    }
    dateToExpenses[e.date].planned += e.plannedAmount || 0;
    dateToExpenses[e.date].actual += e.actualAmount !== undefined ? e.actualAmount : e.plannedAmount || 0;
  });

  Object.entries(dateToExpenses)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, costs]) => {
      if (wfoDates.has(date) || wfoDates.size === 0) {
        wfoCostTrends.push({
          date,
          costPerWFODay: costs.actual,
          plannedCost: costs.planned,
        });
      }
    });

  // 6. Summary metrics
  const totalDays = Math.max(1, Object.keys(dateToExpenses).length);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 5));
  const totalMonths = Math.max(1, monthlyTrends.length);

  const dailyAverageSpend = Math.round(totalAllActual / totalDays);
  const weeklyAverageSpend = Math.round(totalAllActual / totalWeeks);
  const monthlyAverageSpend = Math.round(totalAllActual / totalMonths);
  const projectedYearSpend = monthlyAverageSpend * 12;
  const averageSpendPerTrip =
    trips.length > 0 ? Math.round(totalAllActual / trips.length) : totalAllActual;

  return {
    monthlyTrends,
    categoryBreakdown,
    weekdayComparison,
    cityComparison,
    wfoCostTrends,
    summary: {
      dailyAverageSpend,
      weeklyAverageSpend,
      monthlyAverageSpend,
      projectedYearSpend,
      averageSpendPerTrip,
      totalTravelCost: catTotals.TRAVEL.actual,
      totalAccommodationCost: catTotals.ACCOMMODATION.actual,
      totalFoodCost: catTotals.FOOD.actual,
    },
  };
}
