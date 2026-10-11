import type { ObjectId } from 'mongodb';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    durationMs?: number;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  isAnonymous?: boolean;
}

export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: AuthUser;
}

// -------------------------------------------------------------
// MongoDB Collection Document Interfaces
// -------------------------------------------------------------

export interface ExpenseDocument {
  _id?: ObjectId;
  userId: string;
  title: string;
  category: string;
  subcategory?: string;
  amount: number;
  plannedAmount?: number;
  actualAmount?: number;
  variance?: number;
  currency: string;
  date: string; // YYYY-MM-DD
  tripId?: string;
  workDayId?: string;
  segmentId?: string;
  location?: string;
  reimbursable: boolean;
  status: string;
  receiptUrl?: string;
  paymentMethod?: string;
  notes?: string;
  source?: string;
  generationKey?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlannedExpenseDocument {
  _id?: ObjectId;
  userId: string;
  tripId?: string;
  category: string;
  estimatedAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface TripSegmentItem {
  id: string;
  type: 'FLIGHT' | 'TRAIN' | 'CAB' | 'HOTEL';
  title: string;
  provider?: string;
  departureTime?: string;
  arrivalTime?: string;
  origin?: string;
  destination?: string;
  cost: number;
  confirmationCode?: string;
}

export interface TripDocument {
  _id?: ObjectId;
  userId: string;
  title: string;
  origin: string;
  destination: string;
  officeLocation: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'PLANNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  estimatedCost: number;
  actualCost?: number;
  segments: TripSegmentItem[];
  aiOptimizationScore: number;
  aiSavingsEstimate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkDayDocument {
  _id?: ObjectId;
  userId: string;
  date: string; // YYYY-MM-DD
  mode: 'WFO' | 'WFH' | 'LEAVE' | 'HOLIDAY' | 'OFF' | 'TRAVEL';
  location?: string;
  tripId?: string;
  notes?: string;
  isLocked?: boolean;
  updatedAt: string;
}

export interface AnalyticsSnapshotDocument {
  _id?: ObjectId;
  userId: string;
  period: string; // e.g., '2026-10'
  totalSpent: number;
  wfoDaysCompleted: number;
  wfoTargetDays: number;
  wfhDaysCompleted: number;
  travelHoursSaved: number;
  carbonOffsetKg: number;
  savingsVsBaseline: number;
  createdAt: string;
}

export interface ForecastSnapshotDocument {
  _id?: ObjectId;
  userId: string;
  projectedMonthEndSpend: number;
  projectedYearlyCost: number;
  budgetVariance: number;
  confidenceScore: number;
  generatedAt: string;
}

export interface ScenarioDocument {
  _id?: ObjectId;
  userId: string;
  name: string;
  description: string;
  wfoDaysPerWeek: number;
  batchingCadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  transportPreference: 'FLIGHT' | 'TRAIN' | 'DRIVE' | 'OPTIMAL';
  hotelTier: 'BUDGET' | 'STANDARD' | 'PREMIUM';
  projectedMonthlyCost: number;
  projectedYearlyCost: number;
  projectedTravelHours: number;
  savingsVsBaseline: number;
  isRecommended?: boolean;
  isCurrent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OptimizationRunDocument {
  _id?: ObjectId;
  userId: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED';
  score: number;
  potentialSavings: number;
  appliedCount: number;
  executedAt: string;
}

export interface AIConversationDocument {
  _id?: ObjectId;
  userId: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessageDocument {
  _id?: ObjectId;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action?: {
    type: string;
    label: string;
    payload: unknown;
    executed?: boolean;
  };
  createdAt: string;
}

export interface AIAssistantActionDocument {
  _id?: ObjectId;
  userId: string;
  conversationId?: string;
  actionType: string;
  payload: unknown;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  createdAt: string;
}

export interface AIMemoryDocument {
  _id?: ObjectId;
  userId: string;
  key: string;
  value: unknown;
  confidence: number;
  source: string;
  updatedAt: string;
}

export interface AuditLogDocument {
  _id?: ObjectId;
  userId: string;
  actionId: string;
  actionType: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type ScheduledJobType =
  | 'DAILY_DISPATCH'
  | 'WEEKLY_PLAN_SYNC'
  | 'UPCOMING_WFO_REMINDER'
  | 'PRICE_SYNC'
  | 'AI_INSIGHT_SCAN';

export interface ScheduledJobDocument {
  _id?: ObjectId;
  jobId: string;
  type: ScheduledJobType;
  userId: string;
  scheduledFor: string; // YYYY-MM-DD
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  lastAttemptAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'WFO_REMINDER'
  | 'TRAVEL_REMINDER'
  | 'HOLIDAY_CONFLICT'
  | 'EXPENSE_REMINDER'
  | 'OPTIMIZATION_OPPORTUNITY'
  | 'WEEKLY_SUMMARY'
  | 'AI_ACTION_COMPLETED';

export interface NotificationDocument {
  _id?: ObjectId;
  id: string;
  userId: string;
  type: NotificationType;
  dedupKey: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FCMTokenDocument {
  _id?: ObjectId;
  userId: string;
  token: string;
  deviceInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayPlanItem {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  mode: 'WFO' | 'WFH' | 'LEAVE' | 'HOLIDAY' | 'OFF' | 'TRAVEL';
  estimatedCost: number;
  notes?: string;
  isException?: boolean;
  travelSegments?: any[];
}

export interface WeeklyPlanDocument {
  _id?: ObjectId;
  userId: string;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  projectedCost: number;
  wfoDaysCount: number;
  wfhDaysCount: number;
  transitLegsCount: number;
  lodgingNightsCount: number;
  dayPlans: DayPlanItem[];
  generatedAt: string;
  updatedAt: string;
}
