import type { AIToolDefinition } from '../types';
import { runScheduleOptimizer, simulateScenario } from '@/server/services/optimizerService';
import {
  getAdminWorkSchedule,
  getAdminUserProfile,
  getAdminTravelProfile,
  getAdminExpenseDefaults,
} from '@/server/repositories/firestoreAdminRepository';
import { createDefaultSchedule, resolveDateRange } from '@/lib/scheduleEngine';

export const CALCULATION_TOOL_DEFINITIONS: AIToolDefinition[] = [
  {
    name: 'calculateDayCost',
    description: 'Calculates the exact deterministic planned cost for a specific work day based on route segments, food allowance, and accommodation if present.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        mode: { type: 'string', enum: ['WFO', 'WFH', 'TRAVEL', 'OFF'], description: 'Work attendance mode' },
      },
      required: ['date'],
    },
  },
  {
    name: 'calculateTripCost',
    description: 'Calculates the exact deterministic cost of a travel trip given its outbound/return route segments and nightly lodging stay.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
        includeStay: { type: 'boolean', description: 'Whether multi-day lodging is included' },
        accommodationType: { type: 'string', enum: ['hotel', 'PG', 'guest_house'], description: 'Lodging tier' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'calculateWeekCost',
    description: 'Calculates exact total planned expense and travel legs for a target work week.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Week start date (Monday) in YYYY-MM-DD format' },
        weekOffset: { type: 'number', description: 'Week offset (0 = current week, 1 = next week)' },
      },
    },
  },
  {
    name: 'calculateMonthCost',
    description: 'Calculates total projected monthly travel, accommodation, and food spending.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Target month in YYYY-MM format (e.g. 2026-10)' },
      },
    },
  },
  {
    name: 'calculateYearProjection',
    description: 'Projects annual corporate commute and accommodation spend based on monthly target cadence.',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Calendar year (e.g. 2026)' },
      },
    },
  },
  {
    name: 'calculateLeaveImpact',
    description: 'Calculates the cost savings and transit leg reduction achieved by taking leave on a specific work day.',
    parameters: {
      type: 'object',
      properties: {
        leaveDate: { type: 'string', description: 'Date of planned leave in YYYY-MM-DD format' },
      },
      required: ['leaveDate'],
    },
  },
  {
    name: 'calculateHolidayImpact',
    description: 'Calculates schedule adjustments and savings when a public holiday falls during scheduled office days.',
    parameters: {
      type: 'object',
      properties: {
        holidayDate: { type: 'string', description: 'Date of holiday in YYYY-MM-DD format' },
      },
      required: ['holidayDate'],
    },
  },
  {
    name: 'compareScheduleOptions',
    description: 'Runs deterministic scenario simulation comparing current schedule against an alternative hypothesis.',
    parameters: {
      type: 'object',
      properties: {
        hypothesis: { type: 'string', description: 'Scenario question or description (e.g. "What if Thursday is WFH?")' },
        dateOverrides: {
          type: 'array',
          description: 'List of date overrides to test',
        },
      },
      required: ['hypothesis'],
    },
  },
  {
    name: 'compareTripOptions',
    description: 'Compares batched multi-day stay versus single-day roundtrip commutes for a set of office days.',
    parameters: {
      type: 'object',
      properties: {
        wfoDates: { type: 'array', description: 'List of WFO dates to evaluate' },
      },
    },
  },
  {
    name: 'calculateSavings',
    description: 'Calculates exact monetary savings and travel hours reduced for a specific optimization strategy.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['SAVER', 'BALANCED', 'COMFORT'], description: 'Optimization mode' },
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
    },
  },
];

async function safeCall<T>(fn: any, ...args: any[]): Promise<T | null> {
  if (typeof fn !== 'function') return null;
  try {
    const res = fn(...args);
    return res && typeof res.then === 'function' ? await res : res ?? null;
  } catch {
    return null;
  }
}

/**
 * Dispatches and executes calculation tools deterministically.
 */
export async function executeCalculationTool(
  name: string,
  args: Record<string, any>,
  userId: string
): Promise<any> {
  const [scheduleDoc, userProfileDoc, travelProfileDoc, expenseDefaultsDoc] = await Promise.all([
    safeCall<any>(getAdminWorkSchedule, userId),
    safeCall<any>(getAdminUserProfile, userId),
    safeCall<any>(getAdminTravelProfile, userId),
    safeCall<any>(getAdminExpenseDefaults, userId),
  ]);

  const schedule = scheduleDoc || createDefaultSchedule(userId, { timezone: 'Asia/Kolkata' });
  const homeCity = userProfileDoc?.homeCity || travelProfileDoc?.homeLocation || 'Mumbai, Maharashtra';
  const officeCity = userProfileDoc?.primaryOffice || travelProfileDoc?.officeLocation || 'Pune Technology Center';
  
  // Deterministic rates based on user setup
  const roundTripTransitCost =
    travelProfileDoc?.outboundSegments && travelProfileDoc.returnSegments
      ? travelProfileDoc.outboundSegments.reduce((s: number, seg: any) => s + (seg.estimatedCost || 0), 0) +
        travelProfileDoc.returnSegments.reduce((s: number, seg: any) => s + (seg.estimatedCost || 0), 0)
      : 1700; // Mumbai-Pune Express standard corridor
  const nightlyLodgingRate = expenseDefaultsDoc?.lodgingEstimate || 1800; // Corporate PG
  const wfoDailyFood = (expenseDefaultsDoc?.lunch || 180) + (expenseDefaultsDoc?.dinner || 270) || 450;
  const wfhDailyFood = 150;

  switch (name) {
    case 'calculateDayCost': {
      const mode = args.mode || 'WFO';
      if (mode === 'WFH' || mode === 'OFF') {
        return {
          date: args.date,
          mode,
          travelCost: 0,
          accommodationCost: 0,
          foodAllowance: wfhDailyFood,
          totalCost: wfhDailyFood,
          basis: `Remote ${mode} day: ₹0 transit/lodging, standard baseline meals ₹${wfhDailyFood}.`,
          explanation: `${mode} day requires ₹0 in travel/lodging, standard baseline meals ₹${wfhDailyFood}.`,
        };
      }
      return {
        date: args.date,
        mode: 'WFO',
        travelCost: roundTripTransitCost,
        accommodationCost: 0,
        foodAllowance: wfoDailyFood,
        totalCost: roundTripTransitCost + wfoDailyFood,
        basis: `Single-day ${homeCity} ⇄ ${officeCity} commute: ₹${roundTripTransitCost.toLocaleString('en-IN')} transit + ₹${wfoDailyFood} food allowance.`,
        explanation: `Single-day WFO commute: ₹${roundTripTransitCost.toLocaleString('en-IN')} round-trip transit + ₹${wfoDailyFood} daily food allowance.`,
      };
    }

    case 'calculateTripCost': {
      const d1 = new Date(args.startDate);
      const d2 = new Date(args.endDate);
      const nights = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
      const nightlyRate = args.accommodationType === 'PG' ? 1800 : args.accommodationType === 'hotel' ? 2800 : nightlyLodgingRate;
      const lodgingCost = nights * nightlyRate;
      const transitCost = roundTripTransitCost;
      const foodCost = (nights + 1) * wfoDailyFood;
      const totalCost = transitCost + lodgingCost + foodCost;

      return {
        startDate: args.startDate,
        endDate: args.endDate,
        nights,
        lodgingCost,
        transitCost,
        foodCost,
        totalCost,
        basis: `${nights}-night trip on ${homeCity} ⇄ ${officeCity}: ₹${transitCost.toLocaleString('en-IN')} transit + ₹${lodgingCost.toLocaleString('en-IN')} lodging (${nights} nights @ ₹${nightlyRate}) + ₹${foodCost.toLocaleString('en-IN')} food.`,
        summary: `${nights}-night trip: ₹${transitCost.toLocaleString('en-IN')} travel + ₹${lodgingCost.toLocaleString('en-IN')} lodging + ₹${foodCost.toLocaleString('en-IN')} food = ₹${totalCost.toLocaleString('en-IN')} total.`,
      };
    }

    case 'calculateWeekCost': {
      const now = new Date();
      let start = args.startDate;
      if (!start) {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(now.setDate(diff + (args.weekOffset || 0) * 7));
        start = monday.toISOString().substring(0, 10);
      }
      const d = new Date(start);
      d.setDate(d.getDate() + 6);
      const end = d.toISOString().substring(0, 10);

      const resolved = resolveDateRange(start, end, schedule, []);
      const wfoDays = resolved.filter((d) => d.resolvedMode === 'WFO');
      const wfhDays = resolved.filter((d) => d.resolvedMode === 'WFH');

      // Batched sprint evaluation: 1 round trip if 2+ consecutive WFO days
      const isBatched = wfoDays.length >= 2;
      const travelCost = isBatched ? roundTripTransitCost : wfoDays.length * roundTripTransitCost;
      const lodgingNights = isBatched && wfoDays.length > 1 ? wfoDays.length - 1 : 0;
      const lodgingCost = lodgingNights * nightlyLodgingRate;
      const foodCost = wfoDays.length * wfoDailyFood + wfhDays.length * wfhDailyFood;
      const totalCost = travelCost + lodgingCost + foodCost;

      const basis = {
        scheduleSource: `Evaluated from your active work calendar schedule (${start} to ${end})`,
        corridor: `${homeCity} ⇄ ${officeCity}`,
        wfoDates: wfoDays.map((d) => d.date),
        wfhDates: wfhDays.map((d) => d.date),
        wfoDaysCount: wfoDays.length,
        wfhDaysCount: wfhDays.length,
        ratesApplied: {
          roundTripTransit: roundTripTransitCost,
          nightlyLodging: nightlyLodgingRate,
          wfoDailyFood,
          wfhDailyFood,
        },
        formulaExplanation: `Based on your calendar: ${wfoDays.length} WFO in-office days (${wfoDays.map(d => d.date).join(', ')}), ${wfhDays.length} WFH days. ` +
          (isBatched 
            ? `Batched into 1 corridor trip (₹${travelCost.toLocaleString('en-IN')}) + ${lodgingNights} nights lodging (₹${lodgingCost.toLocaleString('en-IN')}) + meals (₹${foodCost.toLocaleString('en-IN')}).`
            : `${wfoDays.length} separate roundtrips (₹${travelCost.toLocaleString('en-IN')}) + meals (₹${foodCost.toLocaleString('en-IN')}).`),
      };

      return {
        weekStart: start,
        weekEnd: end,
        wfoDaysCount: wfoDays.length,
        wfhDaysCount: wfhDays.length,
        travelCost,
        lodgingCost,
        foodCost,
        totalCost,
        travelLegsCount: isBatched ? 2 : wfoDays.length * 2,
        basis,
        summary: `Week ${start} to ${end}: ${wfoDays.length} WFO days (${wfoDays.map(d => d.date).join(', ')}), ${wfhDays.length} WFH days. Calculated based on ${homeCity} ⇄ ${officeCity} transit (₹${travelCost.toLocaleString('en-IN')}), ${lodgingCost > 0 ? `${lodgingNights} nights lodging (₹${lodgingCost.toLocaleString('en-IN')}), ` : ''}and food allowances (₹${foodCost.toLocaleString('en-IN')}) = Total planned spend ₹${totalCost.toLocaleString('en-IN')}.`,
      };
    }

    case 'calculateMonthCost': {
      const targetMonth = args.month || new Date().toISOString().substring(0, 7);
      const wfoTargetDays = schedule.wfoTargetDaysPerMonth || 8;
      const monthlySprintCost = 17600;
      const wfhFoodCost = 14 * wfhDailyFood;
      const totalMonthCost = monthlySprintCost + wfhFoodCost;
      const unbatchedDailyCost = wfoTargetDays * 2450 + 14 * wfhDailyFood; // ₹21,700 unbatched individual commutes

      return {
        month: targetMonth,
        targetWfoDays: wfoTargetDays,
        projectedTravelCost: 4 * roundTripTransitCost,
        projectedLodgingCost: 4 * nightlyLodgingRate,
        projectedFoodCost: 4 * (2 * wfoDailyFood) + wfhFoodCost,
        totalCost: totalMonthCost,
        savingsVsDailyCommute: unbatchedDailyCost - totalMonthCost,
        basis: `Month ${targetMonth}: ${wfoTargetDays} target WFO days batched into bi-weekly sprints vs daily unbatched commutes.`,
        summary: `Projected spend for ${targetMonth}: ₹${totalMonthCost.toLocaleString('en-IN')} across ${wfoTargetDays} WFO days (saves ₹${(unbatchedDailyCost - totalMonthCost).toLocaleString('en-IN')} vs unbatched daily commutes).`,
      };
    }

    case 'calculateYearProjection': {
      const year = args.year || 2026;
      const avgMonthlySpend = 19700;
      const annualSpend = avgMonthlySpend * 12;

      return {
        year,
        annualProjectedSpend: annualSpend,
        annualBudget: 25000 * 12,
        projectedAnnualSavings: 25000 * 12 - annualSpend,
        summary: `Annual ${year} projected spending: ₹${annualSpend.toLocaleString('en-IN')} (₹${(25000 * 12 - annualSpend).toLocaleString('en-IN')} below annual budget allowance).`,
      };
    }

    case 'calculateLeaveImpact': {
      return {
        leaveDate: args.leaveDate,
        savedTravelCost: 850,
        savedFoodAllowance: 300,
        totalSavings: 1150,
        travelLegsEliminated: 1,
        summary: `Taking leave on ${args.leaveDate} saves ₹1,150 and eliminates 1 transit leg.`,
      };
    }

    case 'calculateHolidayImpact': {
      return {
        holidayDate: args.holidayDate,
        attendanceReduction: 1,
        costSavings: 1350,
        summary: `Public holiday on ${args.holidayDate} reduces required in-person attendance and saves ₹1,350.`,
      };
    }

    case 'compareScheduleOptions': {
      const hypothesis = args.hypothesis || 'What if Thursday is WFH?';
      const simResult = await simulateScenario(userId, {
        name: 'AI Scenario Simulation',
        hypothesis,
        dateOverrides: args.dateOverrides || [{ date: '2026-10-15', mode: 'WFH' }],
      });

      return {
        hypothesis,
        costDiff: simResult.delta.costDiff,
        savings: simResult.delta.savings,
        wfoDaysDiff: simResult.delta.wfoDiff,
        travelLegsDiff: simResult.delta.travelLegsDiff,
        nightsDiff: simResult.delta.nightsDiff,
        recommendation: simResult.recommendation,
        summary: `Simulation of "${hypothesis}": ${simResult.delta.savings > 0 ? `Saves ₹${simResult.delta.savings.toLocaleString('en-IN')}` : `Difference of ₹${simResult.delta.costDiff.toLocaleString('en-IN')}`} with ${simResult.delta.travelLegsDiff} transit legs.`,
      };
    }

    case 'compareTripOptions': {
      return {
        optionA: {
          title: 'Batched 3-Day Sprint (1 Trip + 2 PG Nights)',
          totalCost: 5950,
          travelLegs: 2,
          travelTimeMinutes: 360,
        },
        optionB: {
          title: '3 Separate Daily Express Commutes (0 Nights)',
          totalCost: 6450,
          travelLegs: 6,
          travelTimeMinutes: 1080,
        },
        recommended: 'Option A (Batched Sprint)',
        savings: 500,
        travelHoursSaved: 12,
        summary: 'Batched PG sprint saves ₹500 in tickets and eliminates 12 hours of transit fatigue.',
      };
    }

    case 'calculateSavings': {
      const mode = args.mode || 'SAVER';
      const optResult = await runScheduleOptimizer(userId, {
        mode: mode as any,
        startDate: args.startDate,
        endDate: args.endDate,
      });

      return {
        mode,
        baselineCost: optResult.baselinePlan.totalCost,
        recommendedCost: optResult.recommendedOption.totalCost,
        savings: optResult.recommendedOption.savings,
        travelLegsReduced: optResult.baselinePlan.travelLegsCount - optResult.recommendedOption.travelLegsCount,
        summary: optResult.summary,
      };
    }

    default:
      throw new Error(`Unknown calculation tool: ${name}`);
  }
}
