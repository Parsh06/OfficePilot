import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import type { ExpenseRecord, ExpenseTemplate, ExpenseCategory } from '@/lib/expenseEngine';
import { createDefaultExpenseTemplates } from '@/lib/expenseEngine';

/**
 * Retrieves expenses for a user from Firestore subcollection with local cache fallback.
 */
export async function getExpenses(
  userId: string,
  filter: { startDate?: string; endDate?: string; category?: string; tripId?: string } = {}
): Promise<ExpenseRecord[]> {
  if (!userId) return [];

  try {
    const colRef = collection(db, 'users', userId, 'expenses');
    const snap = await getDocs(colRef);
    const expenses: ExpenseRecord[] = [];

    snap.forEach((docSnap) => {
      expenses.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ExpenseRecord, 'id'>),
      });
    });

    if (expenses.length > 0) {
      return expenses.filter((e) => {
        if (filter.startDate && e.date < filter.startDate) return false;
        if (filter.endDate && e.date > filter.endDate) return false;
        if (filter.category && filter.category !== 'ALL' && e.category !== filter.category) return false;
        if (filter.tripId && filter.tripId !== 'ALL' && e.tripId !== filter.tripId) return false;
        return true;
      });
    }
  } catch (error) {
    console.warn(`[Firestore:getExpenses] Falling back for UID ${userId}:`, error);
  }

  // Local storage cache fallback
  const localKey = `worktrip_expenses_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const parsed: ExpenseRecord[] = JSON.parse(stored);
      return parsed.filter((e) => {
        if (filter.startDate && e.date < filter.startDate) return false;
        if (filter.endDate && e.date > filter.endDate) return false;
        if (filter.category && filter.category !== 'ALL' && e.category !== filter.category) return false;
        if (filter.tripId && filter.tripId !== 'ALL' && e.tripId !== filter.tripId) return false;
        return true;
      });
    } catch {
      // Continue
    }
  }

  return [];
}

/**
 * Saves or updates an expense in Firestore and local storage cache.
 */
export async function saveExpense(
  userId: string,
  expenseData: Partial<ExpenseRecord> & { title: string; date: string; category: ExpenseCategory; plannedAmount: number }
): Promise<ExpenseRecord> {
  if (!userId) throw new Error('User ID is required to save expense');

  const now = new Date().toISOString();
  const expenseId = expenseData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const planned = Number(expenseData.plannedAmount) || 0;
  const actual = expenseData.actualAmount !== undefined && expenseData.actualAmount !== null ? Number(expenseData.actualAmount) : undefined;
  const variance = actual !== undefined ? actual - planned : 0;

  const fullExpense: ExpenseRecord = {
    id: expenseId,
    userId,
    date: expenseData.date,
    title: expenseData.title,
    category: expenseData.category,
    subcategory: expenseData.subcategory || 'other',
    plannedAmount: planned,
    actualAmount: actual,
    variance,
    currency: expenseData.currency || 'INR',
    paymentMethod: expenseData.paymentMethod || 'UPI',
    reimbursable: expenseData.reimbursable ?? true,
    status: expenseData.status || (actual !== undefined ? 'CONFIRMED' : 'PLANNED'),
    source: expenseData.source || 'user',
    tripId: expenseData.tripId,
    workDayId: expenseData.workDayId,
    segmentId: expenseData.segmentId,
    notes: expenseData.notes,
    generationKey: expenseData.generationKey,
    createdAt: expenseData.createdAt || now,
    updatedAt: now,
  };

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(fullExpense)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  try {
    const docRef = doc(db, 'users', userId, 'expenses', expenseId);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveExpense] Local cache fallback for ${userId}:`, error);
  }

  const localKey = `worktrip_expenses_${userId}`;
  const stored = localStorage.getItem(localKey);
  const existingList: ExpenseRecord[] = stored ? JSON.parse(stored) : [];
  const filtered = existingList.filter((e) => e.id !== expenseId);
  localStorage.setItem(localKey, JSON.stringify([fullExpense, ...filtered]));

  return fullExpense;
}

/**
 * Batch saves multiple expenses (e.g., from trip generation).
 */
export async function batchSaveExpenses(
  userId: string,
  expenses: ExpenseRecord[]
): Promise<ExpenseRecord[]> {
  const savedList: ExpenseRecord[] = [];
  for (const exp of expenses) {
    const saved = await saveExpense(userId, exp);
    savedList.push(saved);
  }
  return savedList;
}

/**
 * Deletes an expense by ID.
 */
export async function deleteExpense(userId: string, expenseId: string): Promise<boolean> {
  if (!userId || !expenseId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`[Firestore:deleteExpense] Local cache delete for ${userId}:`, error);
  }

  const localKey = `worktrip_expenses_${userId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      const existingList: ExpenseRecord[] = JSON.parse(stored);
      localStorage.setItem(localKey, JSON.stringify(existingList.filter((e) => e.id !== expenseId)));
    } catch {
      // Continue
    }
  }

  return true;
}

/**
 * Retrieves user expense templates from Firestore.
 */
export async function getExpenseTemplates(userId: string): Promise<ExpenseTemplate[]> {
  if (!userId) return [];

  try {
    const colRef = collection(db, 'users', userId, 'expenseTemplates');
    const snap = await getDocs(colRef);
    const templates: ExpenseTemplate[] = [];

    snap.forEach((docSnap) => {
      templates.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ExpenseTemplate, 'id'>),
      });
    });

    if (templates.length > 0) return templates;
  } catch (error) {
    console.warn(`[Firestore:getExpenseTemplates] Falling back for UID ${userId}:`, error);
  }

  const defaultTemplates = createDefaultExpenseTemplates(userId);
  return defaultTemplates;
}

/**
 * Saves an expense template in Firestore.
 */
export async function saveExpenseTemplate(
  userId: string,
  template: Omit<ExpenseTemplate, 'id'> & { id?: string }
): Promise<ExpenseTemplate> {
  if (!userId) throw new Error('User ID is required to save expense template');

  const templateId = template.id || `tmpl_${Date.now()}`;
  const fullTemplate: ExpenseTemplate = {
    ...template,
    id: templateId,
    userId,
  };

  try {
    const docRef = doc(db, 'users', userId, 'expenseTemplates', templateId);
    await setDoc(docRef, fullTemplate, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveExpenseTemplate] Fallback for ${userId}:`, error);
  }

  return fullTemplate;
}
