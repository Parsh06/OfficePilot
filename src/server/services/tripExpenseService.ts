import { findTripsByUserId, insertTrip, updateTripById } from '../repositories/tripRepository';
import { findExpensesByUserId, insertExpense, updateExpenseById, deleteExpenseById } from '../repositories/expenseRepository';
import type { TripDocument, ExpenseDocument } from '../types';
import { logAuditEvent } from '../repositories/auditRepository';

// Trips
export async function listUserTrips(userId: string, filter: { status?: string; startDate?: string } = {}) {
  return findTripsByUserId(userId, filter);
}

export async function createUserTrip(userId: string, data: Omit<TripDocument, '_id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const trip = await insertTrip({
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  await logAuditEvent(userId, 'audit_trip_create', 'CREATE', 'trip', { tripId: trip._id?.toString() });
  return trip;
}

export async function modifyUserTrip(userId: string, tripId: string, data: Partial<TripDocument>) {
  const success = await updateTripById(userId, tripId, data);
  if (success) {
    await logAuditEvent(userId, 'audit_trip_update', 'UPDATE', 'trip', { tripId });
  }
  return { updated: success, tripId };
}

import type { ExpenseQueryFilters } from '../repositories/expenseRepository';

// Expenses
export async function listUserExpenses(
  userId: string,
  filter: ExpenseQueryFilters = {}
) {
  return findExpensesByUserId(userId, filter);
}

export async function createUserExpense(
  userId: string,
  data: Omit<ExpenseDocument, '_id' | 'userId' | 'createdAt' | 'updatedAt'>
) {
  const now = new Date().toISOString();
  const expense = await insertExpense({
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  await logAuditEvent(userId, 'audit_expense_create', 'CREATE', 'expense', { expenseId: expense._id?.toString() });
  return expense;
}

export async function modifyUserExpense(
  userId: string,
  expenseId: string,
  data: Partial<ExpenseDocument>
) {
  const success = await updateExpenseById(userId, expenseId, data);
  if (success) {
    await logAuditEvent(userId, 'audit_expense_update', 'UPDATE', 'expense', { expenseId });
  }
  return { updated: success, expenseId };
}

export async function removeUserExpense(userId: string, expenseId: string) {
  const success = await deleteExpenseById(userId, expenseId);
  if (success) {
    await logAuditEvent(userId, 'audit_expense_delete', 'DELETE', 'expense', { expenseId });
  }
  return { deleted: success, expenseId };
}
