import type { TripBlock, RouteSegment } from '@/lib/travelEngine';
import type {
  ExpenseRecord,
  ExpenseTemplate,
  ExpenseCategory,
  ExpenseSummaryMetrics,
} from './types';

/**
 * Deterministically computes variance between planned and actual expense amounts.
 * Negative variance (< 0) indicates savings (under budget).
 * Positive variance (> 0) indicates cost overrun (over budget).
 */
export function calculateExpenseVariance(plannedAmount: number, actualAmount?: number): number {
  if (actualAmount === undefined || actualAmount === null) {
    return 0;
  }
  return actualAmount - plannedAmount;
}

/**
 * Validates that an expense amount is non-negative and valid.
 */
export function validateExpenseAmount(amount: number): boolean {
  return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
}

/**
 * Creates standard daily default expense templates.
 */
export function createDefaultExpenseTemplates(userId: string): ExpenseTemplate[] {
  return [
    {
      id: `tmpl_${userId}_breakfast`,
      userId,
      name: 'Breakfast & Morning Coffee',
      category: 'FOOD',
      subcategory: 'breakfast',
      defaultAmount: 120,
      currency: 'INR',
      active: true,
      isPerDiem: true,
    },
    {
      id: `tmpl_${userId}_lunch`,
      userId,
      name: 'Office Lunch / Cafeteria',
      category: 'FOOD',
      subcategory: 'lunch',
      defaultAmount: 180,
      currency: 'INR',
      active: true,
      isPerDiem: true,
    },
    {
      id: `tmpl_${userId}_snacks`,
      userId,
      name: 'Evening Snacks & Tea',
      category: 'FOOD',
      subcategory: 'snacks',
      defaultAmount: 80,
      currency: 'INR',
      active: true,
      isPerDiem: true,
    },
    {
      id: `tmpl_${userId}_dinner`,
      userId,
      name: 'Dinner',
      category: 'FOOD',
      subcategory: 'dinner',
      defaultAmount: 280,
      currency: 'INR',
      active: true,
      isPerDiem: true,
    },
    {
      id: `tmpl_${userId}_misc`,
      userId,
      name: 'Daily Incidental / Misc',
      category: 'MISCELLANEOUS',
      subcategory: 'other',
      defaultAmount: 100,
      currency: 'INR',
      active: true,
      isPerDiem: true,
    },
  ];
}

/**
 * Maps travel segment mode to travel subcategory.
 */
function mapSegmentModeToSubcategory(mode: string): string {
  const normalized = (mode || '').toLowerCase();
  switch (normalized) {
    case 'train':
      return 'train';
    case 'metro':
      return 'metro';
    case 'rapido':
      return 'rapido';
    case 'uber':
      return 'uber';
    case 'auto':
      return 'auto';
    case 'bus':
      return 'bus';
    case 'cab':
      return 'cab';
    case 'flight':
      return 'flight';
    case 'fuel':
      return 'fuel';
    case 'parking':
      return 'parking';
    case 'walking':
      return 'other';
    default:
      return 'other';
  }
}

/**
 * Deterministically generates planned expenses for a Trip Block based on its route segments,
 * stay details, work days, and user expense templates.
 * 
 * Idempotent: Uses deterministic `generationKey` to avoid duplicating already-created records.
 */
export function generatePlannedExpensesForTrip(
  trip: TripBlock,
  templates: ExpenseTemplate[] = [],
  existingExpenses: ExpenseRecord[] = []
): ExpenseRecord[] {
  if (!trip) return [];

  const effectiveTemplates =
    templates.length > 0
      ? templates.filter((t) => t.active !== false)
      : createDefaultExpenseTemplates(trip.userId);

  const existingKeys = new Set(
    existingExpenses.filter((e) => e.generationKey).map((e) => e.generationKey!)
  );

  const newExpenses: ExpenseRecord[] = [];
  const now = new Date().toISOString();
  
  // Extract work day string dates
  const workDays: string[] = (trip.workDays && trip.workDays.length > 0)
    ? trip.workDays.map((d: any) => (typeof d === 'string' ? d : d.date || trip.startDate))
    : [trip.startDate];

  const anyTrip = trip as any;
  const allSegments: RouteSegment[] = (
    trip.travelSegments || [
      ...(anyTrip.outboundSegments || []),
      ...(anyTrip.returnSegments || []),
      ...(anyTrip.localSegments || []),
    ]
  ) || [];

  const outboundSegments = allSegments.filter(
    (s: RouteSegment) => s.active !== false && s.direction === 'OUTBOUND'
  );
  const returnSegments = allSegments.filter(
    (s: RouteSegment) => s.active !== false && s.direction === 'RETURN'
  );
  const localSegments = allSegments.filter(
    (s: RouteSegment) => s.active !== false && s.direction === 'LOCAL'
  );

  // 1. Generate Outbound Travel Expenses on Start Date
  outboundSegments.forEach((seg) => {
    const subcat = mapSegmentModeToSubcategory(seg.mode);
    const genKey = `gen_${trip.id}_${trip.startDate}_TRAVEL_${subcat}_${seg.id}`;
    if (!existingKeys.has(genKey)) {
      newExpenses.push({
        id: `exp_out_${trip.id}_${seg.id}_${Date.now().toString(36)}`,
        userId: trip.userId,
        date: trip.startDate,
        title: `Outbound: ${seg.label || seg.mode}`,
        tripId: trip.id,
        segmentId: seg.id,
        category: 'TRAVEL',
        subcategory: subcat,
        plannedAmount: seg.estimatedCost,
        actualAmount: undefined,
        variance: 0,
        currency: 'INR',
        paymentMethod: 'UPI',
        reimbursable: true,
        status: 'PLANNED',
        source: 'generated',
        generationKey: genKey,
        notes: `${seg.origin} ➔ ${seg.destination} (${seg.mode})`,
        createdAt: now,
        updatedAt: now,
      });
      existingKeys.add(genKey);
    }
  });

  // 2. Generate Daily Expenses (Food, Misc, Local Transit) for Each Work Day
  workDays.forEach((dayDate, dayIndex) => {
    // A. Daily Templates (Breakfast, Lunch, Snacks, Dinner, Misc)
    effectiveTemplates.forEach((tmpl) => {
      const genKey = `gen_${trip.id}_${dayDate}_${tmpl.category}_${tmpl.subcategory}_daily`;
      if (!existingKeys.has(genKey)) {
        newExpenses.push({
          id: `exp_tmpl_${trip.id}_${dayDate}_${tmpl.subcategory}_${Date.now().toString(36)}`,
          userId: trip.userId,
          date: dayDate,
          title: `${tmpl.name}`,
          tripId: trip.id,
          workDayId: dayDate,
          category: tmpl.category,
          subcategory: tmpl.subcategory,
          plannedAmount: tmpl.defaultAmount,
          actualAmount: undefined,
          variance: 0,
          currency: tmpl.currency || 'INR',
          paymentMethod: 'UPI',
          reimbursable: tmpl.category === 'FOOD' || tmpl.category === 'WORK',
          status: 'PLANNED',
          source: 'generated',
          generationKey: genKey,
          notes: `Planned per diem for ${dayDate}`,
          createdAt: now,
          updatedAt: now,
        });
        existingKeys.add(genKey);
      }
    });

    // B. Local transit on intermediate days
    if (dayIndex > 0 && dayIndex < workDays.length - 1 && localSegments.length > 0) {
      localSegments.forEach((locSeg) => {
        const subcat = mapSegmentModeToSubcategory(locSeg.mode);
        const genKey = `gen_${trip.id}_${dayDate}_LOCAL_${locSeg.id}`;
        if (!existingKeys.has(genKey)) {
          newExpenses.push({
            id: `exp_loc_${trip.id}_${dayDate}_${locSeg.id}`,
            userId: trip.userId,
            date: dayDate,
            title: `Local: ${locSeg.label}`,
            tripId: trip.id,
            segmentId: locSeg.id,
            workDayId: dayDate,
            category: 'TRAVEL',
            subcategory: subcat,
            plannedAmount: locSeg.estimatedCost,
            actualAmount: undefined,
            variance: 0,
            currency: 'INR',
            paymentMethod: 'UPI',
            reimbursable: true,
            status: 'PLANNED',
            source: 'generated',
            generationKey: genKey,
            notes: `Intra-city commute in ${trip.destination || 'office city'}`,
            createdAt: now,
            updatedAt: now,
          });
          existingKeys.add(genKey);
        }
      });
    }

    // C. Accommodation night on this date from accommodationNights or accommodation object
    const nights = anyTrip.accommodationNights as Array<{ date: string; estimatedCost: number; label?: string; accommodationType?: string }> | undefined;
    if (nights && nights.length > 0) {
      const stayNight = nights.find((n) => n.date === dayDate);
      if (stayNight) {
        const genKey = `gen_${trip.id}_${dayDate}_ACCOMMODATION_${stayNight.accommodationType || 'hotel'}`;
        if (!existingKeys.has(genKey)) {
          newExpenses.push({
            id: `exp_acc_${trip.id}_${dayDate}_${Date.now().toString(36)}`,
            userId: trip.userId,
            date: dayDate,
            title: `${stayNight.label || stayNight.accommodationType || 'Hotel Stay'}`,
            tripId: trip.id,
            workDayId: dayDate,
            category: 'ACCOMMODATION',
            subcategory: (stayNight.accommodationType || 'hotel').toLowerCase(),
            plannedAmount: stayNight.estimatedCost,
            actualAmount: undefined,
            variance: 0,
            currency: 'INR',
            paymentMethod: 'CORPORATE_CARD',
            reimbursable: true,
            status: 'PLANNED',
            source: 'generated',
            generationKey: genKey,
            notes: `Accommodation night for ${dayDate}`,
            createdAt: now,
            updatedAt: now,
          });
          existingKeys.add(genKey);
        }
      }
    } else if (trip.accommodation && dayIndex < (trip.nightsCount || 1)) {
      const genKey = `gen_${trip.id}_${dayDate}_ACCOMMODATION_stay`;
      if (!existingKeys.has(genKey)) {
        newExpenses.push({
          id: `exp_acc_${trip.id}_${dayDate}_${Date.now().toString(36)}`,
          userId: trip.userId,
          date: dayDate,
          title: `${trip.accommodation.name || trip.accommodation.type.toUpperCase()} (Night ${dayIndex + 1})`,
          tripId: trip.id,
          workDayId: dayDate,
          category: 'ACCOMMODATION',
          subcategory: trip.accommodation.type,
          plannedAmount: trip.accommodation.nightlyCost,
          actualAmount: undefined,
          variance: 0,
          currency: 'INR',
          paymentMethod: 'CORPORATE_CARD',
          reimbursable: true,
          status: 'PLANNED',
          source: 'generated',
          generationKey: genKey,
          notes: `${trip.accommodation.location} • Check-in: ${trip.accommodation.checkIn}`,
          createdAt: now,
          updatedAt: now,
        });
        existingKeys.add(genKey);
      }
    }
  });

  // 3. Generate Return Travel Expenses on End Date
  returnSegments.forEach((seg) => {
    const subcat = mapSegmentModeToSubcategory(seg.mode);
    const genKey = `gen_${trip.id}_${trip.endDate}_TRAVEL_${subcat}_${seg.id}`;
    if (!existingKeys.has(genKey)) {
      newExpenses.push({
        id: `exp_ret_${trip.id}_${seg.id}_${Date.now().toString(36)}`,
        userId: trip.userId,
        date: trip.endDate,
        title: `Return: ${seg.label || seg.mode}`,
        tripId: trip.id,
        segmentId: seg.id,
        category: 'TRAVEL',
        subcategory: subcat,
        plannedAmount: seg.estimatedCost,
        actualAmount: undefined,
        variance: 0,
        currency: 'INR',
        paymentMethod: 'UPI',
        reimbursable: true,
        status: 'PLANNED',
        source: 'generated',
        generationKey: genKey,
        notes: `${seg.origin} ➔ ${seg.destination} (${seg.mode})`,
        createdAt: now,
        updatedAt: now,
      });
      existingKeys.add(genKey);
    }
  });

  return newExpenses;
}

/**
 * Computes deterministic summary metrics across a list of expenses.
 */
export function calculateExpenseSummary(expenses: ExpenseRecord[]): ExpenseSummaryMetrics {
  let totalPlanned = 0;
  let totalActual = 0;
  let totalVariance = 0;
  let reimbursablePending = 0;
  let plannedCount = 0;
  let actualCount = 0;

  const categories: ExpenseCategory[] = ['TRAVEL', 'FOOD', 'ACCOMMODATION', 'WORK', 'MISCELLANEOUS'];
  const categoryBreakdown: Record<ExpenseCategory, { planned: number; actual: number; variance: number }> = {
    TRAVEL: { planned: 0, actual: 0, variance: 0 },
    FOOD: { planned: 0, actual: 0, variance: 0 },
    ACCOMMODATION: { planned: 0, actual: 0, variance: 0 },
    WORK: { planned: 0, actual: 0, variance: 0 },
    MISCELLANEOUS: { planned: 0, actual: 0, variance: 0 },
  };

  expenses.forEach((exp) => {
    const planned = Number(exp.plannedAmount) || 0;
    const hasActual = exp.actualAmount !== undefined && exp.actualAmount !== null;
    const actual = hasActual ? Number(exp.actualAmount) : 0;
    const variance = hasActual ? actual - planned : 0;

    totalPlanned += planned;
    if (hasActual) {
      totalActual += actual;
      totalVariance += variance;
      actualCount++;
    } else {
      plannedCount++;
    }

    if (exp.reimbursable && exp.status === 'PENDING') {
      reimbursablePending += hasActual ? actual : planned;
    }

    const cat = categories.includes(exp.category) ? exp.category : 'MISCELLANEOUS';
    categoryBreakdown[cat].planned += planned;
    if (hasActual) {
      categoryBreakdown[cat].actual += actual;
      categoryBreakdown[cat].variance += variance;
    }
  });

  return {
    totalPlanned,
    totalActual,
    totalSpent: totalActual > 0 ? totalActual : totalPlanned,
    totalVariance,
    reimbursablePending,
    count: expenses.length,
    plannedCount,
    actualCount,
    confirmedCount: actualCount,
    categoryBreakdown,
  };
}
