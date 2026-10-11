import type { ResolvedWorkMode } from '@/lib/scheduleEngine';
import type { ExpenseCategory } from '@/lib/expenseEngine';
import type { RouteSegment } from '@/lib/travelEngine';

export interface WeeklyDayCardData {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // 'Monday', 'Tuesday', ...
  resolvedMode: ResolvedWorkMode | string;
  isOverride: boolean;
  overrideReason?: string;
  isHoliday: boolean;
  holidayName?: string;
  tripId?: string;
  tripTitle?: string;
  destination?: string;
  travelSegments: RouteSegment[];
  accommodationStay?: {
    name?: string;
    type: string;
    nightlyCost: number;
    location?: string;
  };
  plannedSpend: number;
  actualSpend: number;
  variance: number; // actual - planned
  status: 'PLANNED' | 'CONFIRMED' | 'MIXED';
}

export type AlertType =
  | 'UPCOMING_TRAVEL'
  | 'HOLIDAY_CONFLICT'
  | 'PLANNED_LEAVE'
  | 'UNUSUAL_EXPENSE'
  | 'OPTIMIZATION_OPPORTUNITY';

export interface DashboardAlert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  date?: string;
  severity: 'info' | 'warning' | 'success' | 'urgent';
  actionLabel?: string;
  actionHref?: string;
  metric?: string;
}

export interface CostPerWFOBreakdown {
  wfoDaysCount: number;
  totalRelevantCost: number;
  costPerWFODay: number;
  components: {
    travelCost: number;
    accommodationCost: number;
    foodPerDiemCost: number;
    otherWorkCost: number;
  };
  formulaExplanation: string;
}

export interface DeterministicForecastMetrics {
  currentMonthSpend: number;
  projectedMonthSpend: number;
  projectedYearSpend: number;
  averageWFOCost: number;
  expectedUpcomingSpend: number;
  monthlyBudget: number;
  budgetUtilizationPct: number;
  costPerWFOBreakdown: CostPerWFOBreakdown;
}

export interface StructuredInsightCandidate {
  id: string;
  type:
    | 'HIGHEST_COST_DAY'
    | 'HIGHEST_COST_CATEGORY'
    | 'UNUSUAL_EXPENSE'
    | 'UNUSUAL_SPENDING'
    | 'SAVINGS_OPPORTUNITY'
    | 'INCREASED_PG_COST'
    | 'INCREASED_TRAVEL_COST';
  title: string;
  summary: string;
  impactAmount?: number;
  suggestedAction?: string;
  confidence: number;
  dataPoints: Record<string, any>;
}

export interface DashboardSummaryResponse {
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  hero: {
    projectedWorkSpend: number;
    actualSpend: number;
    variance: number;
    monthlyBudget: number;
    budgetUtilizationPct: number;
  };
  kpis: {
    wfoDays: number;
    wfhDays: number;
    travelLegs: number;
    pgNights: number;
    averageWFOCost: number;
    currentMonthCost: number;
  };
  weekView: WeeklyDayCardData[];
  alerts: DashboardAlert[];
  insights: StructuredInsightCandidate[];
  forecast: DeterministicForecastMetrics;
}

export interface CategorySpendItem {
  category: ExpenseCategory | string;
  planned: number;
  actual: number;
  percentage: number;
}

export interface WeekdaySpendItem {
  weekday: string;
  averageCost: number;
  totalCost: number;
  count: number;
}

export interface MonthlyTrendItem {
  month: string;
  year: number;
  planned: number;
  actual: number;
  wfoDays: number;
  costPerWFO: number;
}

export interface HistoricalAnalyticsData {
  monthlyTrends: MonthlyTrendItem[];
  categoryBreakdown: CategorySpendItem[];
  weekdayComparison: WeekdaySpendItem[];
  cityComparison: { city: string; totalCost: number; tripsCount: number }[];
  wfoCostTrends: { date: string; costPerWFODay: number; plannedCost: number }[];
  summary: {
    dailyAverageSpend: number;
    weeklyAverageSpend: number;
    monthlyAverageSpend: number;
    projectedYearSpend: number;
    averageSpendPerTrip: number;
    totalTravelCost: number;
    totalAccommodationCost: number;
    totalFoodCost: number;
  };
}
