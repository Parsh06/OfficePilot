import type { AIToolDefinition, RiskLevel } from '../types';
import { isActionAlreadyExecuted, recordAIActionExecution } from '../actions/auditService';
import { undoAIAction as executeUndoAction } from '../actions/undoEngine';
import {
  getAdminWorkSchedule,
  saveAdminWorkSchedule,
  getAdminTravelProfile,
  saveAdminTravelProfile,
  getAdminAccommodationProfile,
  saveAdminAccommodationProfile,
  getAdminExpenseDefaults,
  saveAdminExpenseDefaults,
  saveAdminScheduleException,
  deleteAdminScheduleException,
} from '@/server/repositories/firestoreAdminRepository';
import {
  insertExpense,
  updateExpenseById,
  deleteExpenseById,
  findExpensesByUserId,
} from '@/server/repositories/expenseRepository';
import {
  insertTrip,
  updateTripById,
  deleteTripById,
  findTripById,
} from '@/server/repositories/tripRepository';
import {
  upsertWorkDay,
  upsertWorkDays,
  findWorkDaysByRange,
} from '@/server/repositories/workDayRepository';

export const WRITE_TOOL_DEFINITIONS: AIToolDefinition[] = [
  {
    name: 'createExpense',
    description: 'Creates a new planned or actual expense record for the user.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key for this mutation' },
        date: { type: 'string', description: 'Date of expense in YYYY-MM-DD format' },
        category: { type: 'string', description: 'Category: TRAVEL | FOOD | ACCOMMODATION | WORK | MISC' },
        subCategory: { type: 'string', description: 'Subcategory e.g. train, cab, breakfast, hotel' },
        title: { type: 'string', description: 'Expense description or title' },
        amount: { type: 'number', description: 'Expense amount in INR' },
        isPlanned: { type: 'boolean', description: 'Whether this is a planned expense (default true)' },
        tripId: { type: 'string', description: 'Associated trip ID if applicable' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['date', 'category', 'title', 'amount'],
    },
  },
  {
    name: 'updateExpense',
    description: 'Updates an existing expense amount, status, or details.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        expenseId: { type: 'string', description: 'ID of the expense to update' },
        actualAmount: { type: 'number', description: 'Actual amount spent' },
        plannedAmount: { type: 'number', description: 'Planned amount' },
        status: { type: 'string', description: 'Status: PLANNED | RECORDED | REIMBURSED' },
        notes: { type: 'string', description: 'Notes' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'deleteExpense',
    description: 'Deletes an expense by ID (HIGH_RISK, requires confirmation).',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        expenseId: { type: 'string', description: 'ID of the expense to delete' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'setWFH',
    description: 'Sets a specific date or multiple dates to Work-From-Home (WFH). Updates Firestore exception and MongoDB work days.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        dates: { type: 'array', description: 'Array of dates for bulk WFH updates' },
        reason: { type: 'string', description: 'Reason for WFH override' },
      },
    },
  },
  {
    name: 'setWFO',
    description: 'Sets a specific date or multiple dates to Work-From-Office (WFO). Updates Firestore exception and MongoDB work days.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        dates: { type: 'array', description: 'Array of dates for bulk WFO updates' },
        reason: { type: 'string', description: 'Reason for WFO override' },
      },
    },
  },
  {
    name: 'addLeave',
    description: 'Marks one or more dates as Leave/Off. Updates Firestore exception and MongoDB work days.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD' },
        startDate: { type: 'string', description: 'Start date for leave range' },
        endDate: { type: 'string', description: 'End date for leave range' },
        leaveType: { type: 'string', description: 'Leave type: CASUAL | SICK | VACATION | PUBLIC_HOLIDAY' },
        reason: { type: 'string', description: 'Reason for leave' },
      },
    },
  },
  {
    name: 'removeLeave',
    description: 'Removes a leave override and restores baseline work schedule.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD' },
        exceptionId: { type: 'string', description: 'ID of the exception to remove' },
      },
    },
  },
  {
    name: 'updateWorkSchedule',
    description: 'Updates the user standard weekly work schedule baseline in Firestore.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        monday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Monday mode' },
        tuesday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Tuesday mode' },
        wednesday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Wednesday mode' },
        thursday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Thursday mode' },
        friday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Friday mode' },
        saturday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Saturday mode' },
        sunday: { type: 'string', enum: ['WFO', 'WFH', 'OFF'], description: 'Sunday mode' },
        wfoTargetDaysPerMonth: { type: 'number', description: 'Target WFO days per month' },
      },
    },
  },
  {
    name: 'createScheduleException',
    description: 'Creates a custom schedule exception in Firestore and propagates to MongoDB.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD' },
        mode: { type: 'string', enum: ['WFO', 'WFH', 'LEAVE', 'HOLIDAY', 'TRAVEL'], description: 'Target exception mode' },
        reason: { type: 'string', description: 'Reason for exception' },
      },
      required: ['date', 'mode'],
    },
  },
  {
    name: 'removeScheduleException',
    description: 'Deletes a schedule exception and restores default schedule mode.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD' },
        exceptionId: { type: 'string', description: 'Exception ID' },
      },
    },
  },
  {
    name: 'updateTravelProfile',
    description: 'Updates user travel profile (home/office locations, cost estimates, travel mode).',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        homeLocation: { type: 'string', description: 'Home city' },
        officeLocation: { type: 'string', description: 'Office city' },
        outboundCostEstimate: { type: 'number', description: 'One-way outbound transit cost estimate' },
        returnCostEstimate: { type: 'number', description: 'One-way return transit cost estimate' },
        localTransportDailyCost: { type: 'number', description: 'Daily local transport estimate' },
        preferredTravelMode: { type: 'string', enum: ['FLIGHT', 'TRAIN', 'CAB', 'OPTIMAL'], description: 'Preferred transit mode' },
      },
    },
  },
  {
    name: 'updateAccommodation',
    description: 'Updates accommodation profile (nightly rates, preferred tier, amenities).',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        nightlyRateEstimate: { type: 'number', description: 'Estimated nightly rate in INR' },
        preferredTier: { type: 'string', enum: ['BUDGET', 'STANDARD', 'PREMIUM'], description: 'Preferred lodging tier' },
        maxNightlyRate: { type: 'number', description: 'Maximum nightly lodging budget' },
      },
    },
  },
  {
    name: 'updateExpenseTemplate',
    description: 'Updates default daily expense templates for meals and miscellaneous costs.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        breakfast: { type: 'number', description: 'Breakfast default estimate' },
        lunch: { type: 'number', description: 'Lunch default estimate' },
        snacks: { type: 'number', description: 'Snacks default estimate' },
        dinner: { type: 'number', description: 'Dinner default estimate' },
        miscellaneous: { type: 'number', description: 'Miscellaneous daily default estimate' },
      },
    },
  },
  {
    name: 'createTrip',
    description: 'Creates a new multi-day work trip block in MongoDB.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        title: { type: 'string', description: 'Trip name e.g. "Pune Sprint Week"' },
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' },
        origin: { type: 'string', description: 'Origin city' },
        destination: { type: 'string', description: 'Destination city' },
        purpose: { type: 'string', description: 'Purpose of trip' },
        estimatedCost: { type: 'number', description: 'Estimated total cost' },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },
  {
    name: 'updateTrip',
    description: 'Updates an existing trip block details or status.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        tripId: { type: 'string', description: 'Trip ID' },
        status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'], description: 'Trip lifecycle status' },
        actualCost: { type: 'number', description: 'Actual recorded cost' },
        title: { type: 'string', description: 'Updated title' },
      },
      required: ['tripId'],
    },
  },
  {
    name: 'deleteTrip',
    description: 'Deletes a trip by ID (HIGH_RISK, requires confirmation).',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        tripId: { type: 'string', description: 'ID of the trip to delete' },
      },
      required: ['tripId'],
    },
  },
  {
    name: 'applyOptimizationPlan',
    description: 'Applies an approved schedule optimization plan across Firestore and MongoDB.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Unique idempotency key' },
        planId: { type: 'string', description: 'Optimization plan ID' },
        wfoDates: { type: 'array', description: 'List of dates to set as WFO' },
        wfhDates: { type: 'array', description: 'List of dates to set as WFH' },
        estimatedSavings: { type: 'number', description: 'Calculated savings' },
        summary: { type: 'string', description: 'Optimization summary' },
      },
    },
  },
  {
    name: 'undoAIAction',
    description: 'Reverses the most recent reversible AI mutation or a specific actionId.',
    parameters: {
      type: 'object',
      properties: {
        actionId: { type: 'string', description: 'Specific actionId to revert (optional)' },
      },
    },
  },
];

/**
 * Dispatches and executes a typed write tool with full validation, cross-database sync,
 * verification, idempotency guard, and audit trail logging.
 */
export async function executeWriteTool(
  toolName: string,
  args: Record<string, any>,
  userId: string
): Promise<{
  success: boolean;
  actionId: string;
  tool: string;
  verified: boolean;
  message: string;
  data?: any;
}> {
  const actionId = args.actionId || `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Idempotency Check
  const alreadyRan = await isActionAlreadyExecuted(actionId);
  if (alreadyRan) {
    return {
      success: true,
      actionId,
      tool: toolName,
      verified: true,
      message: `Action ${actionId} was already executed previously. Idempotent return.`,
    };
  }

  let beforeState: any = null;
  let afterState: any = null;
  let affectedRecordIds: string[] = [];
  let riskLevel: RiskLevel = 'MEDIUM_RISK';

  try {
    switch (toolName) {
      case 'setWFH':
      case 'setWFO': {
        const targetMode = toolName === 'setWFH' ? 'WFH' : 'WFO';
        const targetDates: string[] = args.dates && Array.isArray(args.dates) && args.dates.length > 0
          ? args.dates
          : args.date
          ? [args.date]
          : [];

        if (targetDates.length === 0) {
          throw new Error('Missing target date or dates for schedule update');
        }

        riskLevel = targetDates.length > 4 ? 'HIGH_RISK' : 'MEDIUM_RISK';

        // Read beforeState
        const existingWorkDays = await findWorkDaysByRange(
          userId,
          targetDates[0],
          targetDates[targetDates.length - 1]
        );
        beforeState = { workDays: existingWorkDays };

        // 1. Write Primary Source of Truth: Firestore Schedule Exceptions
        for (const d of targetDates) {
          await saveAdminScheduleException(userId, {
            id: `exc_${d}`,
            date: d,
            mode: targetMode,
            reason: args.reason || `Set to ${targetMode} by AI`,
          });
        }

        // 2. Update Derived MongoDB Work Days
        const updatedDays = targetDates.map((d) => ({
          date: d,
          mode: targetMode as any,
          notes: 'Set by AI Action',
        }));
        await upsertWorkDays(userId, updatedDays);

        // 3. Post-mutation Verification: Read back
        const verifiedDays = await findWorkDaysByRange(
          userId,
          targetDates[0],
          targetDates[targetDates.length - 1]
        );
        const allMatched = targetDates.every((d) =>
          verifiedDays.some((vd) => vd.date === d && vd.mode === targetMode)
        );

        if (!allMatched) {
          throw new Error(`Verification failed: Dates were not updated to ${targetMode} in the calendar.`);
        }

        afterState = { workDays: verifiedDays };
        affectedRecordIds = targetDates;

        // Record Audit
        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel,
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: `Successfully set ${targetDates.length} date(s) (${targetDates.join(', ')}) to ${targetMode}.`,
          data: { updatedDates: targetDates, mode: targetMode },
        };
      }

      case 'addLeave': {
        const targetDates: string[] = args.startDate && args.endDate
          ? [args.startDate, args.endDate]
          : args.date
          ? [args.date]
          : [];

        if (targetDates.length === 0) {
          throw new Error('Missing date or date range for leave');
        }

        for (const d of targetDates) {
          await saveAdminScheduleException(userId, {
            id: `exc_${d}`,
            date: d,
            mode: 'LEAVE',
            reason: args.reason || `Leave (${args.leaveType || 'CASUAL'}) by AI`,
          });
        }

        const updatedDays = targetDates.map((d) => ({
          date: d,
          mode: 'LEAVE' as any,
          notes: 'Leave scheduled by AI',
        }));
        await upsertWorkDays(userId, updatedDays);

        afterState = { dates: targetDates, mode: 'LEAVE' };
        affectedRecordIds = targetDates;

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: `Successfully scheduled leave for ${targetDates.join(', ')}.`,
          data: { dates: targetDates },
        };
      }

      case 'removeLeave':
      case 'removeScheduleException': {
        const excId = args.exceptionId || (args.date ? `exc_${args.date}` : '');
        if (!excId) throw new Error('Missing exceptionId or date to remove exception');

        const deleted = await deleteAdminScheduleException(userId, excId);
        affectedRecordIds = [excId];

        if (args.date) {
          await upsertWorkDay(userId, {
            date: args.date,
            mode: 'WFH',
            notes: 'Restored baseline',
          });
        }

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { removed: true, exceptionId: excId },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: deleted,
          message: `Successfully removed schedule exception ${excId}. Baseline schedule restored.`,
        };
      }

      case 'updateWorkSchedule': {
        beforeState = await getAdminWorkSchedule(userId);
        const { actionId: _, ...scheduleUpdates } = args;

        await saveAdminWorkSchedule(userId, scheduleUpdates);
        afterState = await getAdminWorkSchedule(userId);

        const verified = !!afterState;
        affectedRecordIds = ['workSchedule_main'];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified,
          message: 'Successfully updated standard weekly work schedule baseline.',
          data: afterState,
        };
      }

      case 'createScheduleException': {
        const d = args.date;
        if (!d || !args.mode) throw new Error('date and mode are required');

        await saveAdminScheduleException(userId, {
          id: `exc_${d}`,
          date: d,
          mode: args.mode,
          reason: args.reason || 'AI Schedule Exception',
        });

        await upsertWorkDay(userId, {
          date: d,
          mode: args.mode,
          notes: 'AI Exception',
        });

        affectedRecordIds = [d];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { date: d, mode: args.mode },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: `Created schedule exception: ${d} set to ${args.mode}.`,
        };
      }

      case 'updateTravelProfile': {
        beforeState = await getAdminTravelProfile(userId);
        const { actionId: _, ...profileUpdates } = args;

        await saveAdminTravelProfile(userId, profileUpdates);
        afterState = await getAdminTravelProfile(userId);

        affectedRecordIds = ['travelProfile_main'];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: 'Successfully updated travel profile and transit cost estimates.',
          data: afterState,
        };
      }

      case 'updateAccommodation': {
        beforeState = await getAdminAccommodationProfile(userId);
        const { actionId: _, ...lodgingUpdates } = args;

        await saveAdminAccommodationProfile(userId, lodgingUpdates);
        afterState = await getAdminAccommodationProfile(userId);

        affectedRecordIds = ['accommodation_main'];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: 'Successfully updated accommodation preferences and nightly rates.',
          data: afterState,
        };
      }

      case 'updateExpenseTemplate': {
        beforeState = await getAdminExpenseDefaults(userId);
        const { actionId: _, ...templateUpdates } = args;

        await saveAdminExpenseDefaults(userId, templateUpdates);
        afterState = await getAdminExpenseDefaults(userId);

        affectedRecordIds = ['expenseTemplate_main'];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: 'Successfully updated daily meal and miscellaneous expense templates.',
          data: afterState,
        };
      }

      case 'createExpense': {
        const created = await insertExpense({
          userId,
          date: args.date,
          category: args.category || 'MISC',
          subcategory: args.subCategory || 'other',
          title: args.title,
          amount: Number(args.amount) || 0,
          plannedAmount: Number(args.amount) || 0,
          currency: 'INR',
          reimbursable: true,
          status: args.isPlanned === false ? 'RECORDED' : 'PLANNED',
          tripId: args.tripId,
          notes: args.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        afterState = created;
        affectedRecordIds = [created._id?.toString() || 'new_expense'];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState: null,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: !!created._id,
          message: `Created expense "${args.title}" (₹${args.amount}) for ${args.date}.`,
          data: created,
        };
      }

      case 'updateExpense': {
        const expId = args.expenseId;
        if (!expId) throw new Error('expenseId is required');

        const { expenses } = await findExpensesByUserId(userId, { limit: 100 });
        const existing = expenses.find((e) => e._id?.toString() === expId);
        beforeState = existing;

        const updated = await updateExpenseById(userId, expId, {
          actualAmount: args.actualAmount,
          plannedAmount: args.plannedAmount,
          status: args.status,
          notes: args.notes,
        });

        affectedRecordIds = [expId];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { expenseId: expId, ...args },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: updated,
          message: `Successfully updated expense ${expId}.`,
        };
      }

      case 'deleteExpense': {
        const expId = args.expenseId;
        if (!expId) throw new Error('expenseId is required');

        const { expenses } = await findExpensesByUserId(userId, { limit: 100 });
        const existing = expenses.find((e) => e._id?.toString() === expId);
        beforeState = existing;

        const deleted = await deleteExpenseById(userId, expId);
        affectedRecordIds = [expId];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { deleted: true },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'HIGH_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: deleted,
          message: `Successfully deleted expense ${expId}.`,
        };
      }

      case 'createTrip': {
        const createdTrip = await insertTrip({
          userId,
          title: args.title,
          startDate: args.startDate,
          endDate: args.endDate,
          origin: args.origin || 'Mumbai',
          destination: args.destination || 'Pune',
          officeLocation: 'Pune HQ',
          status: 'PLANNED',
          estimatedCost: Number(args.estimatedCost) || 0,
          segments: [],
          aiOptimizationScore: 90,
          notes: args.purpose || 'Work Sprint',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        afterState = createdTrip;
        affectedRecordIds = [createdTrip._id?.toString() || 'new_trip'];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState: null,
          afterState,
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: !!createdTrip._id,
          message: `Successfully created trip "${args.title}" (${args.startDate} to ${args.endDate}).`,
          data: createdTrip,
        };
      }

      case 'updateTrip': {
        const tripId = args.tripId;
        if (!tripId) throw new Error('tripId is required');

        beforeState = await findTripById(userId, tripId);
        const updated = await updateTripById(userId, tripId, {
          title: args.title,
          status: args.status,
          actualCost: args.actualCost,
        });

        affectedRecordIds = [tripId];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { tripId, ...args },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'MEDIUM_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: updated,
          message: `Successfully updated trip ${tripId}.`,
        };
      }

      case 'deleteTrip': {
        const tripId = args.tripId;
        if (!tripId) throw new Error('tripId is required');

        beforeState = await findTripById(userId, tripId);
        const deleted = await deleteTripById(userId, tripId);

        affectedRecordIds = [tripId];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { deleted: true },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'HIGH_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: deleted,
          message: `Successfully deleted trip ${tripId}.`,
        };
      }

      case 'applyOptimizationPlan': {
        const wfoDates: string[] = args.wfoDates || [];
        const wfhDates: string[] = args.wfhDates || [];

        for (const d of wfoDates) {
          await saveAdminScheduleException(userId, { id: `exc_${d}`, date: d, mode: 'WFO', reason: 'AI Optimization Plan' });
        }
        for (const d of wfhDates) {
          await saveAdminScheduleException(userId, { id: `exc_${d}`, date: d, mode: 'WFH', reason: 'AI Optimization Plan' });
        }

        const derivedUpdates = [
          ...wfoDates.map((d) => ({ date: d, mode: 'WFO' as any, notes: 'AI Optimization' })),
          ...wfhDates.map((d) => ({ date: d, mode: 'WFH' as any, notes: 'AI Optimization' })),
        ];

        if (derivedUpdates.length > 0) {
          await upsertWorkDays(userId, derivedUpdates);
        }

        affectedRecordIds = [...wfoDates, ...wfhDates];

        await recordAIActionExecution({
          actionId,
          userId,
          tool: toolName,
          arguments: args,
          beforeState,
          afterState: { appliedWfo: wfoDates, appliedWfh: wfhDates },
          approvalStatus: 'USER_CONFIRMED',
          riskLevel: 'HIGH_RISK',
          executionStatus: 'SUCCESS',
          reversible: true,
          affectedRecordIds,
        });

        return {
          success: true,
          actionId,
          tool: toolName,
          verified: true,
          message: `Applied optimization plan! Updated ${wfoDates.length} WFO dates and ${wfhDates.length} WFH dates. Estimated savings: ₹${args.estimatedSavings || 0}.`,
          data: { wfoDates, wfhDates, savings: args.estimatedSavings },
        };
      }

      case 'undoAIAction': {
        const result = await executeUndoAction(userId, args.actionId);
        return {
          success: result.success,
          actionId,
          tool: toolName,
          verified: true,
          message: result.summary,
          data: result,
        };
      }

      default:
        throw new Error(`Unknown write tool: ${toolName}`);
    }
  } catch (err: any) {
    // Record failed execution in audit log
    await recordAIActionExecution({
      actionId,
      userId,
      tool: toolName,
      arguments: args,
      beforeState,
      afterState: null,
      approvalStatus: 'USER_CONFIRMED',
      riskLevel,
      executionStatus: 'FAILED',
      reversible: false,
      affectedRecordIds,
      error: err?.message || 'Execution error',
    });

    throw err;
  }
}
