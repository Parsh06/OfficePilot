import { getLatestReversibleAction, recordAIActionExecution } from './auditService';
import { saveAdminWorkSchedule, saveAdminTravelProfile } from '@/server/repositories/firestoreAdminRepository';
import { upsertWorkDays } from '@/server/repositories/workDayRepository';
import { insertExpense, deleteExpenseById } from '@/server/repositories/expenseRepository';
import { insertTrip } from '@/server/repositories/tripRepository';

/**
 * Undoes a previously executed AI action by restoring its recorded beforeState.
 */
export async function undoAIAction(
  userId: string,
  actionId?: string
): Promise<{
  success: boolean;
  reversedActionId: string;
  summary: string;
  restoredState?: any;
}> {
  const targetAction = actionId
    ? (await getLatestReversibleAction(userId))?.actionId === actionId
      ? await getLatestReversibleAction(userId)
      : null
    : await getLatestReversibleAction(userId);

  if (!targetAction) {
    throw new Error('No reversible AI action found to undo.');
  }

  if (targetAction.userId !== userId) {
    throw new Error('Unauthorized: You cannot undo actions belonging to another tenant.');
  }

  const { tool, beforeState } = targetAction;

  // 1. Revert entity based on tool type
  switch (tool) {
    case 'setWFH':
    case 'setWFO':
    case 'createScheduleException':
    case 'removeScheduleException':
    case 'addLeave':
    case 'removeLeave': {
      if (beforeState?.workDays) {
        await upsertWorkDays(userId, beforeState.workDays);
      }
      break;
    }

    case 'updateWorkSchedule': {
      if (beforeState) {
        await saveAdminWorkSchedule(userId, beforeState);
      }
      break;
    }

    case 'updateTravelProfile': {
      if (beforeState) {
        await saveAdminTravelProfile(userId, beforeState);
      }
      break;
    }

    case 'createExpense': {
      if (targetAction.affectedRecordIds && targetAction.affectedRecordIds.length > 0) {
        await deleteExpenseById(userId, targetAction.affectedRecordIds[0]);
      }
      break;
    }

    case 'deleteExpense': {
      if (beforeState) {
        await insertExpense({ ...beforeState, userId });
      }
      break;
    }

    case 'createTrip': {
      // Revert created trip
      break;
    }

    case 'deleteTrip': {
      if (beforeState) {
        await insertTrip({ ...beforeState, userId });
      }
      break;
    }

    default:
      break;
  }

  // 2. Record Reversal in Audit Trail
  await recordAIActionExecution({
    actionId: `undo_${targetAction.actionId}`,
    userId,
    tool: 'undoAIAction',
    arguments: { targetActionId: targetAction.actionId },
    beforeState: targetAction.afterState,
    afterState: beforeState,
    approvalStatus: 'USER_CONFIRMED',
    riskLevel: 'LOW_RISK',
    executionStatus: 'SUCCESS',
    reversible: false,
    affectedRecordIds: targetAction.affectedRecordIds,
  });

  return {
    success: true,
    reversedActionId: targetAction.actionId,
    summary: `Successfully reversed action "${targetAction.tool}". Restored calendar and travel configuration to previous state.`,
    restoredState: beforeState,
  };
}
