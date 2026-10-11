import { getCollection } from '../db/mongodb';
import type { WeeklyPlanDocument } from '../types';

const COLLECTION_NAME = 'weeklyPlans';

// In-memory fallback store
const MEMORY_PLANS = new Map<string, WeeklyPlanDocument>();

export async function getWeeklyPlan(
  userId: string,
  weekStartDate: string
): Promise<WeeklyPlanDocument | null> {
  const key = `${userId}_${weekStartDate}`;
  const mem = MEMORY_PLANS.get(key);
  if (mem) return mem;

  const collection = await getCollection<WeeklyPlanDocument>(COLLECTION_NAME);
  if (collection) {
    try {
      const doc = await collection.findOne({ userId, weekStartDate });
      if (doc) return doc;
    } catch {
      // Fallback
    }
  }

  return null;
}

export async function saveWeeklyPlan(
  plan: Omit<WeeklyPlanDocument, '_id' | 'generatedAt' | 'updatedAt'>
): Promise<WeeklyPlanDocument> {
  const now = new Date().toISOString();
  const key = `${plan.userId}_${plan.weekStartDate}`;

  const fullPlan: WeeklyPlanDocument = {
    ...plan,
    generatedAt: now,
    updatedAt: now,
  };

  MEMORY_PLANS.set(key, fullPlan);

  const collection = await getCollection<WeeklyPlanDocument>(COLLECTION_NAME);
  if (collection) {
    try {
      await collection.updateOne(
        { userId: plan.userId, weekStartDate: plan.weekStartDate },
        { $set: fullPlan },
        { upsert: true }
      );
    } catch {
      // Fallback
    }
  }

  return fullPlan;
}
