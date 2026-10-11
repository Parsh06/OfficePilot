import { getCollection } from '../db/mongodb';
import type { TripDocument } from '../types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'trips';

export async function findTripsByUserId(
  userId: string,
  filter: { status?: string; startDate?: string; limit?: number } = {}
): Promise<TripDocument[]> {
  const collection = await getCollection<TripDocument>(COLLECTION_NAME);
  if (!collection) return [];

  const query: any = { userId };
  if (filter.status) query.status = filter.status;
  if (filter.startDate) query.startDate = { $gte: filter.startDate };

  return collection
    .find(query)
    .sort({ startDate: -1 })
    .limit(filter.limit || 50)
    .toArray();
}

export async function insertTrip(trip: Omit<TripDocument, '_id'>): Promise<TripDocument> {
  const collection = await getCollection<TripDocument>(COLLECTION_NAME);
  if (!collection) {
    return { ...trip, _id: new ObjectId() };
  }
  const result = await collection.insertOne(trip as any);
  return { ...trip, _id: result.insertedId };
}

export async function updateTripById(
  userId: string,
  tripId: string,
  update: Partial<TripDocument>
): Promise<boolean> {
  const collection = await getCollection<TripDocument>(COLLECTION_NAME);
  if (!collection) return false;
  const result = await collection.updateOne(
    { _id: new ObjectId(tripId), userId },
    { $set: { ...update, updatedAt: new Date().toISOString() } }
  );
  return result.matchedCount > 0;
}

export async function findTripById(userId: string, tripId: string): Promise<TripDocument | null> {
  const collection = await getCollection<TripDocument>(COLLECTION_NAME);
  if (!collection) return null;
  try {
    return collection.findOne({ _id: new ObjectId(tripId), userId });
  } catch {
    return null;
  }
}

export async function deleteTripById(userId: string, tripId: string): Promise<boolean> {
  const collection = await getCollection<TripDocument>(COLLECTION_NAME);
  if (!collection) return false;
  try {
    const result = await collection.deleteOne({ _id: new ObjectId(tripId), userId });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}
