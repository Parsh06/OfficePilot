import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config';
import type { WorkScheduleDocument } from '@/types/firestore';

const MAIN_DOC = 'main';

export function getDefaultWorkSchedule(userId: string): WorkScheduleDocument {
  const now = new Date().toISOString();
  return {
    userId,
    uid: userId,
    timezone: 'Asia/Kolkata',
    effectiveFrom: '2026-01-01',
    monday: 'WFH',
    tuesday: 'WFO',
    wednesday: 'WFO',
    thursday: 'WFO',
    friday: 'WFH',
    saturday: 'OFF',
    sunday: 'OFF',
    homeCity: 'Bengaluru',
    officeCity: 'Mumbai HQ',
    wfoTargetDaysPerMonth: 8,
    standardWfoDays: ['Tuesday', 'Wednesday', 'Thursday'],
    batchingCadence: 'BIWEEKLY',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getWorkSchedule(userId: string): Promise<WorkScheduleDocument> {
  if (!userId) return getDefaultWorkSchedule('');
  try {
    const rootRef = doc(db, 'workSchedules', userId);
    const snap = await getDoc(rootRef);
    if (snap && typeof snap.exists === 'function' && snap.exists()) {
      return snap.data() as WorkScheduleDocument;
    }

    const subRef = doc(db, 'users', userId, 'workSchedules', MAIN_DOC);
    const subSnap = await getDoc(subRef);
    if (subSnap && typeof subSnap.exists === 'function' && subSnap.exists()) {
      return subSnap.data() as WorkScheduleDocument;
    }
  } catch (error) {
    console.warn(`[Firestore:getWorkSchedule] Using default for UID ${userId}:`, error);
  }
  return getDefaultWorkSchedule(userId);
}

export async function saveWorkSchedule(
  userId: string,
  data: Partial<WorkScheduleDocument>
): Promise<WorkScheduleDocument> {
  if (!userId) throw new Error('User ID is required to save work schedule');
  const existing = await getWorkSchedule(userId);
  const updated: WorkScheduleDocument = {
    ...existing,
    ...data,
    userId,
    uid: userId,
    updatedAt: new Date().toISOString(),
  };

  try {
    const rootRef = doc(db, 'workSchedules', userId);
    const subRef = doc(db, 'users', userId, 'workSchedules', MAIN_DOC);
    await Promise.all([
      setDoc(rootRef, updated, { merge: true }),
      setDoc(subRef, updated, { merge: true }),
    ]);
  } catch (error) {
    console.warn(`[Firestore:saveWorkSchedule] Saved with fallback for UID ${userId}:`, error);
  }

  return updated;
}
