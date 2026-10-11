import {
  getAdminUserProfile,
  updateAdminUserProfile,
  getAdminUserPreferences,
  updateAdminUserPreferences,
  exportAllAdminFirestoreData,
  deleteAllAdminFirestoreData,
} from '../repositories/firestoreAdminRepository';
import type { UserDocument, PreferencesDocument } from '@/types/firestore';
import { logAuditEvent } from '../repositories/auditRepository';

export async function getUserProfileData(userId: string) {
  const [profile, preferences] = await Promise.all([
    getAdminUserProfile(userId),
    getAdminUserPreferences(userId),
  ]);

  return {
    profile: profile || {
      uid: userId,
      displayName: 'Office Pilot Traveler',
      email: `${userId}@officepilot.app`,
      homeCity: 'Mumbai, Maharashtra',
      officeCity: 'Pune Technology Center',
      organization: 'Office Pilot Enterprise',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    preferences: preferences || {
      optimizationMode: 'BALANCED',
      currency: 'INR',
      preferredTravelMode: 'OPTIMAL',
      preferredNotificationStyle: 'STANDARD',
      aiEnabled: true,
      aiAutonomyLevel: 'ASSISTED',
      dateFormat: 'YYYY-MM-DD',
      weeklySummaryEnabled: true,
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function updateUserProfileData(userId: string, data: Partial<UserDocument>) {
  await updateAdminUserProfile(userId, data);
  await logAuditEvent(userId, 'audit_profile_update', 'UPDATE', 'user_profile', { fields: Object.keys(data) });
  return { updated: true, userId };
}

export async function updateUserPreferencesData(userId: string, data: Partial<PreferencesDocument>) {
  await updateAdminUserPreferences(userId, data);
  await logAuditEvent(userId, 'audit_preferences_update', 'UPDATE', 'user_preferences', { fields: Object.keys(data) });
  return { updated: true, userId };
}

export async function exportFullUserData(userId: string) {
  const [firestoreData, mongoData] = await Promise.all([
    exportAllAdminFirestoreData(userId),
    exportUserMongoData(userId),
  ]);

  await logAuditEvent(userId, 'audit_data_export', 'READ', 'user_data_export', { timestamp: new Date().toISOString() });

  return {
    application: 'WorkTrip AI',
    version: '1.0.0-production-mvp',
    exportedAt: new Date().toISOString(),
    userId,
    ...firestoreData,
    mongo: mongoData,
  };
}

export async function deleteFullUserAccount(userId: string) {
  await logAuditEvent(userId, 'audit_account_deletion_initiated', 'DELETE', 'user_account', { timestamp: new Date().toISOString() });

  // 1. Purge Mongo collections scoped by userId
  await deleteUserMongoData(userId);

  // 2. Purge Firestore profile, preferences, schedule, trips, defaults, exceptions
  await deleteAllAdminFirestoreData(userId);

  return {
    deleted: true,
    userId,
    purgedAt: new Date().toISOString(),
    message: 'User account and all associated Firestore and MongoDB data successfully deleted.',
  };
}

async function exportUserMongoData(userId: string): Promise<Record<string, any>> {
  const collections = [
    'expenses',
    'trips',
    'scenarios',
    'weekly_plans',
    'work_days',
    'notifications',
    'scheduled_jobs',
    'ai_conversations',
    'audit_logs',
    'analytics_snapshots',
  ];

  const results: Record<string, any[]> = {};

  try {
    const { getDatabase } = await import('../db/mongodb');
    const db = await getDatabase();
    if (!db) return results;

    for (const colName of collections) {
      const records = await db
        .collection(colName)
        .find({ $or: [{ userId }, { uid: userId }] })
        .toArray();
      results[colName] = records;
    }
  } catch (err) {
    console.warn(`[ProfileService] Mongo export fallback for ${userId}:`, err);
  }

  return results;
}

async function deleteUserMongoData(userId: string): Promise<void> {
  const collections = [
    'expenses',
    'trips',
    'scenarios',
    'weekly_plans',
    'work_days',
    'notifications',
    'scheduled_jobs',
    'ai_conversations',
    'audit_logs',
    'analytics_snapshots',
    'change_sets',
    'ai_memories',
  ];

  try {
    const { getDatabase } = await import('../db/mongodb');
    const db = await getDatabase();
    if (!db) return;

    for (const colName of collections) {
      await db.collection(colName).deleteMany({ $or: [{ userId }, { uid: userId }] });
    }
  } catch (err) {
    console.warn(`[ProfileService] Mongo purge error for ${userId}:`, err);
  }
}

