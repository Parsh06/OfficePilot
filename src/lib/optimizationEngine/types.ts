import type { ResolvedDaySchedule, ScheduleException } from '@/lib/scheduleEngine';
import type { TripBlock, TravelProfile } from '@/lib/travelEngine';
import type { ExpenseRecord, ExpenseTemplate } from '@/lib/expenseEngine';

export type OptimizationMode = 'SAVER' | 'BALANCED' | 'COMFORT';

export type CandidateStrategyType =
  | 'BATCHED_STAY'
  | 'SINGLE_DAY_COMMUTES'
  | 'SHIFTED_WFO'
  | 'HYBRID_OPTIMAL'
  | 'BASELINE';

export interface ScheduleCandidate {
  id: string;
  title: string;
  strategyType: CandidateStrategyType;
  mode: OptimizationMode;
  workDays: ResolvedDaySchedule[];
  trips: TripBlock[];
  expenses: ExpenseRecord[];
  totalCost: number;
  costDifference: number; // vs baseline (negative = savings)
  savings: number; // positive amount saved
  wfoDaysCount: number;
  wfhDaysCount: number;
  travelLegsCount: number;
  nightsCount: number;
  travelTimeMinutes: number;
  convenienceScore: number; // 0 to 100
  totalScore: number; // composite weighted score (0 to 100)
  isRecommended: boolean;
  explanation: string;
  tradeOffs: {
    pros: string[];
    cons: string[];
  };
}

export interface OptimizationConstraints {
  minWfoDays?: number;
  maxTravelDays?: number;
  fixedDates?: string[]; // Dates user refuses to alter
  allowOvernightStay?: boolean;
  maxBudget?: number;
  preferredAccommodationType?: string;
  preferredTravelMode?: string;
}

export interface OptimizationResult {
  mode: OptimizationMode;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  baselinePlan: ScheduleCandidate;
  options: ScheduleCandidate[]; // Ranked Option A, Option B, Option C
  recommendedOption: ScheduleCandidate;
  summary: string;
}

export interface ScenarioSimulationRequest {
  id?: string;
  name: string;
  hypothesis: string;
  dateOverrides: Array<{
    date: string;
    mode: 'WFO' | 'WFH' | 'HOLIDAY' | 'LEAVE';
    reason?: string;
  }>;
  stayOverride?: 'RETURN_HOME' | 'STAY_OVERNIGHT' | 'AUTO';
  travelProfileId?: string;
}

export interface ScenarioSimulationResult {
  id: string;
  name: string;
  hypothesis: string;
  currentPlan: ScheduleCandidate;
  proposedPlan: ScheduleCandidate;
  delta: {
    costDiff: number; // proposed - current (negative = savings)
    savings: number;
    wfoDiff: number;
    wfhDiff: number;
    travelLegsDiff: number;
    nightsDiff: number;
    travelTimeDiffMinutes: number;
    convenienceScoreDiff: number;
  };
  affectedDates: string[];
  affectedTrips: string[];
  affectedExpenseCategories: Record<string, { current: number; proposed: number; diff: number }>;
  recommendation: string;
}

export interface CandidateEvaluationInputs {
  userId: string;
  startDate: string;
  endDate: string;
  workDays: ResolvedDaySchedule[];
  exceptions: ScheduleException[];
  travelProfiles: TravelProfile[];
  templates: ExpenseTemplate[];
  existingExpenses?: ExpenseRecord[];
  constraints?: OptimizationConstraints;
  mode?: OptimizationMode;
}
