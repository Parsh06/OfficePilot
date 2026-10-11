import type {
  ChangeSet,
  ProposedChangeItem,
  RiskLevel,
  AutonomySetting,
  EstimatedImpact,
} from '../types';

/**
 * Classifies the risk level for a proposed AI action.
 */
export function classifyActionRisk(params: {
  toolName: string;
  args: Record<string, any>;
  affectedDatesCount?: number;
  isHistorical?: boolean;
}): RiskLevel {
  const { toolName, args, affectedDatesCount = 1, isHistorical = false } = params;

  // 1. High Risk Operations (always require confirmation)
  if (
    toolName === 'deleteExpense' ||
    toolName === 'deleteTrip' ||
    toolName === 'removeScheduleException' ||
    isHistorical ||
    affectedDatesCount > 4 ||
    args.isBulk ||
    args.monthsCount > 1
  ) {
    return 'HIGH_RISK';
  }

  // 2. Low Risk Operations (safe to auto-execute under Balanced / Autonomous)
  if (
    toolName === 'saveUserAIMemory' ||
    toolName === 'saveDraftScenario' ||
    toolName === 'updatePreferences'
  ) {
    return 'LOW_RISK';
  }

  // 3. Medium Risk Operations (normal schedule, travel, lodging, or template updates)
  return 'MEDIUM_RISK';
}

/**
 * Determines whether a ChangeSet requires explicit user confirmation based on autonomy setting.
 */
export function doesRequireConfirmation(
  riskLevel: RiskLevel,
  autonomySetting: AutonomySetting = 'BALANCED'
): boolean {
  if (riskLevel === 'HIGH_RISK') {
    return true; // High risk always requires confirmation
  }

  if (autonomySetting === 'SUGGEST_ONLY') {
    return riskLevel !== 'LOW_RISK';
  }

  if (autonomySetting === 'MORE_AUTONOMOUS') {
    return false; // Low and Medium risk are auto-executed
  }

  // Default BALANCED: auto-executes LOW_RISK, asks for MEDIUM_RISK and HIGH_RISK
  return riskLevel !== 'LOW_RISK';
}

/**
 * Builds a structured ChangeSet with estimated impact and risk classification.
 */
export function buildChangeSet(params: {
  actionId?: string;
  userId: string;
  conversationId?: string;
  title: string;
  description: string;
  toolName: string;
  args: Record<string, any>;
  proposedChanges: ProposedChangeItem[];
  beforeState: Record<string, any>;
  afterState?: Record<string, any>;
  impact?: Partial<EstimatedImpact>;
  autonomySetting?: AutonomySetting;
}): ChangeSet {
  const {
    actionId = `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    conversationId,
    title,
    description,
    toolName,
    args,
    proposedChanges,
    beforeState,
    afterState,
    impact = {},
    autonomySetting = 'BALANCED',
  } = params;

  const affectedDates = impact.affectedDates || proposedChanges.map((c) => c.targetDate).filter(Boolean) as string[];
  const affectedDatesCount = impact.affectedDatesCount ?? (affectedDates.length || 1);

  const riskLevel = classifyActionRisk({
    toolName,
    args,
    affectedDatesCount,
    isHistorical: false,
  });

  const requiresConfirmation = doesRequireConfirmation(riskLevel, autonomySetting);

  const estimatedImpact: EstimatedImpact = {
    costDelta: impact.costDelta ?? (impact.savings ? -impact.savings : 0),
    savings: impact.savings ?? (impact.costDelta && impact.costDelta < 0 ? -impact.costDelta : 0),
    wfoDiff: impact.wfoDiff ?? 0,
    wfhDiff: impact.wfhDiff ?? 0,
    travelLegsDiff: impact.travelLegsDiff ?? 0,
    nightsDiff: impact.nightsDiff ?? 0,
    convenienceScoreDiff: impact.convenienceScoreDiff ?? 0,
    affectedDatesCount,
    affectedDates,
  };

  const now = new Date().toISOString();

  return {
    actionId,
    userId,
    conversationId,
    title,
    description,
    riskLevel,
    requiresConfirmation,
    affectedRecords: proposedChanges.map((c) => c.targetId || c.targetDate || c.entityType),
    proposedChanges,
    beforeState,
    afterState,
    estimatedImpact,
    status: requiresConfirmation ? 'awaiting_confirmation' : 'approved',
    createdAt: now,
    updatedAt: now,
  };
}
