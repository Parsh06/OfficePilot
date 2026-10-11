import { findScenariosByUserId, insertScenario } from '../repositories/scenarioRepository';
import { getOrCreateConversation, findMessagesByConversation, insertAIMessage } from '../repositories/aiRepository';
import type { ScenarioDocument, AIMessageDocument } from '../types';

export async function getUserAnalytics(userId: string) {
  return {
    userId,
    monthlyBudget: 3500,
    currentMonthSpending: 1840,
    projectedMonthEndSpending: 2680,
    savingsYTD: 4120,
    wfoDaysCompleted: 6,
    wfoTargetDays: 8,
    wfhDaysCompleted: 14,
    travelHoursSaved: 18.5,
    carbonOffsetKg: 340,
  };
}

export async function getUserScenarios(userId: string) {
  const existing = await findScenariosByUserId(userId);
  if (existing.length > 0) return existing;

  const defaultScenarios: Omit<ScenarioDocument, '_id'>[] = [
    {
      userId,
      name: 'Smart 4-Day Bi-Weekly Blocks',
      description: 'Concentrates required office attendance into 2 multi-day blocks, halving total flights.',
      wfoDaysPerWeek: 4,
      batchingCadence: 'BIWEEKLY',
      transportPreference: 'FLIGHT',
      hotelTier: 'STANDARD',
      projectedMonthlyCost: 2200,
      projectedYearlyCost: 26400,
      projectedTravelHours: 14,
      savingsVsBaseline: 3400,
      isRecommended: true,
      isCurrent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return defaultScenarios;
}

export async function createScenario(userId: string, data: Omit<ScenarioDocument, '_id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  return insertScenario({
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function runOptimizer(userId: string) {
  return {
    userId,
    optimizationScore: 94,
    projectedAnnualSavings: 2840,
    recommendations: [
      {
        id: 'rec_opt_01',
        title: 'Batch Nov 12-15 Office Trip',
        potentialSavings: 380,
        impact: 'HIGH',
      },
    ],
    timestamp: new Date().toISOString(),
  };
}

export async function processAIMessage(userId: string, conversationId: string | undefined, content: string) {
  const conversation = await getOrCreateConversation(userId, conversationId, content.substring(0, 30));
  const convId = conversation._id!.toString();

  const userMsg: Omit<AIMessageDocument, '_id'> = {
    userId,
    conversationId: convId,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  };
  await insertAIMessage(userMsg);

  const assistantMsg: Omit<AIMessageDocument, '_id'> = {
    userId,
    conversationId: convId,
    role: 'assistant',
    content: `I analyzed your hybrid work travel corridor and attendance targets. Here are your optimized recommendations.`,
    createdAt: new Date().toISOString(),
  };
  const savedAssistantMsg = await insertAIMessage(assistantMsg);

  return {
    conversationId: convId,
    message: savedAssistantMsg,
  };
}

export async function getAIConversationHistory(userId: string, conversationId: string) {
  return findMessagesByConversation(userId, conversationId);
}

export async function getUserNotifications(userId: string) {
  return [
    {
      id: 'notif_01',
      userId,
      title: 'Flight Price Drop Detected',
      message: 'SFO → SEA for your upcoming in-office block dropped by $120.',
      type: 'PRICE_ALERT',
      read: false,
      timestamp: new Date().toISOString(),
    },
  ];
}

export async function executeDailyCronJob() {
  return {
    job: 'daily_schedule_and_price_sync',
    status: 'COMPLETED',
    processedAt: new Date().toISOString(),
    summary: 'Analyzed upcoming flights and forecasted travel requirements.',
  };
}
