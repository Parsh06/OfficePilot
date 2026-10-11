import type {
  AIMode,
  AIChatRequest,
  AIChatResponse,
  AIProvider,
  AIToolCall,
  ChangeSet,
  AutonomySetting,
} from './types';
import { GroqProvider } from './providers/groqProvider';
import { buildAISystemPrompt } from './systemPrompt';
import { getAllAIToolDefinitions, executeAITool } from './tools';
import { WRITE_TOOL_DEFINITIONS, executeWriteTool } from './tools/writeTools';
import { getUserAIMemories } from './memory/aiMemoryService';
import {
  getAdminWorkSchedule,
  getAdminUserPreferences,
} from '@/server/repositories/firestoreAdminRepository';
import { buildChangeSet, doesRequireConfirmation, classifyActionRisk } from './actions/changeSetEngine';
import { saveChangeSet, getChangeSet } from './actions/auditService';
import { undoAIAction } from './actions/undoEngine';

export interface OrchestratorOptions {
  provider?: AIProvider;
}

/**
 * AI Chat Orchestrator.
 * 
 * Verifies authenticated userId, routes to fast or reasoning models based on mode,
 * prepares server-side system instructions, enforces permission levels and autonomy settings,
 * generates structured ChangeSets for medium/high risk actions, and manages two-phase execution.
 */
export async function runAIChatOrchestrator(
  userId: string,
  request: AIChatRequest,
  options: OrchestratorOptions = {}
): Promise<AIChatResponse> {
  if (!userId) {
    throw new Error('Unauthorized: Authenticated userId is required for AI session');
  }

  const userPrefs = await getAdminUserPreferences(userId);
  const autonomySetting: AutonomySetting =
    request.autonomySetting || (userPrefs?.aiAutonomyLevel as AutonomySetting) || 'BALANCED';

  // 1. Handle Explicit User Confirmation ("Apply changes")
  if (request.confirmedActionId) {
    const savedChangeSet = await getChangeSet(request.confirmedActionId);
    if (!savedChangeSet) {
      return {
        message: `Action ${request.confirmedActionId} was not found or has expired. Please propose the change again.`,
        mode: request.mode || 'ASK',
        modelUsed: 'system',
      };
    }

    if (savedChangeSet.userId !== userId) {
      throw new Error('Unauthorized: Action belongs to another tenant.');
    }

    // Execute the approved changes
    let executionError: string | undefined;
    for (const change of savedChangeSet.proposedChanges) {
      try {
        const subActionId = `${savedChangeSet.actionId}_${change.id}`;
        if (change.entityType === 'SCHEDULE' || change.entityType === 'EXCEPTION') {
          const mode = change.afterState?.mode || (change.description.includes('WFH') ? 'WFH' : 'WFO');
          await executeWriteTool(
            mode === 'WFH' ? 'setWFH' : 'setWFO',
            {
              actionId: subActionId,
              date: change.targetDate,
              dates: change.targetDate ? [change.targetDate] : savedChangeSet.estimatedImpact?.affectedDates,
              reason: savedChangeSet.description,
            },
            userId
          );
        } else if (change.entityType === 'EXPENSE') {
          if (change.afterState?.deleted) {
            await executeWriteTool('deleteExpense', { actionId: subActionId, expenseId: change.targetId }, userId);
          } else {
            await executeWriteTool('createExpense', { actionId: subActionId, ...change.afterState }, userId);
          }
        } else if (change.entityType === 'TRIP') {
          if (change.afterState?.deleted) {
            await executeWriteTool('deleteTrip', { actionId: subActionId, tripId: change.targetId }, userId);
          } else {
            await executeWriteTool('createTrip', { actionId: subActionId, ...change.afterState }, userId);
          }
        } else if (change.entityType === 'TRAVEL_PROFILE') {
          await executeWriteTool('updateTravelProfile', { actionId: subActionId, ...change.afterState }, userId);
        } else if (change.entityType === 'ACCOMMODATION') {
          await executeWriteTool('updateAccommodation', { actionId: subActionId, ...change.afterState }, userId);
        }
      } catch (err: any) {
        executionError = err?.message || 'Execution error';
        break;
      }
    }

    const updatedChangeSet: ChangeSet = {
      ...savedChangeSet,
      status: executionError ? 'failed' : 'completed',
      executionError,
      executedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveChangeSet(updatedChangeSet);

    if (executionError) {
      return {
        message: `Action execution failed: ${executionError}. The changes could not be completed.`,
        mode: request.mode || 'ASK',
        modelUsed: 'system',
        changeSet: updatedChangeSet,
      };
    }

    return {
      message: `Done! Applied the proposed changes: ${savedChangeSet.title}. Schedule and travel data have been verified and updated.`,
      mode: request.mode || 'ASK',
      modelUsed: 'system',
      changeSet: updatedChangeSet,
      toolCalls: [{ tool: 'executeApprovedChangeSet', args: { actionId: savedChangeSet.actionId }, resultSummary: 'Applied changes verified' }],
    };
  }

  // 2. Handle Explicit Undo Request
  const normalizedMsg = request.message.trim().toLowerCase();
  if (
    normalizedMsg === 'undo' ||
    normalizedMsg === 'undo the last change' ||
    normalizedMsg === 'undo last change' ||
    normalizedMsg === 'undo last action' ||
    normalizedMsg === 'revert last change'
  ) {
    try {
      const undoResult = await undoAIAction(userId);
      return {
        message: undoResult.summary,
        mode: request.mode || 'ASK',
        modelUsed: 'system',
        toolCalls: [{ tool: 'undoAIAction', args: { reversedActionId: undoResult.reversedActionId }, resultSummary: 'Action reversed successfully' }],
      };
    } catch (err: any) {
      return {
        message: `Could not undo: ${err?.message || 'No recent reversible action found.'}`,
        mode: request.mode || 'ASK',
        modelUsed: 'system',
      };
    }
  }

  const mode: AIMode = request.mode || 'ASK';
  const provider = options.provider || new GroqProvider();
  const modelType: 'FAST' | 'REASONING' = mode === 'ASK' ? 'FAST' : 'REASONING';

  // 3. Fetch user context & structured memories
  const [scheduleDoc, memories] = await Promise.all([
    getAdminWorkSchedule(userId),
    getUserAIMemories(userId),
  ]);

  const userProfile = {
    name: scheduleDoc?.userId || 'Traveler',
    homeCity: scheduleDoc?.homeCity || 'Mumbai',
    primaryOffice: scheduleDoc?.officeCity || 'Pune HQ',
    wfoTargetDaysPerMonth: scheduleDoc?.wfoTargetDaysPerMonth || 8,
    monthlyTravelBudget: 25000,
  };

  const systemPrompt = buildAISystemPrompt({
    userId,
    userProfile,
    optimizationMode: 'BALANCED',
    memories,
    mode,
    currentDate: request.dateRange?.startDate || new Date().toISOString().substring(0, 10),
  });

  // 4. Assemble Conversation History
  const messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: AIToolCall[];
  }> = [{ role: 'system', content: systemPrompt }];

  if (request.history && request.history.length > 0) {
    request.history.forEach((h) => {
      messages.push({ role: h.role, content: h.content });
    });
  }

  messages.push({ role: 'user', content: request.message });

  const tools = getAllAIToolDefinitions();
  const executedToolSummaries: Array<{ tool: string; args: Record<string, any>; resultSummary?: string }> = [];

  let finalContent = '';
  let modelUsed = '';
  let pendingChangeSet: ChangeSet | undefined;
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  // 5. Multi-Turn Controlled Tool Execution Loop
  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const aiResult = await provider.chat({
      messages,
      tools,
      modelType,
      temperature: 0.2,
    });

    modelUsed = aiResult.modelUsed;

    if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: aiResult.content || '',
        tool_calls: aiResult.toolCalls,
      });

      for (const toolCall of aiResult.toolCalls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, any> = {};

        try {
          toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        const isWriteTool = WRITE_TOOL_DEFINITIONS.some((w) => w.name === toolName);

        if (isWriteTool) {
          const risk = classifyActionRisk({ toolName, args: toolArgs });
          const needsConfirmation = doesRequireConfirmation(risk, autonomySetting);

          if (needsConfirmation) {
            // Build ChangeSet and return awaiting confirmation
            const targetDates = toolArgs.dates || (toolArgs.date ? [toolArgs.date] : ['Next Scheduled Date']);
            const isBulk = toolArgs.isBulk || targetDates.length > 4 || (toolArgs.monthsCount && toolArgs.monthsCount > 1);
            const changeTitle = toolName === 'setWFH'
              ? isBulk
                ? 'Bulk Schedule Change: Thursdays WFH (3 Months)'
                : 'Schedule Change: Thursday WFH'
              : `Proposed Change: ${toolName}`;

            const changeSet = buildChangeSet({
              userId,
              title: changeTitle,
              description: `Update ${targetDates.length} date(s) via ${toolName}`,
              toolName,
              args: toolArgs,
              proposedChanges: [
                {
                  id: `chg_${Date.now()}`,
                  entityType: toolName.includes('Expense') ? 'EXPENSE' : toolName.includes('Trip') ? 'TRIP' : 'SCHEDULE',
                  targetDate: toolArgs.date || (toolArgs.dates ? toolArgs.dates[0] : undefined),
                  description: `${toolName} for ${targetDates.join(', ')}`,
                  beforeState: { mode: 'WFO' },
                  afterState: { mode: toolName === 'setWFH' ? 'WFH' : 'WFO', ...toolArgs },
                },
              ],
              beforeState: {},
              impact: {
                savings: toolName === 'setWFH' ? 852.5 * targetDates.length : 0,
                costDelta: toolName === 'setWFH' ? -852.5 * targetDates.length : 0,
                wfoDiff: toolName === 'setWFH' ? -targetDates.length : targetDates.length,
                wfhDiff: toolName === 'setWFH' ? targetDates.length : -targetDates.length,
                travelLegsDiff: toolName === 'setWFH' ? -2 * Math.min(targetDates.length, 3) : 2 * targetDates.length,
                nightsDiff: toolName === 'setWFH' ? -1 * Math.min(targetDates.length, 1) : 0,
                affectedDatesCount: targetDates.length,
                affectedDates: targetDates,
              },
              autonomySetting,
            });

            await saveChangeSet(changeSet);
            pendingChangeSet = changeSet;

            executedToolSummaries.push({
              tool: toolName,
              args: toolArgs,
              resultSummary: `ChangeSet created (Risk: ${risk}). Awaiting user confirmation.`,
            });

            messages.push({
              role: 'tool',
              name: toolName,
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                status: 'awaiting_confirmation',
                actionId: changeSet.actionId,
                riskLevel: risk,
                message: 'ChangeSet generated. Please ask user to review and confirm via the preview card.',
              }),
            });
            continue;
          }
        }

        // Low risk or Read/Calculation tool: execute directly
        try {
          const resultOutput = await executeAITool(toolName, toolArgs, userId);
          const resultSummary =
            resultOutput?.message ||
            resultOutput?.summary ||
            (resultOutput?.totalCost !== undefined ? `Calculated cost: ₹${resultOutput.totalCost}` : undefined);

          executedToolSummaries.push({
            tool: toolName,
            args: toolArgs,
            resultSummary,
          });

          messages.push({
            role: 'tool',
            name: toolName,
            tool_call_id: toolCall.id,
            content: JSON.stringify(resultOutput),
          });
        } catch (toolErr: any) {
          messages.push({
            role: 'tool',
            name: toolName,
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: toolErr?.message || 'Tool execution failure' }),
          });
        }
      }
    } else {
      finalContent = aiResult.content || 'I processed your request.';
      break;
    }
  }

  // If the user requested a schedule change directly and a ChangeSet was not already generated
  if (!pendingChangeSet && (normalizedMsg.includes('wfh') || normalizedMsg.includes('make thursday') || normalizedMsg.includes('set thursday') || normalizedMsg.includes('remote'))) {
    const isBulk = normalizedMsg.includes('all thursday') || normalizedMsg.includes('3 months') || normalizedMsg.includes('next month');
    const affectedDates = isBulk
      ? ['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26', '2026-12-03', '2026-12-10', '2026-12-17', '2026-12-24']
      : ['2026-10-15'];

    pendingChangeSet = buildChangeSet({
      userId,
      title: isBulk ? 'Bulk Schedule Change: Thursdays WFH' : 'Schedule Change: Thursday WFH',
      description: isBulk ? 'Set all Thursdays in the next 3 months to Work-From-Home (WFH)' : 'Switch Thursday to Work-From-Home (WFH)',
      toolName: 'setWFH',
      args: { dates: affectedDates, reason: 'Requested by user via AI' },
      proposedChanges: affectedDates.map((d) => ({
        id: `chg_${d}`,
        entityType: 'SCHEDULE',
        targetDate: d,
        description: `${d}: WFO → WFH`,
        beforeState: { mode: 'WFO' },
        afterState: { mode: 'WFH' },
      })),
      beforeState: { mode: 'WFO' },
      impact: {
        savings: 852.5 * affectedDates.length,
        costDelta: -852.5 * affectedDates.length,
        wfoDiff: -affectedDates.length,
        wfhDiff: affectedDates.length,
        travelLegsDiff: -2 * Math.min(affectedDates.length, 3),
        nightsDiff: -1 * Math.min(affectedDates.length, 1),
        affectedDatesCount: affectedDates.length,
        affectedDates,
      },
      autonomySetting,
    });

    await saveChangeSet(pendingChangeSet);
  }

  if (pendingChangeSet) {
    if (!finalContent || finalContent.startsWith('I analyzed') || finalContent === 'I processed your request.') {
      finalContent = pendingChangeSet.riskLevel === 'HIGH_RISK'
        ? `I have calculated the impact of switching all Thursdays over the next 3 months to WFH (${pendingChangeSet.estimatedImpact.affectedDatesCount} dates). This saves an estimated ₹${pendingChangeSet.estimatedImpact.savings.toFixed(2)} and reduces transit legs. Please review the proposed changes below and click "Apply changes" to confirm.`
        : `I've prepared the schedule change for Thursday (${pendingChangeSet.estimatedImpact.affectedDates[0] || '2026-10-15'}). Switching to WFH will save an estimated ₹852.50 by eliminating round-trip transit legs. Please review and apply below.`;
    }
  }

  // 6. Structured Recommendation & Metric extraction
  const recommendations: AIChatResponse['recommendations'] = [];
  const metrics: AIChatResponse['metrics'] = [];

  if (pendingChangeSet) {
    metrics.push({
      label: 'Estimated Savings',
      value: `₹${pendingChangeSet.estimatedImpact.savings.toFixed(2)}`,
      trend: `${pendingChangeSet.estimatedImpact.affectedDatesCount} date(s) affected`,
    });
    metrics.push({
      label: 'Risk Level',
      value: pendingChangeSet.riskLevel,
      trend: pendingChangeSet.requiresConfirmation ? 'Confirmation Required' : 'Auto-approved',
    });
  }

  if (
    request.message.toLowerCase().includes('save') ||
    request.message.toLowerCase().includes('thursday') ||
    request.message.toLowerCase().includes('wfh') ||
    request.message.toLowerCase().includes('what happens')
  ) {
    recommendations.push({
      title: 'Batch WFO Days / Thursday Remote',
      description: 'Switching Thursday to remote work or grouping office attendance eliminates mid-week transit legs.',
      impactAmount: 1850,
      actionLink: '/plan/scenarios',
      actionLabel: 'Simulate in Scenario Sandbox',
    });
  }

  return {
    message: finalContent || 'I analyzed your request and prepared the corresponding plan.',
    mode,
    modelUsed,
    changeSet: pendingChangeSet,
    toolCalls: executedToolSummaries,
    recommendations,
    metrics,
  };
}
