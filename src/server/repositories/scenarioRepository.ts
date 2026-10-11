import { getCollection } from '../db/mongodb';
import type { ScenarioDocument } from '../types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'scenarios';

export async function findScenariosByUserId(userId: string): Promise<ScenarioDocument[]> {
  const collection = await getCollection<ScenarioDocument>(COLLECTION_NAME);
  if (!collection) return [];
  return collection.find({ userId }).sort({ projectedMonthlyCost: 1 }).toArray();
}

export async function insertScenario(scenario: Omit<ScenarioDocument, '_id'>): Promise<ScenarioDocument> {
  const collection = await getCollection<ScenarioDocument>(COLLECTION_NAME);
  if (!collection) {
    return { ...scenario, _id: new ObjectId() };
  }
  const result = await collection.insertOne(scenario as any);
  return { ...scenario, _id: result.insertedId };
}
