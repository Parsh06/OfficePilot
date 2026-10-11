import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config';
import type { UserDocument } from '@/types/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

const USERS_COLLECTION = 'users';

/**
 * Retrieves user profile document by canonical Firebase UID.
 */
export async function getUserProfile(uid: string): Promise<UserDocument | null> {
  if (!uid) return null;
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as UserDocument;
  } catch (error) {
    console.warn(`[Firestore:getUserProfile] Could not fetch profile for UID ${uid}:`, error);
    return null;
  }
}

/**
 * Creates or updates a user profile from an authenticated Firebase User.
 * Ensures consistent canonical UID scoping.
 */
export async function syncUserProfileFromAuth(
  firebaseUser: FirebaseUser,
  extraDefaults: Partial<UserDocument> = {}
): Promise<UserDocument> {
  const uid = firebaseUser.uid;
  const userRef = doc(db, USERS_COLLECTION, uid);
  const existing = await getUserProfile(uid);

  const now = new Date().toISOString();

  if (existing) {
    const updatedData: Partial<UserDocument> = {
      displayName: firebaseUser.displayName || existing.displayName || 'WorkTrip Traveler',
      email: firebaseUser.email || existing.email,
      photoURL: firebaseUser.photoURL || existing.photoURL,
      updatedAt: now,
    };
    try {
      await updateDoc(userRef, updatedData);
    } catch {
      // If updateDoc fails (e.g. offline/mock), return merged memory object
    }
    return { ...existing, ...updatedData };
  }

  // Create initial user document
  const newProfile: UserDocument = {
    uid,
    displayName: firebaseUser.displayName || 'WorkTrip Traveler',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    homeCity: extraDefaults.homeCity || 'San Francisco, CA',
    officeCity: extraDefaults.officeCity || 'Seattle, WA',
    organization: extraDefaults.organization || 'WorkTrip Enterprise',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
    currency: 'USD',
    onboardingCompleted: extraDefaults.onboardingCompleted ?? false,
    createdAt: now,
    updatedAt: now,
    ...extraDefaults,
  };

  try {
    await setDoc(userRef, newProfile, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:syncUserProfileFromAuth] Local fallback for setDoc on UID ${uid}:`, error);
  }

  return newProfile;
}

/**
 * Updates partial user profile fields scoped strictly to the given UID.
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserDocument, 'uid' | 'createdAt'>>
): Promise<void> {
  if (!uid) throw new Error('User UID is required for profile updates');
  const userRef = doc(db, USERS_COLLECTION, uid);
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc(userRef, payload, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:updateUserProfile] Warning writing profile for UID ${uid}:`, error);
  }
}

/**
 * Completes user onboarding and updates initial locations/schedules.
 */
export async function completeOnboarding(
  uid: string,
  data: Partial<Pick<UserDocument, 'homeCity' | 'officeCity' | 'displayName' | 'organization' | 'currency'>>
): Promise<void> {
  await updateUserProfile(uid, {
    ...data,
    onboardingCompleted: true,
  });
}
