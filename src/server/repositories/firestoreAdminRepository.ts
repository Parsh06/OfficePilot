import { getAdminFirestore } from '../db/firestoreAdmin';
import type { UserDocument, PreferencesDocument, WorkScheduleDocument, TravelProfileDocument, ScheduleExceptionDocument } from '@/types/firestore';

export async function getAdminUserProfile(userId: string): Promise<UserDocument | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return doc.data() as UserDocument;
  } catch (err) {
    console.warn(`[FirestoreAdminRepo] Could not fetch profile for ${userId}:`, err);
    return null;
  }
}

export async function updateAdminUserProfile(userId: string, data: Partial<UserDocument>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId);
  await ref.set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminUserPreferences(userId: string): Promise<PreferencesDocument | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId).collection('preferences').doc('main').get();
    if (!doc.exists) return null;
    return doc.data() as PreferencesDocument;
  } catch {
    return null;
  }
}

export async function updateAdminUserPreferences(userId: string, data: Partial<PreferencesDocument>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId).collection('preferences').doc('main');
  await ref.set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminWorkSchedule(userId: string): Promise<WorkScheduleDocument | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId).collection('workSchedules').doc('main').get();
    if (!doc.exists) return null;
    return doc.data() as WorkScheduleDocument;
  } catch {
    return null;
  }
}

export async function updateAdminWorkSchedule(userId: string, data: Partial<WorkScheduleDocument>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId).collection('workSchedules').doc('main');
  await ref.set({ ...data, uid: userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveAdminWorkSchedule(userId: string, data: Partial<WorkScheduleDocument>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId).collection('workSchedules').doc('main');
  await ref.set({ ...data, userId, uid: userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminTravelProfile(userId: string): Promise<TravelProfileDocument | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId).collection('travelProfiles').doc('main').get();
    if (!doc.exists) return null;
    return doc.data() as TravelProfileDocument;
  } catch {
    return null;
  }
}

export async function saveAdminTravelProfile(userId: string, data: Partial<TravelProfileDocument>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId).collection('travelProfiles').doc('main');
  await ref.set({ ...data, userId, uid: userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminAccommodationProfile(userId: string): Promise<any | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId).collection('accommodationProfiles').doc('main').get();
    if (!doc.exists) return null;
    return doc.data();
  } catch {
    return null;
  }
}

export async function saveAdminAccommodationProfile(userId: string, data: Record<string, any>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId).collection('accommodationProfiles').doc('main');
  await ref.set({ ...data, userId, uid: userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminExpenseDefaults(userId: string): Promise<any | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const doc = await db.collection('users').doc(userId).collection('expenseDefaults').doc('main').get();
    if (!doc.exists) return null;
    return doc.data();
  } catch {
    return null;
  }
}

export async function saveAdminExpenseDefaults(userId: string, data: Record<string, any>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection('users').doc(userId).collection('expenseDefaults').doc('main');
  await ref.set({ ...data, userId, uid: userId, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getAdminScheduleExceptions(userId: string): Promise<ScheduleExceptionDocument[]> {
  const db = getAdminFirestore();
  if (!db) return [];
  try {
    const snapshot = await db.collection('users').doc(userId).collection('scheduleExceptions').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as ScheduleExceptionDocument));
  } catch {
    return [];
  }
}

export async function saveAdminScheduleException(userId: string, exception: Partial<ScheduleExceptionDocument>): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const id = exception.id || exception.date || `exc_${Date.now().toString(36)}`;
  const ref = db.collection('users').doc(userId).collection('scheduleExceptions').doc(id);
  await ref.set({ ...exception, id, uid: userId, userId, createdAt: new Date().toISOString() }, { merge: true });
}

export async function deleteAdminScheduleException(userId: string, exceptionId: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) return false;
  try {
    await db.collection('users').doc(userId).collection('scheduleExceptions').doc(exceptionId).delete();
    return true;
  } catch {
    return false;
  }
}

export async function exportAllAdminFirestoreData(userId: string): Promise<Record<string, any>> {
  const [profile, preferences, schedule, travel, accommodation, expenseDefaults, exceptions] = await Promise.all([
    getAdminUserProfile(userId),
    getAdminUserPreferences(userId),
    getAdminWorkSchedule(userId),
    getAdminTravelProfile(userId),
    getAdminAccommodationProfile(userId),
    getAdminExpenseDefaults(userId),
    getAdminScheduleExceptions(userId),
  ]);

  return {
    userId,
    exportedAt: new Date().toISOString(),
    firestore: {
      profile,
      preferences,
      schedule,
      travel,
      accommodation,
      expenseDefaults,
      exceptions,
    },
  };
}

export async function deleteAllAdminFirestoreData(userId: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  const subcollections = [
    'preferences',
    'workSchedules',
    'travelProfiles',
    'accommodationProfiles',
    'expenseDefaults',
    'scheduleExceptions',
  ];

  for (const subcol of subcollections) {
    try {
      const snap = await db.collection('users').doc(userId).collection(subcol).get();
      const batch = db.batch();
      snap.docs.forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) {
      console.warn(`[FirestoreAdminRepo] Could not purge subcollection ${subcol} for ${userId}:`, e);
    }
  }

  try {
    await db.collection('users').doc(userId).delete();
  } catch (e) {
    console.warn(`[FirestoreAdminRepo] Could not delete root user document for ${userId}:`, e);
  }
}

