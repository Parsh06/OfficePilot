import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config';
import type { ExpenseDefaultsDocument } from '@/types/firestore';

const MAIN_DOC = 'main';

export function getDefaultExpenseDefaults(currency: string = 'INR'): ExpenseDefaultsDocument {
  const isINR = currency === 'INR';
  return {
    breakfast: isINR ? 250 : 15,
    lunch: isINR ? 450 : 25,
    snacks: isINR ? 150 : 10,
    dinner: isINR ? 650 : 35,
    miscellaneous: isINR ? 300 : 20,
    currency,
    updatedAt: new Date().toISOString(),
  };
}

export async function getExpenseDefaults(uid: string, currency: string = 'INR'): Promise<ExpenseDefaultsDocument> {
  if (!uid) return getDefaultExpenseDefaults(currency);
  try {
    const ref = doc(db, 'users', uid, 'expenseDefaults', MAIN_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as ExpenseDefaultsDocument;
    }
  } catch (error) {
    console.warn(`[Firestore:getExpenseDefaults] Fallback for UID ${uid}:`, error);
  }
  return getDefaultExpenseDefaults(currency);
}

export async function saveExpenseDefaults(
  uid: string,
  data: Partial<ExpenseDefaultsDocument>
): Promise<ExpenseDefaultsDocument> {
  if (!uid) throw new Error('UID is required to save expense defaults');
  const ref = doc(db, 'users', uid, 'expenseDefaults', MAIN_DOC);
  const existing = await getExpenseDefaults(uid, data.currency);
  const updated: ExpenseDefaultsDocument = {
    ...existing,
    ...data,
    userId: uid,
    uid,
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc(ref, updated, { merge: true });
  } catch (error) {
    console.warn(`[Firestore:saveExpenseDefaults] Fallback write for UID ${uid}:`, error);
  }
  return updated;
}
