import type { OptimizationMode, OptimizationConstraints } from './types';

export interface ScoreComponents {
  normalizedCostScore: number; // 0 to 100 (higher = cheaper)
  normalizedTravelScore: number; // 0 to 100 (higher = less travel fatigue)
  normalizedConvenienceScore: number; // 0 to 100 (higher = more convenient / contiguous)
  constraintPenalty: number; // 0 or negative penalty
  totalScore: number; // 0 to 100
}

/**
 * Computes deterministic composite score for a schedule candidate.
 * 
 * Formula:
 * totalScore = (wCost * normCost) + (wTravel * normTravel) + (wConvenience * normConvenience) - penalty
 */
export function calculateCandidateScore(params: {
  mode: OptimizationMode;
  totalCost: number;
  maxCostBaseline: number;
  travelTimeMinutes: number;
  travelLegsCount: number;
  wfoDaysCount: number;
  wfhDaysCount: number;
  nightsCount: number;
  isContiguousWFO: boolean;
  constraints?: OptimizationConstraints;
  hasOvernightStayPreference?: boolean;
}): ScoreComponents {
  const {
    mode = 'BALANCED',
    totalCost,
    maxCostBaseline,
    travelTimeMinutes,
    travelLegsCount,
    wfoDaysCount,
    nightsCount,
    isContiguousWFO,
    constraints = {},
  } = params;

  // 1. Normalized Cost Score (0 to 100): Lower cost gives higher score
  const benchmarkCost = Math.max(maxCostBaseline, totalCost, 1);
  const costRatio = Math.max(0, Math.min(1, totalCost / benchmarkCost));
  const normalizedCostScore = Math.round((1 - costRatio) * 100);

  // 2. Normalized Travel Burden Score (0 to 100): Lower travel time & fewer legs gives higher score
  // Assume 300 minutes travel & 6 legs is standard baseline
  const travelBurden = (travelTimeMinutes / 60) * 10 + travelLegsCount * 5;
  const normalizedTravelScore = Math.max(0, Math.min(100, Math.round(100 - travelBurden)));

  // 3. Normalized Convenience Score (0 to 100):
  // Rewards contiguous WFO days (avoids back-and-forth transit), reasonable night stays, and minimal transitions
  let convenienceScore = 70;
  if (isContiguousWFO) convenienceScore += 15; // +15 for grouped batching
  if (travelLegsCount <= 2 && wfoDaysCount >= 2) convenienceScore += 15; // +15 for efficient round-trip
  if (nightsCount > 3) convenienceScore -= 10; // -10 if away from home too long
  const normalizedConvenienceScore = Math.max(0, Math.min(100, convenienceScore));

  // 4. Constraint Penalties
  let constraintPenalty = 0;
  if (constraints.minWfoDays && wfoDaysCount < constraints.minWfoDays) {
    // Heavy penalty for failing minimum required office days
    constraintPenalty += (constraints.minWfoDays - wfoDaysCount) * 25;
  }
  if (constraints.maxTravelDays && travelLegsCount > constraints.maxTravelDays * 2) {
    constraintPenalty += 20;
  }

  // 5. Apply Mode Weights
  let costWeight = 0.4;
  let travelWeight = 0.3;
  let convenienceWeight = 0.3;

  switch (mode) {
    case 'SAVER':
      // 60% Cost, 25% Travel, 15% Convenience
      costWeight = 0.6;
      travelWeight = 0.25;
      convenienceWeight = 0.15;
      break;
    case 'COMFORT':
      // 20% Cost, 35% Travel, 45% Convenience
      costWeight = 0.2;
      travelWeight = 0.35;
      convenienceWeight = 0.45;
      break;
    case 'BALANCED':
    default:
      // 40% Cost, 30% Travel, 30% Convenience
      costWeight = 0.4;
      travelWeight = 0.3;
      convenienceWeight = 0.3;
      break;
  }

  const rawScore =
    costWeight * normalizedCostScore +
    travelWeight * normalizedTravelScore +
    convenienceWeight * normalizedConvenienceScore -
    constraintPenalty;

  const totalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    normalizedCostScore,
    normalizedTravelScore,
    normalizedConvenienceScore,
    constraintPenalty,
    totalScore,
  };
}
