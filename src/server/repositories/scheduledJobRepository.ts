import { getCollection } from '../db/mongodb';
import type { ScheduledJobDocument, ScheduledJobType } from '../types';

const COLLECTION_NAME = 'scheduledJobs';

// In-memory fallback for offline/test environments
const MEMORY_JOBS = new Map<string, ScheduledJobDocument>();

export async function findScheduledJob(
  userId: string,
  type: ScheduledJobType,
  scheduledFor: string
): Promise<ScheduledJobDocument | null> {
  const collection = await getCollection<ScheduledJobDocument>(COLLECTION_NAME);
  if (!collection) {
    const key = `${userId}_${type}_${scheduledFor}`;
    return MEMORY_JOBS.get(key) || null;
  }

  try {
    return await collection.findOne({ userId, type, scheduledFor });
  } catch {
    const key = `${userId}_${type}_${scheduledFor}`;
    return MEMORY_JOBS.get(key) || null;
  }
}

export async function createOrUpdateScheduledJob(
  job: Omit<ScheduledJobDocument, '_id' | 'createdAt' | 'updatedAt'>
): Promise<ScheduledJobDocument> {
  const collection = await getCollection<ScheduledJobDocument>(COLLECTION_NAME);
  const now = new Date().toISOString();
  const key = `${job.userId}_${job.type}_${job.scheduledFor}`;

  const existing = MEMORY_JOBS.get(key);
  const fullJob: ScheduledJobDocument = {
    ...job,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  MEMORY_JOBS.set(key, fullJob);

  if (collection) {
    try {
      await collection.updateOne(
        { userId: job.userId, type: job.type, scheduledFor: job.scheduledFor },
        {
          $set: fullJob,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    } catch {
      // Fallback
    }
  }

  return fullJob;
}

export async function markScheduledJobCompleted(
  userId: string,
  type: ScheduledJobType,
  scheduledFor: string
): Promise<void> {
  const now = new Date().toISOString();
  const key = `${userId}_${type}_${scheduledFor}`;
  const existing = MEMORY_JOBS.get(key);
  if (existing) {
    MEMORY_JOBS.set(key, {
      ...existing,
      status: 'COMPLETED',
      completedAt: now,
      updatedAt: now,
    });
  }

  const collection = await getCollection<ScheduledJobDocument>(COLLECTION_NAME);
  if (collection) {
    try {
      await collection.updateOne(
        { userId, type, scheduledFor },
        {
          $set: {
            status: 'COMPLETED',
            completedAt: now,
            updatedAt: now,
          },
        }
      );
    } catch {
      // Fallback
    }
  }
}

export async function markScheduledJobFailed(
  userId: string,
  type: ScheduledJobType,
  scheduledFor: string,
  error: string
): Promise<void> {
  const now = new Date().toISOString();
  const key = `${userId}_${type}_${scheduledFor}`;
  const existing = MEMORY_JOBS.get(key);
  if (existing) {
    MEMORY_JOBS.set(key, {
      ...existing,
      status: 'FAILED',
      attempts: (existing.attempts || 0) + 1,
      lastAttemptAt: now,
      error,
      updatedAt: now,
    });
  }

  const collection = await getCollection<ScheduledJobDocument>(COLLECTION_NAME);
  if (collection) {
    try {
      await collection.updateOne(
        { userId, type, scheduledFor },
        {
          $set: {
            status: 'FAILED',
            lastAttemptAt: now,
            error,
            updatedAt: now,
          },
          $inc: { attempts: 1 },
        }
      );
    } catch {
      // Fallback
    }
  }
}
