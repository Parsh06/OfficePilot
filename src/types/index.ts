export type WorkMode = 'WFO' | 'WFH' | 'OFF' | 'FLEXIBLE' | 'LEAVE' | 'HOLIDAY' | 'TRAVEL';

export type ExpenseCategory = 
  | 'FLIGHT' 
  | 'TRAIN' 
  | 'HOTEL' 
  | 'MEALS' 
  | 'COMMUTE' 
  | 'COWORKING' 
  | 'OTHER';

export type TripStatus = 'PLANNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type ReimbursableStatus = 'PENDING' | 'APPROVED' | 'REIMBURSED' | 'REJECTED' | 'NOT_APPLICABLE';

export interface DaySchedule {
  id: string;
  date: string; // YYYY-MM-DD
  mode: WorkMode;
  location?: string;
  tripId?: string;
  notes?: string;
  isLocked?: boolean;
}

export interface TripSegment {
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

export interface Trip {
  id: string;
  title: string;
  origin: string;
  destination: string;
  officeLocation: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  estimatedCost: number;
  actualCost?: number;
  segments: TripSegment[];
  aiOptimizationScore: number; // 0 - 100
  aiSavingsEstimate?: number;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  tripId?: string;
  location?: string;
  reimbursable: boolean;
  status: ReimbursableStatus;
  receiptUrl?: string;
  tags?: string[];
  createdAt: string;
}

export interface Scenario {
  id: string;
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
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'COST_SAVING' | 'SCHEDULE_OPTIMIZATION' | 'POLICY_ALERT' | 'TRAVEL_DEAL';
  potentialSavings?: number;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number; // 0 - 100
  actionLabel?: string;
  actionPayload?: Record<string, any>;
  applied?: boolean;
  dismissed?: boolean;
  createdAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: {
    type: string;
    label: string;
    payload: any;
    executed?: boolean;
  };
  recommendation?: AIRecommendation;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  department: string;
  homeCity: string;
  homeAddress?: string;
  primaryOffice: string;
  officeAddress?: string;
  preferredAirlines?: string[];
  preferredHotelChains?: string[];
  monthlyTravelBudget: number;
  wfoTargetDaysPerMonth: number;
  currency: string;
  notificationsEnabled: boolean;
}

export interface AnalyticsSummary {
  monthlyBudget: number;
  currentMonthSpending: number;
  projectedMonthEndSpending: number;
  savingsYTD: number;
  wfoDaysCompleted: number;
  wfoTargetDays: number;
  wfhDaysCompleted: number;
  travelHoursSaved: number;
  carbonOffsetKg: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'AI_SUGGESTION';
  timestamp: string;
  read: boolean;
  link?: string;
}

export * from './firestore';
