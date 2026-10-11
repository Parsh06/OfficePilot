import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config';
import type { ScheduleException } from '@/lib/scheduleEngine';

/**
 * Retrieves all schedule exceptions for a user, optionally bounded by date range.
 */
export async function getScheduleExceptions(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ScheduleException[]> {
  if (!userId) return [];

  try {
    const colRef = collection(db, 'users', userId, 'scheduleExceptions');
    let q = query(colRef);

    if (startDate && endDate) {
      q = query(colRef, where('date', '>=', startDate), where('date', '<=', endDate));
    }

    const snap = await getDocs(q);
    const exceptions: ScheduleException[] = [];

    snap.forEach((docSnap) => {
      exceptions.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ScheduleException, 'id'>),
      });
    });

    return exceptions;
  } catch (error) {
    console.warn(`[Firestore:getScheduleExceptions] Falling back for UID ${userId}:`, error);
    // Check localStorage fallback for offline / test / sandbox modes
    const localKey = `worktrip_exceptions_${userId}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      try {
        const parsed: ScheduleException[] = JSON.parse(stored);
        if (startDate && endDate) {
          return parsed.filter((ex) => ex.date >= startDate && ex.date <= endDate);
        }
        return parsed;
      } catch {
        // Continue
      }
    }
    return [];
  }
}

/**
 * Creates or updates a schedule exception in Firestore (and syncs to local storage cache).
 */
export async function saveScheduleException(
  userId: string,
  exceptionData: Omit<Partial<ScheduleException>, 'id' | 'createdAt' | 'updatedAt' | 'userId'> & {
    date: string;
    type: import('@/lib/scheduleEngine').ExceptionType;
    id?: string;
    userId?: string;
  }
): Promise<ScheduleException> {
  if (!userId) throw new Error('User ID is required to save schedule exception');

  const now = new Date().toISOString();
  const exceptionId = exceptionData.id || `ex_${exceptionData.date}_${Date.now().toString(36)}`;
  const exceptionDoc: ScheduleException = {
    ...exceptionData,
    id: exceptionId,
    userId,
    date: exceptionData.date,
    type: exceptionData.type,
    createdAt: now,
    updatedAt: now,
    version: exceptionData.version || 1,
  };

  try {
    const docRef = doc(db, 'users', userId, 'scheduleExceptions', exceptionId);
    await setDoc(docRef, exceptionDoc, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveScheduleException] Local cache fallback for ${userId}:`, error);
  }

  // Update local storage cache for instant reactive updates
  const localKey = `worktrip_exceptions_${userId}`;
  const stored = localStorage.getItem(localKey);
  const existingList: ScheduleException[] = stored ? JSON.parse(stored) : [];
  const filtered = existingList.filter((e) => e.id !== exceptionId && e.date !== exceptionData.date);
  localStorage.setItem(localKey, JSON.stringify([...filtered, exceptionDoc]));

  return exceptionDoc;
}

/**
 * Deletes a specific schedule exception by ID.
 */
export async function deleteScheduleException(userId: string, exceptionId: string): Promise<boolean> {
  if (!userId || !exceptionId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'scheduleExceptions', exceptionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`[Firestore:deleteScheduleException] Local cache deletion for ${userId}:`, error);
  }

  const localKey = `worktrip_exceptions_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const existingList: ScheduleException[] = JSON.parse(stored);
      const filtered = existingList.filter((e) => e.id !== exceptionId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    } catch {
      // Continue
    }
  }

  return true;
}

/**
 * Deletes all schedule exceptions for a specific date (resets to baseline normal schedule).
 */
export async function deleteExceptionsByDate(userId: string, date: string): Promise<number> {
  if (!userId || !date) return 0;

  let count = 0;
  try {
    const colRef = collection(db, 'users', userId, 'scheduleExceptions');
    const q = query(colRef, where('date', '==', date));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    count = snap.size;
  } catch (error) {
    console.warn(`[Firestore:deleteExceptionsByDate] Local cache reset for ${date}:`, error);
  }

  const localKey = `worktrip_exceptions_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const existingList: ScheduleException[] = JSON.parse(stored);
      const filtered = existingList.filter((e) => e.date !== date);
      localStorage.setItem(localKey, JSON.stringify(filtered));
      count = existingList.length - filtered.length;
    } catch {
      // Continue
    }
  }

  return count;
}
