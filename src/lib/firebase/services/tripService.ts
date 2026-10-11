import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import type { TripBlock } from '@/lib/travelEngine';

/**
 * Retrieves all trips for a user from Firestore subcollection.
 */
export async function getTrips(userId: string): Promise<TripBlock[]> {
  if (!userId) return [];

  try {
    const colRef = collection(db, 'users', userId, 'trips');
    const snap = await getDocs(colRef);
    const trips: TripBlock[] = [];

    snap.forEach((docSnap) => {
      trips.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<TripBlock, 'id'>),
      });
    });

    if (trips.length > 0) return trips;
  } catch (error) {
    console.warn(`[Firestore:getTrips] Falling back for UID ${userId}:`, error);
  }

  // Local storage fallback
  const localKey = `worktrip_trips_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue
    }
  }

  return [];
}

/**
 * Retrieves a single trip by ID.
 */
export async function getTripById(userId: string, tripId: string): Promise<TripBlock | null> {
  if (!userId || !tripId) return null;

  try {
    const docRef = doc(db, 'users', userId, 'trips', tripId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<TripBlock, 'id'>) };
    }
  } catch (error) {
    console.warn(`[Firestore:getTripById] Fallback for UID ${userId}:`, error);
  }

  const all = await getTrips(userId);
  return all.find((t) => t.id === tripId) || null;
}

/**
 * Saves or updates a trip in Firestore and local cache.
 */
export async function saveTrip(
  userId: string,
  tripData: Partial<TripBlock> & { title: string; startDate: string; endDate: string }
): Promise<TripBlock> {
  if (!userId) throw new Error('User ID is required to save trip');

  const now = new Date().toISOString();
  const tripId = tripData.id || `trip_${Date.now().toString(36)}`;
  const fullTrip: TripBlock = {
    origin: 'Mumbai',
    destination: 'Pune',
    officeLocation: 'Pune',
    purpose: 'Office sprint',
    workDays: [tripData.startDate],
    travelSegments: [],
    nightsCount: 0,
    plannedTravelCost: 0,
    plannedStayCost: 0,
    plannedCost: 0,
    status: 'PLANNED',
    aiOptimizationScore: 90,
    ...tripData,
    id: tripId,
    userId,
    title: tripData.title,
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    createdAt: tripData.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'users', userId, 'trips', tripId);
    await setDoc(docRef, fullTrip, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveTrip] Local cache fallback for ${userId}:`, error);
  }

  const localKey = `worktrip_trips_${userId}`;
  const stored = localStorage.getItem(localKey);
  const existingList: TripBlock[] = stored ? JSON.parse(stored) : [];
  const filtered = existingList.filter((t) => t.id !== tripId);
  localStorage.setItem(localKey, JSON.stringify([fullTrip, ...filtered]));

  return fullTrip;
}

/**
 * Batch saves multiple trips (e.g. from schedule generation).
 */
export async function batchSaveTrips(userId: string, trips: TripBlock[]): Promise<TripBlock[]> {
  const results: TripBlock[] = [];
  for (const t of trips) {
    const saved = await saveTrip(userId, t);
    results.push(saved);
  }
  return results;
}

/**
 * Deletes a trip by ID.
 */
export async function deleteTrip(userId: string, tripId: string): Promise<boolean> {
  if (!userId || !tripId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'trips', tripId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`[Firestore:deleteTrip] Local cache delete fallback for ${userId}:`, error);
  }

  const localKey = `worktrip_trips_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const existingList: TripBlock[] = JSON.parse(stored);
      localStorage.setItem(localKey, JSON.stringify(existingList.filter((t) => t.id !== tripId)));
    } catch {
      // Continue
    }
  }

  return true;
}
