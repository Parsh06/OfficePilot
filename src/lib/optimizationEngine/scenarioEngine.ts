import type { ResolvedDaySchedule } from '@/lib/scheduleEngine';
import type { TravelProfile } from '@/lib/travelEngine';
import type { ExpenseTemplate } from '@/lib/expenseEngine';
import type {
  ScenarioSimulationRequest,
  ScenarioSimulationResult,
} from './types';
import { evaluateCandidate } from './candidateGenerator';

/**
 * Standard What-If simulation presets.
 */
export const WHAT_IF_PRESETS: Array<{
  id: string;
  name: string;
  hypothesis: string;
  description: string;
  request: ScenarioSimulationRequest;
}> = [
  {
    id: 'sim_wfh_thursday',
    name: 'Thursday Remote Shift',
    hypothesis: 'What if Thursday is WFH?',
    description: 'Converts Thursday office attendance to work-from-home, avoiding mid-week travel.',
    request: {
      name: 'Thursday Remote Shift',
      hypothesis: 'What if Thursday is WFH?',
      dateOverrides: [{ date: '2026-10-15', mode: 'WFH', reason: 'Remote work simulation' }],
    },
  },
  {
    id: 'sim_holiday_wednesday',
    name: 'Mid-Week Holiday Simulation',
    hypothesis: 'What if Wednesday is a holiday?',
    description: 'Models a public holiday on Wednesday between Tuesday and Thursday WFO days.',
    request: {
      name: 'Mid-Week Holiday Simulation',
      hypothesis: 'What if Wednesday is a holiday?',
      dateOverrides: [{ date: '2026-10-14', mode: 'HOLIDAY', reason: 'Public Holiday Simulation' }],
    },
  },
  {
    id: 'sim_leave_thursday',
    name: 'Thursday Planned Leave',
    hypothesis: 'What if I take Thursday leave?',
    description: 'Applies personal leave on Thursday, shortening the office attendance requirement.',
    request: {
      name: 'Thursday Planned Leave',
      hypothesis: 'What if I take Thursday leave?',
      dateOverrides: [{ date: '2026-10-15', mode: 'LEAVE', reason: 'Personal Time Off' }],
    },
  },
  {
    id: 'sim_move_tue_to_fri',
    name: 'Shift Tuesday to Friday',
    hypothesis: 'What if I move Tuesday WFO to Friday?',
    description: 'Shifts Tuesday office presence to Friday to create a contiguous weekend bridge.',
    request: {
      name: 'Shift Tuesday to Friday',
      hypothesis: 'What if I move Tuesday WFO to Friday?',
      dateOverrides: [
        { date: '2026-10-13', mode: 'WFH', reason: 'Shifted to Friday' },
        { date: '2026-10-16', mode: 'WFO', reason: 'Shifted from Tuesday' },
      ],
    },
  },
  {
    id: 'sim_return_home_tue',
    name: 'Same-Day Return (No Stay)',
    hypothesis: 'What if I return home Tuesday instead of staying?',
    description: 'Eliminates hotel/PG stay on Tuesday by commuting back home on the evening express.',
    request: {
      name: 'Same-Day Return (No Stay)',
      hypothesis: 'What if I return home Tuesday instead of staying?',
      dateOverrides: [],
      stayOverride: 'RETURN_HOME',
    },
  },
];

/**
 * Deterministically simulates a What-If scenario against the current plan.
 * Pure read-only simulation — NEVER mutates user database records.
 */
export function simulateWhatIfScenario(params: {
  request: ScenarioSimulationRequest;
  userId: string;
  currentWorkDays: ResolvedDaySchedule[];
  travelProfiles: TravelProfile[];
  templates: ExpenseTemplate[];
}): ScenarioSimulationResult {
  const { request, userId, currentWorkDays, travelProfiles, templates } = params;
  const defaultProfile = travelProfiles[0];

  // 1. Current Baseline Plan
  const currentWfoDates = currentWorkDays
    .filter((d) => d.resolvedMode === 'WFO')
    .map((d) => d.date);

  const currentTripsConfig = currentWfoDates.map((date) => ({
    startDate: date,
    endDate: date,
    wfoDates: [date],
    includeStay: false,
  }));

  const currentPlan = evaluateCandidate({
    id: 'curr_plan',
    title: 'Current Active Schedule',
    strategyType: 'BASELINE',
    mode: 'BALANCED',
    userId,
    workDays: currentWorkDays,
    travelProfile: defaultProfile,
    templates,
    tripPlanConfig: currentTripsConfig,
    baselineCost: 0,
    pros: ['Current approved work schedule'],
    cons: [],
    explanation: 'Current baseline plan as logged.',
  });

  const baselineCost = currentPlan.totalCost;

  // 2. Proposed Plan with Date Overrides & Stay Options Applied
  const overrideMap = new Map(request.dateOverrides.map((o) => [o.date, o]));
  const proposedWorkDays: ResolvedDaySchedule[] = currentWorkDays.map((d) => {
    const override = overrideMap.get(d.date);
    if (override) {
      return {
        ...d,
        resolvedMode: override.mode as any,
        finalMode: override.mode as any,
        isOverridden: true,
      };
    }
    return d;
  });

  const proposedWfoDates = proposedWorkDays
    .filter((d) => d.resolvedMode === 'WFO')
    .map((d) => d.date);

  let proposedTripsConfig: Array<{ startDate: string; endDate: string; wfoDates: string[]; includeStay: boolean; nightlyCost?: number; accommodationType?: string }> = [];

  if (request.stayOverride === 'RETURN_HOME') {
    // Force same-day commutes
    proposedTripsConfig = proposedWfoDates.map((date) => ({
      startDate: date,
      endDate: date,
      wfoDates: [date],
      includeStay: false,
    }));
  } else if (proposedWfoDates.length >= 2) {
    // Group contiguous block
    proposedTripsConfig = [
      {
        startDate: proposedWfoDates[0],
        endDate: proposedWfoDates[proposedWfoDates.length - 1],
        wfoDates: proposedWfoDates,
        includeStay: true,
        nightlyCost: 2500,
        accommodationType: 'hotel',
      },
    ];
  } else {
    proposedTripsConfig = proposedWfoDates.map((date) => ({
      startDate: date,
      endDate: date,
      wfoDates: [date],
      includeStay: false,
    }));
  }

  const proposedPlan = evaluateCandidate({
    id: `sim_prop_${Date.now().toString(36)}`,
    title: `Simulated: ${request.name}`,
    strategyType: request.stayOverride === 'RETURN_HOME' ? 'SINGLE_DAY_COMMUTES' : 'SHIFTED_WFO',
    mode: 'BALANCED',
    userId,
    workDays: proposedWorkDays,
    travelProfile: defaultProfile,
    templates,
    tripPlanConfig: proposedTripsConfig,
    baselineCost,
    pros: ['Evaluated with deterministic pricing'],
    cons: [],
    explanation: `Simulation of hypothesis: "${request.hypothesis}"`,
  });

  // 3. Compute Exact Deltas
  const costDiff = proposedPlan.totalCost - currentPlan.totalCost;
  const savings = Math.max(0, -costDiff);
  const wfoDiff = proposedPlan.wfoDaysCount - currentPlan.wfoDaysCount;
  const wfhDiff = proposedPlan.wfhDaysCount - currentPlan.wfhDaysCount;
  const travelLegsDiff = proposedPlan.travelLegsCount - currentPlan.travelLegsCount;
  const nightsDiff = proposedPlan.nightsCount - currentPlan.nightsCount;
  const travelTimeDiffMinutes = proposedPlan.travelTimeMinutes - currentPlan.travelTimeMinutes;
  const convenienceScoreDiff = proposedPlan.convenienceScore - currentPlan.convenienceScore;

  const affectedDates = request.dateOverrides.map((o) => o.date);
  const affectedTrips = proposedPlan.trips.map((t) => t.id);

  // 4. Category breakdown differences
  const currentCatTotals: Record<string, number> = {};
  currentPlan.expenses.forEach((e) => {
    currentCatTotals[e.category] = (currentCatTotals[e.category] || 0) + e.plannedAmount;
  });

  const proposedCatTotals: Record<string, number> = {};
  proposedPlan.expenses.forEach((e) => {
    proposedCatTotals[e.category] = (proposedCatTotals[e.category] || 0) + e.plannedAmount;
  });

  const allCategories = Array.from(
    new Set([...Object.keys(currentCatTotals), ...Object.keys(proposedCatTotals)])
  );

  const affectedExpenseCategories: Record<string, { current: number; proposed: number; diff: number }> = {};
  allCategories.forEach((cat) => {
    const cur = currentCatTotals[cat] || 0;
    const prop = proposedCatTotals[cat] || 0;
    affectedExpenseCategories[cat] = {
      current: cur,
      proposed: prop,
      diff: prop - cur,
    };
  });

  // 5. Deterministic Recommendation Summary
  let recommendation = '';
  if (savings > 0 && convenienceScoreDiff >= 0) {
    recommendation = `Highly Recommended: Saves ₹${savings.toLocaleString('en-IN')} with improved travel convenience.`;
  } else if (savings > 0) {
    recommendation = `Cost Saver: Saves ₹${savings.toLocaleString('en-IN')}, with ${Math.abs(travelLegsDiff)} fewer travel legs.`;
  } else if (costDiff > 0 && convenienceScoreDiff > 10) {
    recommendation = `Comfort Upgrade: ₹${costDiff.toLocaleString('en-IN')} additional cost for significant convenience improvement.`;
  } else {
    recommendation = `Neutral: Difference of ${costDiff === 0 ? '₹0' : `₹${Math.abs(costDiff).toLocaleString('en-IN')}`} vs current plan.`;
  }

  return {
    id: request.id || `sim_res_${Date.now().toString(36)}`,
    name: request.name,
    hypothesis: request.hypothesis,
    currentPlan,
    proposedPlan,
    delta: {
      costDiff,
      savings,
      wfoDiff,
      wfhDiff,
      travelLegsDiff,
      nightsDiff,
      travelTimeDiffMinutes,
      convenienceScoreDiff,
    },
    affectedDates,
    affectedTrips,
    affectedExpenseCategories,
    recommendation,
  };
}
