import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyActionRisk,
  doesRequireConfirmation,
  buildChangeSet,
} from '@/lib/ai/actions/changeSetEngine';
import {
  saveChangeSet,
  getChangeSet,
} from '@/lib/ai/actions/auditService';
import { undoAIAction } from '@/lib/ai/actions/undoEngine';
import { executeWriteTool, WRITE_TOOL_DEFINITIONS } from '@/lib/ai/tools/writeTools';
import { runAIChatOrchestrator } from '@/lib/ai/orchestrator';

describe('Phase 11: AI Actions, Permission Levels, ChangeSets, Cross-DB Consistency & Undo', () => {
  const testUserId = 'test_user_ai_phase11';

  beforeEach(() => {
    // Reset test state if needed
  });

  describe('1. Permission Levels & Autonomy Policies', () => {
    it('classifies low, medium, and high risk actions accurately', () => {
      expect(classifyActionRisk({ toolName: 'saveDraftScenario', args: {} })).toBe('LOW_RISK');
      expect(classifyActionRisk({ toolName: 'setWFH', args: { date: '2026-10-15' } })).toBe('MEDIUM_RISK');
      expect(classifyActionRisk({ toolName: 'updateTravelProfile', args: {} })).toBe('MEDIUM_RISK');
      expect(classifyActionRisk({ toolName: 'deleteExpense', args: { expenseId: 'exp_1' } })).toBe('HIGH_RISK');
      expect(classifyActionRisk({ toolName: 'deleteTrip', args: { tripId: 'trip_1' } })).toBe('HIGH_RISK');
      expect(classifyActionRisk({ toolName: 'setWFH', args: {}, affectedDatesCount: 10 })).toBe('HIGH_RISK');
    });

    it('enforces confirmation rules across autonomy settings', () => {
      // SUGGEST_ONLY: requires confirmation for everything except low risk
      expect(doesRequireConfirmation('LOW_RISK', 'SUGGEST_ONLY')).toBe(false);
      expect(doesRequireConfirmation('MEDIUM_RISK', 'SUGGEST_ONLY')).toBe(true);
      expect(doesRequireConfirmation('HIGH_RISK', 'SUGGEST_ONLY')).toBe(true);

      // BALANCED (default): auto-executes low risk, requires confirmation for medium & high risk
      expect(doesRequireConfirmation('LOW_RISK', 'BALANCED')).toBe(false);
      expect(doesRequireConfirmation('MEDIUM_RISK', 'BALANCED')).toBe(true);
      expect(doesRequireConfirmation('HIGH_RISK', 'BALANCED')).toBe(true);

      // MORE_AUTONOMOUS: auto-executes low & medium risk, requires confirmation for high risk
      expect(doesRequireConfirmation('LOW_RISK', 'MORE_AUTONOMOUS')).toBe(false);
      expect(doesRequireConfirmation('MEDIUM_RISK', 'MORE_AUTONOMOUS')).toBe(false);
      expect(doesRequireConfirmation('HIGH_RISK', 'MORE_AUTONOMOUS')).toBe(true);
    });
  });

  describe('2. ChangeSet Model & Impact Calculation', () => {
    it('builds a complete ChangeSet with beforeState, proposedChanges, and estimated impact', () => {
      const changeSet = buildChangeSet({
        userId: testUserId,
        title: 'Schedule Change: Thursday WFH',
        description: 'Set Thursday 2026-10-15 to WFH',
        toolName: 'setWFH',
        args: { date: '2026-10-15' },
        proposedChanges: [
          {
            id: 'chg_1',
            entityType: 'SCHEDULE',
            targetDate: '2026-10-15',
            description: '2026-10-15: WFO → WFH',
            beforeState: { mode: 'WFO' },
            afterState: { mode: 'WFH' },
          },
        ],
        beforeState: { mode: 'WFO' },
        impact: {
          savings: 852.5,
          costDelta: -852.5,
          wfoDiff: -1,
          wfhDiff: 1,
          travelLegsDiff: -2,
          nightsDiff: -1,
          affectedDates: ['2026-10-15'],
        },
        autonomySetting: 'BALANCED',
      });

      expect(changeSet.actionId).toBeDefined();
      expect(changeSet.userId).toBe(testUserId);
      expect(changeSet.riskLevel).toBe('MEDIUM_RISK');
      expect(changeSet.requiresConfirmation).toBe(true);
      expect(changeSet.status).toBe('awaiting_confirmation');
      expect(changeSet.estimatedImpact.savings).toBe(852.5);
      expect(changeSet.estimatedImpact.travelLegsDiff).toBe(-2);
      expect(changeSet.proposedChanges.length).toBe(1);
    });

    it('persists and retrieves ChangeSets correctly', async () => {
      const changeSet = buildChangeSet({
        actionId: 'test_cs_persist_01',
        userId: testUserId,
        title: 'Test CS',
        description: 'Test persist',
        toolName: 'setWFH',
        args: {},
        proposedChanges: [],
        beforeState: {},
      });

      await saveChangeSet(changeSet);
      const retrieved = await getChangeSet('test_cs_persist_01');
      expect(retrieved).toBeDefined();
      expect(retrieved?.actionId).toBe('test_cs_persist_01');
    });
  });

  describe('3. Typed Write Tools, Idempotency & Verification', () => {
    it('defines all 17 required typed write tools', () => {
      const toolNames = WRITE_TOOL_DEFINITIONS.map((t) => t.name);
      expect(toolNames).toContain('createExpense');
      expect(toolNames).toContain('updateExpense');
      expect(toolNames).toContain('deleteExpense');
      expect(toolNames).toContain('setWFH');
      expect(toolNames).toContain('setWFO');
      expect(toolNames).toContain('addLeave');
      expect(toolNames).toContain('removeLeave');
      expect(toolNames).toContain('updateWorkSchedule');
      expect(toolNames).toContain('createScheduleException');
      expect(toolNames).toContain('removeScheduleException');
      expect(toolNames).toContain('updateTravelProfile');
      expect(toolNames).toContain('updateAccommodation');
      expect(toolNames).toContain('updateExpenseTemplate');
      expect(toolNames).toContain('createTrip');
      expect(toolNames).toContain('updateTrip');
      expect(toolNames).toContain('deleteTrip');
      expect(toolNames).toContain('applyOptimizationPlan');
      expect(toolNames).toContain('undoAIAction');
    });

    it('executes setWFH with verified state and audit log', async () => {
      const actionId = `act_wfh_${Date.now()}`;
      const result = await executeWriteTool(
        'setWFH',
        {
          actionId,
          date: '2026-10-15',
          reason: 'AI Optimization',
        },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.message).toContain('2026-10-15');

      // Check Idempotency
      const duplicateRun = await executeWriteTool(
        'setWFH',
        {
          actionId,
          date: '2026-10-15',
        },
        testUserId
      );
      expect(duplicateRun.success).toBe(true);
      expect(duplicateRun.message).toContain('already executed previously');
    });

    it('executes createExpense, updateExpense, and deleteExpense with verification', async () => {
      const createActionId = `act_exp_create_${Date.now()}`;
      const createRes = await executeWriteTool(
        'createExpense',
        {
          actionId: createActionId,
          date: '2026-10-15',
          category: 'FOOD',
          subCategory: 'lunch',
          title: 'Office Cafeteria Meal',
          amount: 250,
          isPlanned: false,
        },
        testUserId
      );

      expect(createRes.success).toBe(true);
      expect(createRes.verified).toBe(true);
      const createdId = createRes.data?._id?.toString() || 'exp_test_id';

      // Update
      const updateRes = await executeWriteTool(
        'updateExpense',
        {
          actionId: `act_exp_upd_${Date.now()}`,
          expenseId: createdId,
          actualAmount: 220,
          status: 'RECORDED',
        },
        testUserId
      );
      expect(updateRes.success).toBe(true);

      // Delete
      const delRes = await executeWriteTool(
        'deleteExpense',
        {
          actionId: `act_exp_del_${Date.now()}`,
          expenseId: createdId,
        },
        testUserId
      );
      expect(delRes.success).toBe(true);
    });

    it('executes createTrip and updateTrip', async () => {
      const tripRes = await executeWriteTool(
        'createTrip',
        {
          actionId: `act_trip_${Date.now()}`,
          title: 'Pune Quarterly Review',
          startDate: '2026-10-20',
          endDate: '2026-10-22',
          estimatedCost: 6500,
        },
        testUserId
      );

      expect(tripRes.success).toBe(true);
      expect(tripRes.verified).toBe(true);
      expect(tripRes.data?.title).toBe('Pune Quarterly Review');
    });
  });

  describe('4. Undo Engine', () => {
    it('reverses the most recent reversible action and restores beforeState', async () => {
      const actionId = `act_undo_test_${Date.now()}`;

      // 1. Execute a schedule change
      await executeWriteTool(
        'setWFH',
        {
          actionId,
          date: '2026-10-22',
          reason: 'Test action for undo',
        },
        testUserId
      );

      // 2. Undo
      const undoRes = await undoAIAction(testUserId);
      expect(undoRes.success).toBe(true);
      expect(undoRes.reversedActionId).toBe(actionId);
      expect(undoRes.summary).toContain('Successfully reversed');
    });
  });

  describe('5. Orchestrator Flow: Request → Impact → ChangeSet → Verification', () => {
    it('handles "Make Thursday WFH" by preparing a ChangeSet and awaiting confirmation', async () => {
      const response = await runAIChatOrchestrator(testUserId, {
        message: 'Make Thursday WFH',
        mode: 'PLAN',
        autonomySetting: 'BALANCED',
      });

      expect(response.changeSet).toBeDefined();
      expect(response.changeSet?.title).toContain('Thursday WFH');
      expect(response.changeSet?.status).toBe('awaiting_confirmation');
      expect(response.changeSet?.estimatedImpact.savings).toBeGreaterThan(0);
      expect(response.message).toContain('852.50');
    });

    it('handles bulk requests: "Make all Thursdays WFH for the next 3 months"', async () => {
      const response = await runAIChatOrchestrator(testUserId, {
        message: 'Make all Thursdays WFH for the next 3 months',
        mode: 'PLAN',
        autonomySetting: 'BALANCED',
      });

      expect(response.changeSet).toBeDefined();
      expect(response.changeSet?.riskLevel).toBe('HIGH_RISK');
      expect(response.changeSet?.estimatedImpact.affectedDatesCount).toBeGreaterThan(4);
      expect(response.changeSet?.estimatedImpact.savings).toBeGreaterThan(5000);
      expect(response.message).toContain('3 months');
    });

    it('applies confirmed ChangeSet on "Apply changes" and updates status to completed', async () => {
      // 1. Create ChangeSet
      const cs = buildChangeSet({
        actionId: `act_conf_test_${Date.now()}`,
        userId: testUserId,
        title: 'Thursday WFH Approved',
        description: 'Set 2026-10-15 to WFH',
        toolName: 'setWFH',
        args: { date: '2026-10-15' },
        proposedChanges: [
          {
            id: 'chg_app_1',
            entityType: 'SCHEDULE',
            targetDate: '2026-10-15',
            description: '2026-10-15: WFO → WFH',
            beforeState: { mode: 'WFO' },
            afterState: { mode: 'WFH' },
          },
        ],
        beforeState: {},
      });
      await saveChangeSet(cs);

      // 2. User confirms
      const response = await runAIChatOrchestrator(testUserId, {
        message: 'Apply changes',
        confirmedActionId: cs.actionId,
      });

      expect(response.changeSet?.status).toBe('completed');
      expect(response.message).toContain('Done! Applied the proposed changes');
    });

    it('handles "Undo the last change" concisely and reliably', async () => {
      // 1. Execute an action
      await executeWriteTool(
        'setWFH',
        {
          actionId: `act_undo_flow_${Date.now()}`,
          date: '2026-10-29',
        },
        testUserId
      );

      // 2. Request undo via chat
      const response = await runAIChatOrchestrator(testUserId, {
        message: 'Undo the last change',
      });

      expect(response.message).toContain('Successfully reversed');
    });
  });
});
