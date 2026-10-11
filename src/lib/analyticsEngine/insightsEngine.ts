import type { ExpenseRecord } from '@/lib/expenseEngine';
import type { TripBlock } from '@/lib/travelEngine';
import type { StructuredInsightCandidate } from './types';

/**
 * Deterministically prepares structured insight candidates.
 * Prepares actionable, auditable financial and travel insights for user review.
 */
export function generateStructuredInsights(
  expenses: ExpenseRecord[],
  trips: TripBlock[] = []
): StructuredInsightCandidate[] {
  const insights: StructuredInsightCandidate[] = [];

  if (expenses.length === 0) {
    return [
      {
        id: 'ins_welcome',
        type: 'SAVINGS_OPPORTUNITY',
        title: 'Ready for Travel & Schedule Optimization',
        summary: 'Log work days and trips to generate automated travel cost and per diem recommendations.',
        confidence: 1.0,
        dataPoints: {},
      },
    ];
  }

  // 1. Highest Cost Day Detection
  const spendByDate: Record<string, number> = {};
  expenses.forEach((e) => {
    const amt = e.actualAmount !== undefined ? e.actualAmount : e.plannedAmount;
    spendByDate[e.date] = (spendByDate[e.date] || 0) + amt;
  });

  const sortedDates = Object.entries(spendByDate).sort((a, b) => b[1] - a[1]);
  if (sortedDates.length > 0 && sortedDates[0][1] > 0) {
    const [peakDate, peakAmount] = sortedDates[0];
    insights.push({
      id: `ins_peak_day_${peakDate}`,
      type: 'HIGHEST_COST_DAY',
      title: `Highest Spending Day: ${peakDate}`,
      summary: `You spent ₹${peakAmount.toLocaleString('en-IN')} on ${peakDate}, primarily driven by multi-modal transit and lodging.`,
      impactAmount: peakAmount,
      suggestedAction: 'Review route segments on this date for carpooling or non-peak travel passes.',
      confidence: 0.95,
      dataPoints: { date: peakDate, amount: peakAmount },
    });
  }

  // 2. Highest Cost Category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const amt = e.actualAmount !== undefined ? e.actualAmount : e.plannedAmount;
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;
  });

  const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const [topCat, topCatAmount] = sortedCats[0];
    insights.push({
      id: `ins_top_cat_${topCat.toLowerCase()}`,
      type: 'HIGHEST_COST_CATEGORY',
      title: `${topCat} is your primary expense driver`,
      summary: `${topCat} accounts for ₹${topCatAmount.toLocaleString('en-IN')} across your recorded travel periods.`,
      impactAmount: topCatAmount,
      suggestedAction:
        topCat === 'TRAVEL'
          ? 'Consider booking train tickets 7 days in advance or switching from cabs to metro.'
          : topCat === 'ACCOMMODATION'
          ? 'Evaluate corporate PG rates vs hotel suites for multi-day sprints.'
          : 'Check if meal allowances or cafeteria subsidies apply.',
      confidence: 0.92,
      dataPoints: { category: topCat, amount: topCatAmount },
    });
  }

  // 3. Unusual Spending / Budget Overrun Outliers
  const overruns = expenses.filter(
    (e) => e.actualAmount !== undefined && e.variance > 0 && e.variance >= 100
  );
  if (overruns.length > 0) {
    const highestOverrun = overruns.sort((a, b) => b.variance - a.variance)[0];
    insights.push({
      id: `ins_unusual_${highestOverrun.id}`,
      type: 'UNUSUAL_EXPENSE',
      title: `Budget Variance Alert: ${highestOverrun.title}`,
      summary: `Actual cost was ₹${highestOverrun.actualAmount} vs planned ₹${highestOverrun.plannedAmount} (+₹${highestOverrun.variance} overrun).`,
      impactAmount: highestOverrun.variance,
      suggestedAction: 'Update your default expense template if prices for this line item have permanently increased.',
      confidence: 0.88,
      dataPoints: {
        expenseId: highestOverrun.id,
        planned: highestOverrun.plannedAmount,
        actual: highestOverrun.actualAmount,
        variance: highestOverrun.variance,
      },
    });
  }

  // 4. Batching / Recurring Savings Opportunity
  if (trips.length >= 2) {
    const singleDayTrips = trips.filter((t) => (t.nightsCount || (t as any).totalDurationNights || 0) === 0);
    if (singleDayTrips.length >= 2) {
      insights.push({
        id: 'ins_batching_opportunity',
        type: 'SAVINGS_OPPORTUNITY',
        title: 'Trip Batching Savings Potential',
        summary: 'Batching 2 separate single-day trips into a single 2-day sprint eliminates 1 round-trip transit cost (~₹1,700 savings).',
        impactAmount: 1700,
        suggestedAction: 'Combine consecutive WFO days into a consolidated block with overnight stay.',
        confidence: 0.89,
        dataPoints: { singleDayTripsCount: singleDayTrips.length },
      });
    }
  }

  // 5. Cost Savings Positive Variance
  const savings = expenses.filter((e) => e.variance < 0);
  const totalSaved = savings.reduce((sum, e) => sum + Math.abs(e.variance), 0);
  if (totalSaved > 0) {
    insights.push({
      id: 'ins_positive_savings',
      type: 'SAVINGS_OPPORTUNITY',
      title: `₹${totalSaved.toLocaleString('en-IN')} Total Cost Savings`,
      summary: `You spent less than the planned forecast across ${savings.length} items.`,
      impactAmount: totalSaved,
      confidence: 0.98,
      dataPoints: { totalSaved, savingsCount: savings.length },
    });
  }

  return insights;
}
