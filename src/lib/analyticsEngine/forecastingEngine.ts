import type { ExpenseRecord } from '@/lib/expenseEngine';
import type { TripBlock } from '@/lib/travelEngine';
import type {
  CostPerWFOBreakdown,
  DeterministicForecastMetrics,
} from './types';

export interface GenericWorkDay {
  date: string;
  scheduleType?: string;
  resolvedMode?: string;
  mode?: string;
}

/**
 * Calculates transparent Cost Per WFO Day metric.
 * 
 * Formula:
 * Cost Per WFO Day = Total Relevant WFO Costs / Number of WFO Days
 * 
 * Components included:
 * - Travel (transit, trains, metro, flights, cabs, fuel)
 * - Accommodation (hotel, PG, guest house stays during office trips)
 * - Food & Per Diem (meals on office travel days)
 * - Work-related out-of-pocket expenses on office days
 */
export function calculateCostPerWFODay(
  expenses: ExpenseRecord[],
  workDays: GenericWorkDay[] = []
): CostPerWFOBreakdown {
  const wfoDayDates = new Set(
    workDays
      .filter((d) => (d.scheduleType || d.resolvedMode || d.mode) === 'WFO')
      .map((d) => d.date)
  );

  // If no explicit workDays list was supplied, derive from expenses linked to trips or with date matches
  let wfoDaysCount = wfoDayDates.size;
  if (wfoDaysCount === 0) {
    const datesWithExpenses = new Set(expenses.map((e) => e.date));
    wfoDaysCount = Math.max(1, datesWithExpenses.size);
  }

  let travelCost = 0;
  let accommodationCost = 0;
  let foodPerDiemCost = 0;
  let otherWorkCost = 0;

  expenses.forEach((exp) => {
    const amt = exp.actualAmount !== undefined ? exp.actualAmount : exp.plannedAmount;
    const isWfoDay = wfoDayDates.has(exp.date) || exp.tripId !== undefined;

    if (isWfoDay || wfoDayDates.size === 0) {
      switch (exp.category) {
        case 'TRAVEL':
          travelCost += amt;
          break;
        case 'ACCOMMODATION':
          accommodationCost += amt;
          break;
        case 'FOOD':
          foodPerDiemCost += amt;
          break;
        case 'WORK':
        case 'MISCELLANEOUS':
        default:
          otherWorkCost += amt;
          break;
      }
    }
  });

  const totalRelevantCost = travelCost + accommodationCost + foodPerDiemCost + otherWorkCost;
  const costPerWFODay = wfoDaysCount > 0 ? Math.round(totalRelevantCost / wfoDaysCount) : 0;

  const formulaExplanation = `Total Relevant WFO Cost (₹${totalRelevantCost.toLocaleString('en-IN')}) ÷ ${wfoDaysCount} WFO Days = ₹${costPerWFODay.toLocaleString('en-IN')}/day. Includes: Travel (₹${travelCost.toLocaleString('en-IN')}), Lodging (₹${accommodationCost.toLocaleString('en-IN')}), Meals/Per Diem (₹${foodPerDiemCost.toLocaleString('en-IN')}), Incidentals (₹${otherWorkCost.toLocaleString('en-IN')}).`;

  return {
    wfoDaysCount,
    totalRelevantCost,
    costPerWFODay,
    components: {
      travelCost,
      accommodationCost,
      foodPerDiemCost,
      otherWorkCost,
    },
    formulaExplanation,
  };
}

/**
 * Computes deterministic forecasting metrics based on historical actuals and future planned schedules.
 * No AI hallucinations — pure deterministic financial arithmetic.
 */
export function calculateDeterministicForecast(
  expenses: ExpenseRecord[],
  trips: TripBlock[] = [],
  workDays: GenericWorkDay[] = [],
  monthlyBudget: number = 25000,
  referenceDate: string = new Date().toISOString().substring(0, 10)
): DeterministicForecastMetrics {
  const currentYearMonth = referenceDate.substring(0, 7); // e.g. "2026-10"

  // 1. Current Month Spend (Actuals to date in current month)
  let currentMonthSpend = 0;
  let remainingPlannedInMonth = 0;

  expenses.forEach((exp) => {
    if (exp.date.startsWith(currentYearMonth)) {
      if (exp.actualAmount !== undefined) {
        currentMonthSpend += exp.actualAmount;
      } else if (exp.date >= referenceDate) {
        remainingPlannedInMonth += exp.plannedAmount;
      } else {
        // Past item with only planned amount
        currentMonthSpend += exp.plannedAmount;
      }
    }
  });

  // 2. Projected Month Spend
  const projectedMonthSpend = currentMonthSpend + remainingPlannedInMonth;

  // 3. Projected Year Spend: 12 * projectedMonthSpend or extrapolation
  const projectedYearSpend = Math.round(projectedMonthSpend * 12);

  // 4. Cost Per WFO Day
  const costPerWFOBreakdown = calculateCostPerWFODay(expenses, workDays);
  const averageWFOCost = costPerWFOBreakdown.costPerWFODay;

  // 5. Expected Upcoming Spend (Next 30 days from reference date)
  let expectedUpcomingSpend = 0;
  expenses.forEach((exp) => {
    if (exp.date >= referenceDate) {
      expectedUpcomingSpend += exp.actualAmount !== undefined ? exp.actualAmount : exp.plannedAmount;
    }
  });

  // Also factor in scheduled trips that might not yet have generated expense line items
  trips.forEach((trip) => {
    if (trip.startDate >= referenceDate && trip.status !== 'CANCELLED') {
      const alreadyHasExpenses = expenses.some((e) => e.tripId === trip.id);
      if (!alreadyHasExpenses) {
        expectedUpcomingSpend += trip.plannedCost || trip.estimatedCost || 0;
      }
    }
  });

  const budgetUtilizationPct = monthlyBudget > 0
    ? Math.round((currentMonthSpend / monthlyBudget) * 100)
    : 0;

  return {
    currentMonthSpend,
    projectedMonthSpend,
    projectedYearSpend,
    averageWFOCost,
    expectedUpcomingSpend,
    monthlyBudget,
    budgetUtilizationPct,
    costPerWFOBreakdown,
  };
}
