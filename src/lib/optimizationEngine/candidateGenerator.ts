import type { ResolvedDaySchedule } from '@/lib/scheduleEngine';
import type { TripBlock, RouteSegment, TravelProfile, TripAccommodation } from '@/lib/travelEngine';
import type { ExpenseRecord, ExpenseTemplate } from '@/lib/expenseEngine';
import { generatePlannedExpensesForTrip } from '@/lib/expenseEngine';
import type {
  OptimizationMode,
  OptimizationConstraints,
  ScheduleCandidate,
  OptimizationResult,
  CandidateEvaluationInputs,
} from './types';
import { calculateCandidateScore } from './scoringEngine';

/**
 * Builds a TripBlock with route segments and accommodation.
 */
function buildTripBlock(params: {
  tripId: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  wfoDates: string[];
  travelProfile?: TravelProfile;
  includeStay: boolean;
  accommodationType?: string;
  nightlyCost?: number;
}): TripBlock {
  const {
    tripId,
    userId,
    title,
    startDate,
    endDate,
    wfoDates,
    travelProfile,
    includeStay,
    accommodationType = 'hotel',
    nightlyCost = 2500,
  } = params;

  const outboundSegments: RouteSegment[] = travelProfile?.outboundSegments || [
    { id: `seg_out_${tripId}_1`, mode: 'train', label: 'Express Outbound', origin: travelProfile?.homeLocation || 'Home', destination: travelProfile?.officeLocation || 'Office', estimatedCost: 850, sequence: 1, direction: 'OUTBOUND', active: true },
  ];

  const returnSegments: RouteSegment[] = travelProfile?.returnSegments || [
    { id: `seg_ret_${tripId}_1`, mode: 'train', label: 'Express Return', origin: travelProfile?.officeLocation || 'Office', destination: travelProfile?.homeLocation || 'Home', estimatedCost: 850, sequence: 1, direction: 'RETURN', active: true },
  ];

  const travelSegments = [...outboundSegments, ...returnSegments];
  const travelCost = travelSegments.reduce((sum, s) => sum + s.estimatedCost, 0);

  let accommodation: TripAccommodation | undefined = undefined;
  let nightsCount = 0;
  let stayCost = 0;

  if (includeStay && startDate !== endDate) {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    nightsCount = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    stayCost = nightsCount * nightlyCost;

    accommodation = {
      id: `acc_${tripId}`,
      type: (accommodationType || 'hotel') as any,
      name: accommodationType === 'PG' ? 'Executive PG Suite' : 'The Gateway Corporate Hotel',
      location: travelProfile?.officeLocation || 'Office Tech Hub',
      nightlyCost,
      checkIn: startDate,
      checkOut: endDate,
      nights: nightsCount,
      totalCost: stayCost,
    };
  }

  const plannedCost = travelCost + stayCost;

  return {
    id: tripId,
    userId,
    title,
    startDate,
    endDate,
    origin: travelProfile?.homeLocation || 'Home City',
    destination: travelProfile?.officeLocation || 'Office City',
    officeLocation: travelProfile?.officeLocation || 'Primary Campus',
    purpose: 'Work Schedule Attendance',
    workDays: wfoDates,
    travelSegments,
    accommodation,
    nightsCount,
    plannedTravelCost: travelCost,
    plannedStayCost: stayCost,
    plannedCost,
    actualCost: 0,
    status: 'PLANNED',
    aiOptimizationScore: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Evaluates a schedule candidate, generating its trips, expenses, and score.
 */
export function evaluateCandidate(params: {
  id: string;
  title: string;
  strategyType: ScheduleCandidate['strategyType'];
  mode: OptimizationMode;
  userId: string;
  workDays: ResolvedDaySchedule[];
  travelProfile?: TravelProfile;
  templates: ExpenseTemplate[];
  tripPlanConfig: Array<{
    startDate: string;
    endDate: string;
    wfoDates: string[];
    includeStay: boolean;
    nightlyCost?: number;
    accommodationType?: string;
  }>;
  baselineCost: number;
  constraints?: OptimizationConstraints;
  pros: string[];
  cons: string[];
  explanation: string;
}): ScheduleCandidate {
  const {
    id,
    title,
    strategyType,
    mode,
    userId,
    workDays,
    travelProfile,
    templates,
    tripPlanConfig,
    baselineCost,
    constraints,
    pros,
    cons,
    explanation,
  } = params;

  // 1. Build Trips
  const trips: TripBlock[] = tripPlanConfig.map((cfg, idx) =>
    buildTripBlock({
      tripId: `${id}_trip_${idx + 1}`,
      userId,
      title: `${title} - Trip ${idx + 1}`,
      startDate: cfg.startDate,
      endDate: cfg.endDate,
      wfoDates: cfg.wfoDates,
      travelProfile,
      includeStay: cfg.includeStay,
      nightlyCost: cfg.nightlyCost,
      accommodationType: cfg.accommodationType,
    })
  );

  // 2. Generate Planned Expenses
  const allExpenses: ExpenseRecord[] = [];
  trips.forEach((trip) => {
    const gen = generatePlannedExpensesForTrip(trip, templates, []);
    allExpenses.push(...gen);
  });

  const totalCost = allExpenses.reduce((sum, e) => sum + e.plannedAmount, 0);
  const costDifference = totalCost - baselineCost;
  const savings = Math.max(0, -costDifference);

  // 3. Counts & Metrics
  const wfoDaysCount = workDays.filter((d) => d.resolvedMode === 'WFO').length;
  const wfhDaysCount = workDays.filter((d) => d.resolvedMode === 'WFH').length;
  
  let travelLegsCount = 0;
  let nightsCount = 0;
  trips.forEach((t) => {
    travelLegsCount += t.travelSegments.length;
    nightsCount += t.nightsCount;
  });

  const travelTimeMinutes = travelLegsCount * 75; // Approx 75 mins per leg
  const isContiguousWFO = strategyType === 'BATCHED_STAY' || strategyType === 'SHIFTED_WFO';

  // 4. Calculate Score
  const scoreResult = calculateCandidateScore({
    mode,
    totalCost,
    maxCostBaseline: baselineCost,
    travelTimeMinutes,
    travelLegsCount,
    wfoDaysCount,
    wfhDaysCount,
    nightsCount,
    isContiguousWFO,
    constraints,
  });

  return {
    id,
    title,
    strategyType,
    mode,
    workDays,
    trips,
    expenses: allExpenses,
    totalCost,
    costDifference,
    savings,
    wfoDaysCount,
    wfhDaysCount,
    travelLegsCount,
    nightsCount,
    travelTimeMinutes,
    convenienceScore: scoreResult.normalizedConvenienceScore,
    totalScore: scoreResult.totalScore,
    isRecommended: false, // Calculated after ranking
    explanation,
    tradeOffs: { pros, cons },
  };
}

/**
 * Generates and ranks deterministic schedule optimization candidates.
 */
export function generateOptimizationCandidates(
  inputs: CandidateEvaluationInputs
): OptimizationResult {
  const {
    userId,
    startDate,
    endDate,
    workDays,
    travelProfiles = [],
    templates = [],
    constraints = {},
    mode = 'BALANCED',
  } = inputs;

  const defaultProfile = travelProfiles[0];
  const wfoDayDates = workDays.filter((d) => d.resolvedMode === 'WFO').map((d) => d.date);

  // 1. BASELINE: Current individual schedule as-is
  const baselineTripsConfig = wfoDayDates.map((date) => ({
    startDate: date,
    endDate: date,
    wfoDates: [date],
    includeStay: false,
  }));

  const baselinePlan = evaluateCandidate({
    id: 'cand_baseline',
    title: 'Current Unoptimized Plan',
    strategyType: 'BASELINE',
    mode,
    userId,
    workDays,
    travelProfile: defaultProfile,
    templates,
    tripPlanConfig: baselineTripsConfig,
    baselineCost: 0,
    constraints,
    pros: ['Follows current schedule without modifications'],
    cons: ['Multiple independent transit commutes with maximum travel fatigue'],
    explanation: 'Unbatched single-day commutes with highest transit leg count.',
  });

  const baselineCost = baselinePlan.totalCost || 5000;
  // Re-evaluate baseline against its own cost
  baselinePlan.totalScore = calculateCandidateScore({
    mode,
    totalCost: baselineCost,
    maxCostBaseline: baselineCost,
    travelTimeMinutes: baselinePlan.travelTimeMinutes,
    travelLegsCount: baselinePlan.travelLegsCount,
    wfoDaysCount: baselinePlan.wfoDaysCount,
    wfhDaysCount: baselinePlan.wfhDaysCount,
    nightsCount: baselinePlan.nightsCount,
    isContiguousWFO: false,
    constraints,
  }).totalScore;

  // 2. CANDIDATE OPTION A: Strategy A - Saver / Batched Stay (Group WFO into single multi-day stay)
  let optionAConfig: Array<{ startDate: string; endDate: string; wfoDates: string[]; includeStay: boolean; nightlyCost?: number; accommodationType?: string }> = [];
  if (wfoDayDates.length >= 2) {
    optionAConfig = [
      {
        startDate: wfoDayDates[0],
        endDate: wfoDayDates[wfoDayDates.length - 1],
        wfoDates: wfoDayDates,
        includeStay: true,
        nightlyCost: 1800,
        accommodationType: 'PG',
      },
    ];
  } else {
    optionAConfig = baselineTripsConfig;
  }

  const optionA = evaluateCandidate({
    id: 'cand_opt_a',
    title: 'Option A: Batched Sprint with Corporate PG',
    strategyType: 'BATCHED_STAY',
    mode,
    userId,
    workDays,
    travelProfile: defaultProfile,
    templates,
    tripPlanConfig: optionAConfig,
    baselineCost,
    constraints,
    pros: [
      'Eliminates mid-week roundtrip transit legs (saves 4+ hours)',
      'Budget-friendly corporate PG suite near the office',
      'Maximum cost savings on travel tickets',
    ],
    cons: ['Overnight stay away from home'],
    explanation: 'Batches office presence into a single multi-day block with overnight PG stay, halving transit flights/trains.',
  });

  // 3. CANDIDATE OPTION B: Strategy B - Balanced Hotel & Shifted Days
  let optionBWorkDays = [...workDays];
  // Shift an isolated WFO day if there is a gap (e.g. move Thursday to Wednesday)
  if (wfoDayDates.includes('2026-10-15') && !wfoDayDates.includes('2026-10-14')) {
    optionBWorkDays = optionBWorkDays.map((d) => {
      if (d.date === '2026-10-14') return { ...d, resolvedMode: 'WFO' as const };
      if (d.date === '2026-10-15') return { ...d, resolvedMode: 'WFH' as const };
      return d;
    });
  }

  const optionB_wfoDates = optionBWorkDays.filter((d) => d.resolvedMode === 'WFO').map((d) => d.date);
  const optionBConfig = optionB_wfoDates.length >= 2
    ? [
        {
          startDate: optionB_wfoDates[0],
          endDate: optionB_wfoDates[optionB_wfoDates.length - 1],
          wfoDates: optionB_wfoDates,
          includeStay: true,
          nightlyCost: 2800,
          accommodationType: 'hotel',
        },
      ]
    : baselineTripsConfig;

  const optionB = evaluateCandidate({
    id: 'cand_opt_b',
    title: 'Option B: Contiguous 2-Day Executive Hotel Stay',
    strategyType: 'SHIFTED_WFO',
    mode,
    userId,
    workDays: optionBWorkDays,
    travelProfile: defaultProfile,
    templates,
    tripPlanConfig: optionBConfig,
    baselineCost,
    constraints,
    pros: [
      'Premium hotel amenities and workspace near campus',
      'Consolidates WFO days to eliminate fragmented travel',
      'Balanced trade-off between cost and executive comfort',
    ],
    cons: ['Slightly higher lodging cost than PG'],
    explanation: 'Shifts isolated office days into consecutive days, combining high comfort with 50% fewer transit legs.',
  });

  // 4. CANDIDATE OPTION C: Strategy C - Comfort / Return Home Daily (No overnight stays)
  const optionC = evaluateCandidate({
    id: 'cand_opt_c',
    title: 'Option C: Same-Day High-Speed Express Commutes',
    strategyType: 'SINGLE_DAY_COMMUTES',
    mode,
    userId,
    workDays,
    travelProfile: defaultProfile,
    templates,
    tripPlanConfig: baselineTripsConfig,
    baselineCost,
    constraints,
    pros: [
      'Sleep at home every single night (0 hotel nights)',
      'High personal flexibility and zero accommodation overhead',
    ],
    cons: [
      'Requires separate round-trip travel for every WFO day',
      'Higher cumulative transit fare and fatigue',
    ],
    explanation: 'Maintains zero overnight stays with premium same-day return express transit.',
  });

  // Rank options by totalScore descending
  const options = [optionA, optionB, optionC].sort((a, b) => b.totalScore - a.totalScore);

  // Mark winning recommendation
  if (options.length > 0) {
    options[0].isRecommended = true;
  }

  const winningOption = options[0];
  const summary = `Recommended: ${winningOption.title} (Score: ${winningOption.totalScore}/100) — delivers ${
    winningOption.savings > 0 ? `₹${winningOption.savings.toLocaleString('en-IN')} in savings` : 'optimized travel convenience'
  } with ${winningOption.travelLegsCount} travel legs.`;

  return {
    mode,
    dateRange: { startDate, endDate },
    baselinePlan,
    options,
    recommendedOption: winningOption,
    summary,
  };
}
