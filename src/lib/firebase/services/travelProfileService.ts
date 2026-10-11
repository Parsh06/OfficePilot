import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import type { TravelProfile } from '@/lib/travelEngine';
import { createDefaultTravelProfile } from '@/lib/travelEngine';
import type { AccommodationProfileDocument } from '@/types/firestore';

export function getDefaultTravelProfile(userId: string): TravelProfile {
  const profile = createDefaultTravelProfile(userId);
  return {
    ...profile,
    uid: userId,
    seatPreference: 'AISLE',
    preferredAirlines: ['IndiGo', 'Air India', 'Vistara'],
    preferredTravelMode: 'FLIGHT',
    preferredHotelChains: ['Taj', 'Marriott', 'Hyatt'],
  };
}

export function getDefaultAccommodationProfile(userId: string): AccommodationProfileDocument {
  return {
    userId,
    uid: userId,
    nightlyRateEstimate: 3500,
    preferredTier: 'STANDARD',
    amenitiesRequired: ['High-speed WiFi', 'Work Desk', 'Breakfast Included'],
    maxNightlyRate: 6000,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves all travel profiles for a user from Firestore subcollection.
 */
export async function getTravelProfiles(userId: string): Promise<TravelProfile[]> {
  if (!userId) return [];

  try {
    const colRef = collection(db, 'users', userId, 'travelProfiles');
    const snap = await getDocs(colRef);
    const profiles: TravelProfile[] = [];

    snap.forEach((docSnap) => {
      profiles.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<TravelProfile, 'id'>),
      });
    });

    if (profiles.length > 0) return profiles;
  } catch (error) {
    console.warn(`[Firestore:getTravelProfiles] Falling back for UID ${userId}:`, error);
  }

  // Check localStorage fallback
  const localKey = `worktrip_travel_profiles_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue to default
    }
  }

  const defaultProfile = createDefaultTravelProfile(userId);
  return [defaultProfile];
}

/**
 * Retrieves default or main travel profile.
 */
export async function getTravelProfile(userId: string): Promise<TravelProfile> {
  const profiles = await getTravelProfiles(userId);
  const defaultProf = profiles.find((p) => p.isDefault) || profiles[0];
  return defaultProf || createDefaultTravelProfile(userId);
}

/**
 * Saves or updates a travel profile in Firestore and local storage cache.
 */
export async function saveTravelProfile(
  userId: string,
  profileData: Partial<TravelProfile>
): Promise<TravelProfile> {
  if (!userId) throw new Error('User ID is required to save travel profile');

  const now = new Date().toISOString();
  const existing = await getTravelProfile(userId);
  const profileId = profileData.id || existing.id || `tp_${Date.now().toString(36)}`;
  const fullProfile: TravelProfile = {
    ...existing,
    ...profileData,
    id: profileId,
    userId,
    name: profileData.name || existing.name || 'Standard Commute',
    homeLocation: profileData.homeLocation || existing.homeLocation || 'Mumbai',
    officeLocation: profileData.officeLocation || existing.officeLocation || 'Pune',
    outboundSegments: profileData.outboundSegments || existing.outboundSegments || [],
    returnSegments: profileData.returnSegments || existing.returnSegments || [],
    createdAt: profileData.createdAt || existing.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'users', userId, 'travelProfiles', profileId);
    await setDoc(docRef, fullProfile, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveTravelProfile] Local cache fallback for ${userId}:`, error);
  }

  // Cache in local storage
  const localKey = `worktrip_travel_profiles_${userId}`;
  const stored = localStorage.getItem(localKey);
  const existingList: TravelProfile[] = stored ? JSON.parse(stored) : [];
  const filtered = existingList.filter((p) => p.id !== profileId);
  localStorage.setItem(localKey, JSON.stringify([...filtered, fullProfile]));

  return fullProfile;
}

/**
 * Deletes a travel profile.
 */
export async function deleteTravelProfile(userId: string, profileId: string): Promise<boolean> {
  if (!userId || !profileId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'travelProfiles', profileId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`[Firestore:deleteTravelProfile] Local cache delete fallback for ${userId}:`, error);
  }

  const localKey = `worktrip_travel_profiles_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const existingList: TravelProfile[] = JSON.parse(stored);
      localStorage.setItem(localKey, JSON.stringify(existingList.filter((p) => p.id !== profileId)));
    } catch {
      // Continue
    }
  }

  return true;
}

/**
 * Retrieves accommodation profile.
 */
export async function getAccommodationProfile(userId: string): Promise<AccommodationProfileDocument> {
  if (!userId) return getDefaultAccommodationProfile('');
  try {
    const ref = doc(db, 'users', userId, 'settings', 'accommodation');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as AccommodationProfileDocument;
    }
  } catch (error) {
    console.warn(`[Firestore:getAccommodationProfile] Fallback for UID ${userId}:`, error);
  }
  return getDefaultAccommodationProfile(userId);
}

/**
 * Saves accommodation profile.
 */
export async function saveAccommodationProfile(
  userId: string,
  data: Partial<AccommodationProfileDocument>
): Promise<AccommodationProfileDocument> {
  if (!userId) throw new Error('User ID is required to save accommodation profile');
  const ref = doc(db, 'users', userId, 'settings', 'accommodation');
  const existing = await getAccommodationProfile(userId);
  const updated: AccommodationProfileDocument = {
    ...existing,
    ...data,
    userId,
    uid: userId,
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc(ref, updated, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveAccommodationProfile] Fallback for UID ${userId}:`, error);
  }
  return updated;
}
