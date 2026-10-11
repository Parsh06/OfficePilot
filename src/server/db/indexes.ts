import type { Db } from 'mongodb';
import { baseLogger } from '../utils/logger';

/**
 * Ensures all required performance and query isolation indexes are created in MongoDB Atlas.
 */
export async function ensureDatabaseIndexes(db: Db): Promise<{ created: string[]; errors: string[] }> {
  const created: string[] = [];
  const errors: string[] = [];

  const indexDefinitions = [
    // 1. expenses
    {
      collection: 'expenses',
      spec: { userId: 1, date: -1 },
      name: 'idx_expenses_user_date',
    },
    {
      collection: 'expenses',
      spec: { userId: 1, category: 1 },
      name: 'idx_expenses_user_category',
    },
    {
      collection: 'expenses',
      spec: { userId: 1, tripId: 1 },
      name: 'idx_expenses_user_trip',
    },
    {
      collection: 'expenses',
      spec: { userId: 1, generationKey: 1 },
      name: 'idx_expenses_user_genkey',
    },

    // 2. trips
    {
      collection: 'trips',
      spec: { userId: 1, startDate: -1 },
      name: 'idx_trips_user_start_date',
    },
    {
      collection: 'trips',
      spec: { userId: 1, status: 1 },
      name: 'idx_trips_user_status',
    },

    // 3. workDays (unique composite index)
    {
      collection: 'workDays',
      spec: { userId: 1, date: 1 },
      name: 'idx_workdays_user_date_unique',
      options: { unique: true },
    },

    // 4. notifications
    {
      collection: 'notifications',
      spec: { userId: 1, isRead: 1, createdAt: -1 },
      name: 'idx_notifications_user_read_created',
    },

    // 5. scheduledJobs
    {
      collection: 'scheduledJobs',
      spec: { status: 1, scheduledFor: 1 },
      name: 'idx_scheduled_jobs_status_scheduled',
    },
    {
      collection: 'scheduledJobs',
      spec: { userId: 1, type: 1 },
      name: 'idx_scheduled_jobs_user_type',
    },

    // 6. weeklyPlans
    {
      collection: 'weeklyPlans',
      spec: { userId: 1, startDate: 1 },
      name: 'idx_weekly_plans_user_start_date',
    },

    // 7. aiMessages
    {
      collection: 'aiMessages',
      spec: { userId: 1, conversationId: 1 },
      name: 'idx_aimessages_user_conversation',
    },
    {
      collection: 'aiMessages',
      spec: { userId: 1, createdAt: -1 },
      name: 'idx_aimessages_user_created_at',
    },

    // 8. auditLogs
    {
      collection: 'auditLogs',
      spec: { userId: 1, createdAt: -1 },
      name: 'idx_auditlogs_user_created_at',
    },
    {
      collection: 'auditLogs',
      spec: { userId: 1, actionId: 1 },
      name: 'idx_auditlogs_user_action_id',
    },
  ];

  for (const def of indexDefinitions) {
    try {
      const coll = db.collection(def.collection);
      await coll.createIndex(def.spec as any, { name: def.name, ...def.options });
      created.push(`${def.collection}.${def.name}`);
    } catch (err: any) {
      baseLogger.warn({ err, collection: def.collection, index: def.name }, '[MongoDB:Index] Error creating index');
      errors.push(`${def.collection}.${def.name}: ${err.message}`);
    }
  }

  baseLogger.info({ createdCount: created.length, errorCount: errors.length }, '[MongoDB:Index] Index creation complete.');
  return { created, errors };
}
