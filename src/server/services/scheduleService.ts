import {
  getAdminWorkSchedule,
  updateAdminWorkSchedule,
} from '../repositories/firestoreAdminRepository';
import { findWorkDaysByRange, upsertWorkDay } from '../repositories/workDayRepository';
import type { WorkScheduleDocument } from '@/types/firestore';
import type { WorkDayDocument } from '../types';

export async function getUserSchedule(userId: string) {
  const schedule = await getAdminWorkSchedule(userId);
  return (
    schedule || {
      uid: userId,
      homeCity: 'Mumbai, Maharashtra',
      officeCity: 'Pune Technology Center',
      wfoTargetDaysPerMonth: 8,
      standardWfoDays: ['Tuesday', 'Wednesday', 'Thursday'],
      batchingCadence: 'BIWEEKLY',
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function updateUserSchedule(userId: string, data: Partial<WorkScheduleDocument>) {
  await updateAdminWorkSchedule(userId, data);
  return { updated: true, userId };
}

export async function getCalendarRange(userId: string, startDate: string, endDate: string) {
  return findWorkDaysByRange(userId, startDate, endDate);
}

export async function setCalendarDayMode(
  userId: string,
  dayData: Omit<WorkDayDocument, '_id' | 'userId' | 'updatedAt'>
) {
  return upsertWorkDay(userId, dayData);
}
