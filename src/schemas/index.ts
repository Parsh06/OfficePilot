import { z } from 'zod';

export const ExpenseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  category: z.enum(['FLIGHT', 'TRAIN', 'HOTEL', 'MEALS', 'COMMUTE', 'COWORKING', 'OTHER']),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string(),
  date: z.string().min(1, 'Date is required'),
  tripId: z.string().optional(),
  location: z.string().optional(),
  reimbursable: z.boolean(),
  status: z.enum(['PENDING', 'APPROVED', 'REIMBURSED', 'REJECTED', 'NOT_APPLICABLE']),
  notes: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof ExpenseSchema>;

export const TripSchema = z.object({
  title: z.string().min(3, 'Trip title is required'),
  origin: z.string().min(2, 'Origin city is required'),
  destination: z.string().min(2, 'Destination city is required'),
  officeLocation: z.string().min(2, 'Office location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  estimatedCost: z.number().min(0, 'Estimated cost cannot be negative'),
  notes: z.string().optional(),
});

export type TripFormData = z.infer<typeof TripSchema>;

export const DayScheduleSchema = z.object({
  date: z.string(),
  mode: z.enum(['WFO', 'WFH', 'LEAVE', 'HOLIDAY', 'TRAVEL']),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type DayScheduleFormData = z.infer<typeof DayScheduleSchema>;

export const ScenarioSchema = z.object({
  name: z.string().min(3, 'Scenario name is required'),
  description: z.string().min(5, 'Description is required'),
  wfoDaysPerWeek: z.number().min(1).max(5),
  batchingCadence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  transportPreference: z.enum(['FLIGHT', 'TRAIN', 'DRIVE', 'OPTIMAL']),
  hotelTier: z.enum(['BUDGET', 'STANDARD', 'PREMIUM']),
});

export type ScenarioFormData = z.infer<typeof ScenarioSchema>;

export const SettingsSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.string().min(2, 'Role is required'),
  department: z.string().min(2, 'Department is required'),
  homeCity: z.string().min(2, 'Home city is required'),
  primaryOffice: z.string().min(2, 'Primary office is required'),
  monthlyTravelBudget: z.number().positive('Budget must be positive'),
  wfoTargetDaysPerMonth: z.number().min(1).max(31),
  currency: z.string().min(1),
  notificationsEnabled: z.boolean(),
});

export type SettingsFormData = z.infer<typeof SettingsSchema>;

export * from './onboardingSchema';
