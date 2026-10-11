import { z } from 'zod';

// Common Query Schemas
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const DateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Profile & Preferences
export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  homeCity: z.string().min(1).max(100).optional(),
  officeCity: z.string().min(1).max(100).optional(),
  organization: z.string().max(100).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const UpdatePreferencesSchema = z.object({
  optimizationMode: z.enum(['COST', 'COMFORT', 'TIME', 'BALANCED']).optional(),
  currency: z.string().length(3).optional(),
  preferredTravelMode: z.enum(['FLIGHT', 'TRAIN', 'CAB', 'OPTIMAL']).optional(),
  preferredNotificationStyle: z.enum(['MINIMAL', 'STANDARD', 'PROACTIVE']).optional(),
  aiEnabled: z.boolean().optional(),
  aiAutonomyLevel: z.enum(['SUGGEST_ONLY', 'ASSISTED', 'SEMI_AUTONOMOUS']).optional(),
  dateFormat: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']).optional(),
  weeklySummaryEnabled: z.boolean().optional(),
});

// Work Schedule & Calendar
export const UpdateScheduleSchema = z.object({
  homeCity: z.string().min(1).optional(),
  officeCity: z.string().min(1).optional(),
  wfoTargetDaysPerMonth: z.number().int().min(1).max(31).optional(),
  standardWfoDays: z.array(z.string()).optional(),
  batchingCadence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
});

export const UpdateDayScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mode: z.enum(['WFO', 'WFH', 'LEAVE', 'HOLIDAY', 'TRAVEL']),
  location: z.string().max(100).optional(),
  tripId: z.string().optional(),
  notes: z.string().max(500).optional(),
  isLocked: z.boolean().optional(),
});

// Travel & Lodging
export const UpdateTravelProfileSchema = z.object({
  preferredAirlines: z.array(z.string()).optional(),
  seatPreference: z.enum(['WINDOW', 'AISLE', 'ANY']).optional(),
  preferredHotelChains: z.array(z.string()).optional(),
  maxFlightDurationHours: z.number().positive().optional(),
  budgetLimitPerTrip: z.number().positive().optional(),
});

// Trips
export const TripSegmentSchema = z.object({
  id: z.string(),
  type: z.enum(['FLIGHT', 'TRAIN', 'CAB', 'HOTEL']),
  title: z.string().min(1),
  provider: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  cost: z.number().nonnegative(),
  confirmationCode: z.string().optional(),
});

export const CreateTripSchema = z.object({
  title: z.string().min(1).max(150),
  origin: z.string().min(1),
  destination: z.string().min(1),
  officeLocation: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  estimatedCost: z.number().nonnegative(),
  actualCost: z.number().nonnegative().optional(),
  segments: z.array(TripSegmentSchema).default([]),
  aiOptimizationScore: z.number().default(85),
  notes: z.string().max(1000).optional(),
});

export const UpdateTripSchema = CreateTripSchema.partial();

// Expenses
export const CreateExpenseSchema = z.object({
  title: z.string().min(1).max(150),
  category: z.enum(['FLIGHT', 'TRAIN', 'HOTEL', 'MEALS', 'COMMUTE', 'COWORKING', 'OTHER']),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tripId: z.string().optional(),
  location: z.string().max(100).optional(),
  reimbursable: z.boolean().default(true),
  status: z.enum(['PENDING', 'APPROVED', 'REIMBURSED', 'REJECTED', 'NOT_APPLICABLE']).default('PENDING'),
  receiptUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

// Scenarios
export const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  wfoDaysPerWeek: z.number().min(1).max(7),
  batchingCadence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  transportPreference: z.enum(['FLIGHT', 'TRAIN', 'DRIVE', 'OPTIMAL']),
  hotelTier: z.enum(['BUDGET', 'STANDARD', 'PREMIUM']),
  projectedMonthlyCost: z.number().nonnegative(),
  projectedYearlyCost: z.number().nonnegative(),
  projectedTravelHours: z.number().nonnegative(),
  savingsVsBaseline: z.number(),
});

// AI Chat & Action
export const SendAIMessageSchema = z.object({
  conversationId: z.string().optional(),
  content: z.string().min(1).max(2000),
});

export const ExecuteAIActionSchema = z.object({
  actionType: z.string().min(1),
  payload: z.record(z.unknown()),
});
