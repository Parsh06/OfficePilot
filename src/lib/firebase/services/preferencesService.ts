import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config';
import type { PreferencesDocument } from '@/types/firestore';

const PREFERENCES_DOC_ID = 'main';

export function getDefaultPreferences(): PreferencesDocument {
  return {
    optimizationMode: 'BALANCED',
    currency: 'USD',
    preferredTravelMode: 'OPTIMAL',
    preferredNotificationStyle: 'STANDARD',
    aiEnabled: true,
    aiAutonomyLevel: 'ASSISTED',
    dateFormat: 'YYYY-MM-DD',
    weeklySummaryEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches user preferences from users/{uid}/preferences/main.
 */
export async function getUserPreferences(uid: string): Promise<PreferencesDocument> {
  if (!uid) return getDefaultPreferences();

  try {
    const prefRef = doc(db, 'users', uid, 'preferences', PREFERENCES_DOC_ID);
    const snapshot = await getDoc(prefRef);
    if (snapshot.exists()) {
      return snapshot.data() as PreferencesDocument;
    }
  } catch (error) {
    console.warn(`[Firestore:getUserPreferences] Using defaults for UID ${uid}:`, error);
  }

  return getDefaultPreferences();
}

/**
 * Updates or initializes user preferences at users/{uid}/preferences/main.
 */
export async function updateUserPreferences(
  uid: string,
  data: Partial<PreferencesDocument>
): Promise<PreferencesDocument> {
  if (!uid) throw new Error('UID is required to update preferences');

  const prefRef = doc(db, 'users', uid, 'preferences', PREFERENCES_DOC_ID);
  const existing = await getUserPreferences(uid);
  const updated: PreferencesDocument = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(prefRef, updated, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:updateUserPreferences] Fallback save for UID ${uid}:`, error);
  }

  return updated;
}
