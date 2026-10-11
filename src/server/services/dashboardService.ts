import { findExpensesByUserId } from '../repositories/expenseRepository';
import { findTripsByUserId } from '../repositories/tripRepository';
import { findWorkDaysByRange } from '../repositories/workDayRepository';
import { getAdminUserProfile } from '../repositories/firestoreAdminRepository';
import { aggregateDashboardData, getWorkWeekDates } from '@/lib/analyticsEngine';
import type { DashboardSummaryResponse } from '@/lib/analyticsEngine';
import type { ExpenseRecord } from '@/lib/expenseEngine';
import type { TripBlock } from '@/lib/travelEngine';

/**
 * Aggregates all user metrics into a single compact payload for the dashboard.
 */
export async function getDashboardSummary(
  userId: string,
  referenceDate: string = new Date().toISOString().substring(0, 10)
): Promise<DashboardSummaryResponse> {
  const refDateObj = new Date(referenceDate);
  const weekDates = getWorkWeekDates(refDateObj);
  const monthStart = `${referenceDate.substring(0, 7)}-01`;
  const monthEnd = `${referenceDate.substring(0, 7)}-31`;

  // Parallel fetch to optimize serverless execution time
  const [profile, tripsResult, expensesResult, calendarDays] = await Promise.all([
    getAdminUserProfile(userId),
    findTripsByUserId(userId),
    findExpensesByUserId(userId, { from: monthStart, to: monthEnd, limit: 100 }),
    findWorkDaysByRange(userId, weekDates[0].date, weekDates[4].date),
  ]);

  const workDays = calendarDays.map((cd) => ({
    date: cd.date,
    scheduleType: cd.mode,
    notes: cd.notes,
  }));

  const trips: TripBlock[] = (tripsResult || []).map((t: any) => ({
    id: t._id?.toString() || t.id,
    userId: t.userId,
    title: t.title || 'Office Trip',
    startDate: t.startDate,
    endDate: t.endDate,
    origin: t.origin || 'Home',
    destination: t.destination || 'Office',
    officeLocation: t.officeLocation || 'HQ',
    purpose: t.purpose || 'Sprint Planning',
    workDays: t.workDays || [],
    travelSegments: t.travelSegments || t.segments || [],
    accommodation: t.accommodation,
    nightsCount: t.nightsCount || 0,
    plannedTravelCost: t.plannedTravelCost || 0,
    plannedStayCost: t.plannedStayCost || 0,
    plannedCost: t.plannedCost || t.estimatedCost || 0,
    actualCost: t.actualCost || 0,
    status: t.status || 'PLANNED',
    aiOptimizationScore: t.aiOptimizationScore || 90,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  }));

  const expenses: ExpenseRecord[] = (expensesResult.expenses || []).map((e: any) => ({
    id: e._id?.toString() || e.id,
    userId: e.userId,
    date: e.date,
    title: e.title || 'Expense',
    category: e.category,
    subcategory: e.subcategory || 'other',
    plannedAmount: e.plannedAmount ?? e.amount ?? 0,
    actualAmount: e.actualAmount,
    variance: e.variance ?? 0,
    currency: e.currency || 'INR',
    paymentMethod: e.paymentMethod || 'UPI',
    reimbursable: e.reimbursable ?? true,
    status: e.status || 'CONFIRMED',
    source: e.source || 'user',
    tripId: e.tripId,
    workDayId: e.workDayId,
    segmentId: e.segmentId,
    generationKey: e.generationKey,
    notes: e.notes,
    createdAt: e.createdAt || new Date().toISOString(),
    updatedAt: e.updatedAt || new Date().toISOString(),
  }));

  const monthlyBudget = (profile as any)?.monthlyBudget || (profile as any)?.monthlyTravelBudget || 25000;

  return aggregateDashboardData({
    workDays,
    exceptions: [],
    trips,
    expenses,
    monthlyBudget,
    referenceDate,
  });
}
