import { getCollection } from '../db/mongodb';
import type { ExpenseDocument, TripDocument } from '../types';

const EXPENSES_COLLECTION = 'expenses';
const TRIPS_COLLECTION = 'trips';

/**
 * Executes MongoDB aggregation pipeline to calculate monthly spending trends.
 */
export async function aggregateMonthlySpending(userId: string) {
  const collection = await getCollection<ExpenseDocument>(EXPENSES_COLLECTION);
  if (!collection) return [];

  const pipeline = [
    { $match: { userId } },
    {
      $project: {
        amount: { $ifNull: ['$actualAmount', '$plannedAmount', '$amount'] },
        plannedAmount: { $ifNull: ['$plannedAmount', '$amount'] },
        actualAmount: '$actualAmount',
        yearMonth: { $substr: ['$date', 0, 7] },
      },
    },
    {
      $group: {
        _id: '$yearMonth',
        totalPlanned: { $sum: '$plannedAmount' },
        totalActual: { $sum: { $ifNull: ['$actualAmount', '$plannedAmount'] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  return collection.aggregate(pipeline).toArray();
}

/**
 * Executes MongoDB aggregation pipeline for category breakdown.
 */
export async function aggregateSpendByCategory(userId: string) {
  const collection = await getCollection<ExpenseDocument>(EXPENSES_COLLECTION);
  if (!collection) return [];

  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: '$category',
        totalPlanned: { $sum: { $ifNull: ['$plannedAmount', '$amount'] } },
        totalActual: { $sum: { $ifNull: ['$actualAmount', '$plannedAmount', '$amount'] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalActual: -1 } },
  ];

  return collection.aggregate(pipeline).toArray();
}

/**
 * Aggregates trips by destination city.
 */
export async function aggregateTripsByDestination(userId: string) {
  const collection = await getCollection<TripDocument>(TRIPS_COLLECTION);
  if (!collection) return [];

  const pipeline = [
    { $match: { userId } },
    {
      $group: {
        _id: '$destination',
        totalCost: { $sum: { $ifNull: ['$plannedCost', '$estimatedCost', 0] } },
        tripCount: { $sum: 1 },
      },
    },
    { $sort: { totalCost: -1 } },
  ];

  return collection.aggregate(pipeline).toArray();
}
