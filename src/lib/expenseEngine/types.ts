export type ExpenseCategory =
  | 'TRAVEL'
  | 'FOOD'
  | 'ACCOMMODATION'
  | 'WORK'
  | 'MISCELLANEOUS';

export type TravelSubcategory =
  | 'train'
  | 'metro'
  | 'rapido'
  | 'uber'
  | 'auto'
  | 'bus'
  | 'cab'
  | 'flight'
  | 'fuel'
  | 'parking'
  | 'other';

export type FoodSubcategory =
  | 'breakfast'
  | 'lunch'
  | 'snacks'
  | 'dinner'
  | 'beverage'
  | 'other';

export type AccommodationSubcategory =
  | 'PG'
  | 'hotel'
  | 'guest house'
  | 'other';

export type WorkSubcategory =
  | 'coworking'
  | 'supplies'
  | 'software'
  | 'client_meeting'
  | 'other';

export type MiscSubcategory =
  | 'tips'
  | 'emergency'
  | 'laundry'
  | 'other';

export type ExpenseSubcategory =
  | TravelSubcategory
  | FoodSubcategory
  | AccommodationSubcategory
  | WorkSubcategory
  | MiscSubcategory
  | string;

export type ExpenseSource = 'user' | 'generated' | 'imported' | 'AI';

export type PaymentMethod =
  | 'UPI'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'CORPORATE_CARD'
  | 'REIMBURSABLE'
  | 'OTHER';

export type ExpenseStatus = 'PLANNED' | 'CONFIRMED' | 'REIMBURSED' | 'PENDING';

export interface ExpenseRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  tripId?: string;
  workDayId?: string;
  segmentId?: string;
  category: ExpenseCategory;
  subcategory: ExpenseSubcategory;
  plannedAmount: number;
  actualAmount?: number;
  variance: number; // actualAmount - plannedAmount (negative = savings, positive = over budget)
  currency: string;
  paymentMethod?: PaymentMethod;
  reimbursable: boolean;
  status: ExpenseStatus;
  receiptUrl?: string;
  notes?: string;
  source: ExpenseSource;
  generationKey?: string; // Idempotent key to prevent duplicate generated expenses
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTemplate {
  id: string;
  userId: string;
  name: string;
  category: ExpenseCategory;
  subcategory: ExpenseSubcategory;
  defaultAmount: number;
  currency?: string;
  location?: string;
  active?: boolean;
  isPerDiem?: boolean;
  appliesToDays?: string[];
  applicableDays?: string[];
}

export interface ExpenseSummaryMetrics {
  totalPlanned: number;
  totalActual: number;
  totalSpent: number;
  totalVariance: number;
  reimbursablePending: number;
  count: number;
  plannedCount: number;
  actualCount: number;
  confirmedCount: number;
  categoryBreakdown: Record<ExpenseCategory, { planned: number; actual: number; variance: number }>;
}
