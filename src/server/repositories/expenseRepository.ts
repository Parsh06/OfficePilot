import { getCollection } from '../db/mongodb';
import type { ExpenseDocument } from '../types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'expenses';

export interface ExpenseQueryFilters {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  category?: string;
  tripId?: string;
  status?: string;
  generationKey?: string;
  limit?: number;
  skip?: number;
  page?: number;
}

export async function findExpensesByUserId(
  userId: string,
  filter: ExpenseQueryFilters = {}
): Promise<{ expenses: ExpenseDocument[]; total: number; page: number; limit: number }> {
  const collection = await getCollection<ExpenseDocument>(COLLECTION_NAME);
  if (!collection) {
    return { expenses: [], total: 0, page: 1, limit: 50 };
  }

  const query: any = { userId };
  const fromDate = filter.from || filter.startDate;
  const toDate = filter.to || filter.endDate;

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = fromDate;
    if (toDate) query.date.$lte = toDate;
  }
  if (filter.category && filter.category !== 'ALL') {
    query.category = filter.category;
  }
  if (filter.tripId && filter.tripId !== 'ALL') {
    query.tripId = filter.tripId;
  }
  if (filter.status && filter.status !== 'ALL') {
    query.status = filter.status;
  }
  if (filter.generationKey) {
    query.generationKey = filter.generationKey;
  }

  const limit = filter.limit || 50;
  const page = filter.page || 1;
  const skip = filter.skip !== undefined ? filter.skip : (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    collection.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);

  return { expenses, total, page, limit };
}

export async function insertExpense(expense: Omit<ExpenseDocument, '_id'>): Promise<ExpenseDocument> {
  const collection = await getCollection<ExpenseDocument>(COLLECTION_NAME);
  if (!collection) {
    return { ...expense, _id: new ObjectId() };
  }

  // Idempotency: Check if generationKey already exists for this user
  if (expense.generationKey) {
    const existing = await collection.findOne({
      userId: expense.userId,
      generationKey: expense.generationKey,
    });
    if (existing) {
      return existing;
    }
  }

  const planned = Number(expense.plannedAmount) || Number(expense.amount) || 0;
  const actual = expense.actualAmount !== undefined ? Number(expense.actualAmount) : undefined;
  const variance = actual !== undefined ? actual - planned : 0;

  const docToInsert: ExpenseDocument = {
    ...expense,
    amount: actual !== undefined ? actual : planned,
    plannedAmount: planned,
    actualAmount: actual,
    variance,
    createdAt: expense.createdAt || new Date().toISOString(),
    updatedAt: expense.updatedAt || new Date().toISOString(),
  };

  const result = await collection.insertOne(docToInsert as any);
  return { ...docToInsert, _id: result.insertedId };
}

export async function batchInsertExpenses(
  userId: string,
  expenses: Omit<ExpenseDocument, '_id' | 'userId'>[]
): Promise<ExpenseDocument[]> {
  const results: ExpenseDocument[] = [];
  for (const exp of expenses) {
    const inserted = await insertExpense({ ...exp, userId });
    results.push(inserted);
  }
  return results;
}

export async function updateExpenseById(
  userId: string,
  expenseId: string,
  updates: Partial<ExpenseDocument>
): Promise<boolean> {
  const collection = await getCollection<ExpenseDocument>(COLLECTION_NAME);
  if (!collection) return false;

  const query: any = { userId };
  try {
    query._id = new ObjectId(expenseId);
  } catch {
    return false;
  }

  const existing = await collection.findOne(query);
  if (!existing) return false;

  const planned = updates.plannedAmount !== undefined ? Number(updates.plannedAmount) : Number(existing.plannedAmount || existing.amount || 0);
  const actual = updates.actualAmount !== undefined ? Number(updates.actualAmount) : existing.actualAmount !== undefined ? Number(existing.actualAmount) : undefined;
  const variance = actual !== undefined ? actual - planned : 0;

  const updateDoc: Partial<ExpenseDocument> = {
    ...updates,
    amount: actual !== undefined ? actual : planned,
    plannedAmount: planned,
    actualAmount: actual,
    variance,
    updatedAt: new Date().toISOString(),
  };

  const result = await collection.updateOne(query, { $set: updateDoc });
  return result.matchedCount > 0;
}

export async function deleteExpenseById(userId: string, expenseId: string): Promise<boolean> {
  const collection = await getCollection<ExpenseDocument>(COLLECTION_NAME);
  if (!collection) return false;

  try {
    const result = await collection.deleteOne({
      _id: new ObjectId(expenseId),
      userId,
    });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}
