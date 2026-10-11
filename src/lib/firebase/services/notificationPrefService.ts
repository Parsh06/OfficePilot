import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config';
import type { NotificationPreferencesDocument } from '@/types/firestore';

const MAIN_DOC = 'main';

export function getDefaultNotificationPreferences(uid: string): NotificationPreferencesDocument {
  return {
    uid,
    emailAlerts: true,
    inAppAlerts: true,
    priceDropAlerts: true,
    scheduleReminders: true,
    weeklyDigest: true,
    updatedAt: new Date().toISOString(),
  };
}

export async function getNotificationPreferences(uid: string): Promise<NotificationPreferencesDocument> {
  if (!uid) return getDefaultNotificationPreferences('');
  try {
    const ref = doc(db, 'users', uid, 'notificationPreferences', MAIN_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as NotificationPreferencesDocument;
    }
  } catch (error) {
    console.warn(`[Firestore:getNotificationPreferences] Fallback for UID ${uid}:`, error);
  }
  return getDefaultNotificationPreferences(uid);
}

export async function saveNotificationPreferences(
  uid: string,
  data: Partial<NotificationPreferencesDocument>
): Promise<NotificationPreferencesDocument> {
  if (!uid) throw new Error('UID is required to save notification preferences');
  const ref = doc(db, 'users', uid, 'notificationPreferences', MAIN_DOC);
  const existing = await getNotificationPreferences(uid);
  const updated: NotificationPreferencesDocument = {
    ...existing,
    ...data,
    uid,
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc(ref, updated, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveNotificationPreferences] Fallback write for UID ${uid}:`, error);
  }
  return updated;
}
