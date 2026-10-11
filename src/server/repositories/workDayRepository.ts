import { getCollection } from '../db/mongodb';
import type { WorkDayDocument } from '../types';

const COLLECTION_NAME = 'workDays';

// In-memory fallback store for offline/test environments
const MEMORY_WORKDAYS = new Map<string, WorkDayDocument>();

export async function findWorkDaysByRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WorkDayDocument[]> {
  const collection = await getCollection<WorkDayDocument>(COLLECTION_NAME);
  if (!collection) {
    const list: WorkDayDocument[] = [];
    for (const [key, val] of MEMORY_WORKDAYS.entries()) {
      if (key.startsWith(`${userId}_`) && val.date >= startDate && val.date <= endDate) {
        list.push(val);
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  return collection
    .find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    })
    .sort({ date: 1 })
    .toArray();
}

export async function upsertWorkDay(
  userId: string,
  workDay: Omit<WorkDayDocument, '_id' | 'userId' | 'updatedAt'>
): Promise<WorkDayDocument> {
  const collection = await getCollection<WorkDayDocument>(COLLECTION_NAME);
  const now = new Date().toISOString();
  const document: WorkDayDocument = {
    ...workDay,
    userId,
    updatedAt: now,
  };

  MEMORY_WORKDAYS.set(`${userId}_${workDay.date}`, document);

  if (!collection) {
    return document;
  }

  await collection.updateOne(
    { userId, date: workDay.date },
    { $set: document },
    { upsert: true }
  );

  return document;
}

export async function upsertWorkDays(
  userId: string,
  workDays: Array<Omit<WorkDayDocument, '_id' | 'userId' | 'updatedAt'>>
): Promise<WorkDayDocument[]> {
  const collection = await getCollection<WorkDayDocument>(COLLECTION_NAME);
  const now = new Date().toISOString();
  const results: WorkDayDocument[] = [];

  for (const wd of workDays) {
    const document: WorkDayDocument = {
      ...wd,
      userId,
      updatedAt: now,
    };
    results.push(document);
    MEMORY_WORKDAYS.set(`${userId}_${wd.date}`, document);

    if (collection) {
      await collection.updateOne(
        { userId, date: wd.date },
        { $set: document },
        { upsert: true }
      );
    }
  }

  return results;
}
