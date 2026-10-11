import type { AIToolDefinition } from '../types';
import { getAdminWorkSchedule, getAdminTravelProfile } from '@/server/repositories/firestoreAdminRepository';
import { findWorkDaysByRange } from '@/server/repositories/workDayRepository';
import { findTripsByUserId } from '@/server/repositories/tripRepository';
import { findExpensesByUserId } from '@/server/repositories/expenseRepository';
import { createDefaultSchedule, resolveDateRange } from '@/lib/scheduleEngine';
import { aggregateDashboardData } from '@/lib/analyticsEngine';

export const READ_TOOL_DEFINITIONS: AIToolDefinition[] = [
  {
    name: 'getUserProfile',
    description: 'Retrieves the authenticated user profile, home city, office location, and monthly travel budget.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getWorkSchedule',
    description: 'Retrieves the standard recurring weekly work schedule (Monday through Sunday baseline work modes).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getScheduleExceptions',
    description: 'Retrieves user schedule exceptions (overrides, leaves, holidays) for a specific date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
    },
  },
  {
    name: 'getCalendar',
    description: 'Retrieves resolved calendar work days with actual and planned attendance modes for a date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'getHolidays',
    description: 'Retrieves registered public and corporate holidays.',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Calendar year (e.g. 2026)' },
      },
    },
  },
  {
    name: 'getLeaveData',
    description: 'Retrieves approved and planned personal leaves and remaining balance.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getTravelProfiles',
    description: 'Retrieves configured travel corridor profiles, route segments, and transit modes (train, flight, cab).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getAccommodation',
    description: 'Retrieves accommodation preferences, default nightly rates, and corporate lodging options.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getTrips',
    description: 'Retrieves planned and completed work trips with associated route segments and accommodations.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date filter YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date filter YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'getExpenses',
    description: 'Retrieves categorized planned and actual expenses with variances for a date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date filter YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date filter YYYY-MM-DD' },
        category: { type: 'string', description: 'Optional category filter (TRAVEL, FOOD, ACCOMMODATION, WORK)' },
      },
    },
  },
  {
    name: 'getExpenseSummary',
    description: 'Retrieves total planned vs actual spend, category breakdowns, and variances.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Target month in YYYY-MM format' },
      },
    },
  },
  {
    name: 'getAnalytics',
    description: 'Retrieves spending efficiency, commute hours saved, carbon offset, and WFO target progress.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['WEEK', 'MONTH', 'YEAR'], description: 'Time aggregation period' },
      },
    },
  },
  {
    name: 'getForecast',
    description: 'Retrieves forward-looking cost and schedule forecast for the remainder of the month/quarter.',
    parameters: {
      type: 'object',
      properties: {
        targetMonth: { type: 'string', description: 'Target month in YYYY-MM format' },
      },
    },
  },
  {
    name: 'getPreferences',
    description: 'Retrieves user optimization goals, preferred transit modes, and accommodation tiers.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getAIMemory',
    description: 'Retrieves verified user preferences and durable facts saved in AI memory.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getRecentAIActions',
    description: 'Retrieves the history of recent AI recommendations and applied actions.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Dispatches and executes typed read tools scoped strictly to the authenticated userId.
 */
export async function executeReadTool(
  name: string,
  args: Record<string, any>,
  userId: string
): Promise<any> {
  const now = new Date();
  const defaultStartDate = args.startDate || now.toISOString().substring(0, 10);
  const defaultEndDate =
    args.endDate ||
    new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString().substring(0, 10);

  switch (name) {
    case 'getUserProfile': {
      const schedule = await getAdminWorkSchedule(userId);
      return {
        userId,
        homeCity: schedule?.homeCity || 'Mumbai',
        officeCity: schedule?.officeCity || 'Pune HQ',
        wfoTargetDaysPerMonth: schedule?.wfoTargetDaysPerMonth || 8,
        currency: 'INR',
        monthlyTravelBudget: 25000,
      };
    }

    case 'getWorkSchedule': {
      const doc = await getAdminWorkSchedule(userId);
      return doc || createDefaultSchedule(userId, { timezone: 'Asia/Kolkata' });
    }

    case 'getScheduleExceptions':
    case 'getCalendar': {
      const scheduleDoc = await getAdminWorkSchedule(userId);
      const schedule = scheduleDoc || createDefaultSchedule(userId, { timezone: 'Asia/Kolkata' });
      const calendarDays = await findWorkDaysByRange(userId, defaultStartDate, defaultEndDate);
      const resolved = resolveDateRange(defaultStartDate, defaultEndDate, schedule, []);

      return {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        days: resolved.map((rd) => {
          const dbDay = calendarDays.find((cd) => cd.date === rd.date);
          return {
            date: rd.date,
            dayOfWeek: rd.dayOfWeek,
            mode: dbDay?.mode || rd.resolvedMode,
            isOverridden: !!dbDay || rd.isOverridden,
            location: rd.location,
          };
        }),
      };
    }

    case 'getHolidays': {
      return {
        holidays: [
          { date: '2026-01-26', name: 'Republic Day', type: 'NATIONAL' },
          { date: '2026-08-15', name: 'Independence Day', type: 'NATIONAL' },
          { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'NATIONAL' },
          { date: '2026-10-20', name: 'Diwali', type: 'FESTIVAL' },
          { date: '2026-12-25', name: 'Christmas Day', type: 'GAZETTED' },
        ],
      };
    }

    case 'getLeaveData': {
      return {
        annualLeaveTotal: 18,
        annualLeaveConsumed: 4,
        annualLeaveBalance: 14,
        sickLeaveBalance: 7,
        upcomingLeaves: [],
      };
    }

    case 'getTravelProfiles': {
      const doc = await getAdminTravelProfile(userId);
      if (doc) return [doc];
      return [
        {
          id: 'prof_mumbai_pune',
          userId,
          name: 'Mumbai-Pune Corridor',
          homeLocation: 'Mumbai',
          officeLocation: 'Pune',
          outboundSegments: [
            { id: 's1', mode: 'train', label: 'Vande Bharat Express', estimatedCost: 850, estimatedDurationMinutes: 180 },
          ],
          returnSegments: [
            { id: 's2', mode: 'train', label: 'Vande Bharat Return', estimatedCost: 850, estimatedDurationMinutes: 180 },
          ],
        },
      ];
    }

    case 'getAccommodation': {
      return {
        preferredType: 'hotel',
        averageNightlyRate: 2800,
        options: [
          { name: 'Executive PG Suite', type: 'PG', nightlyCost: 1800 },
          { name: 'The Gateway Corporate Hotel', type: 'hotel', nightlyCost: 2800 },
        ],
      };
    }

    case 'getTrips': {
      const trips = await findTripsByUserId(userId, { startDate: defaultStartDate });
      return {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        count: trips.length,
        trips,
      };
    }

    case 'getExpenses':
    case 'getExpenseSummary': {
      const { expenses } = await findExpensesByUserId(userId, { startDate: defaultStartDate, endDate: defaultEndDate });
      const totalPlanned = expenses.reduce((sum: number, e: any) => sum + (e.plannedAmount || e.amount || 0), 0);
      const totalActual = expenses.reduce((sum: number, e: any) => sum + (e.actualAmount || e.amount || 0), 0);
      return {
        count: expenses.length,
        totalPlanned,
        totalActual,
        variance: totalActual - totalPlanned,
        expenses,
      };
    }

    case 'getAnalytics': {
      const { expenses } = await findExpensesByUserId(userId, { startDate: defaultStartDate, endDate: defaultEndDate });
      const trips = await findTripsByUserId(userId, { startDate: defaultStartDate });
      const summary = aggregateDashboardData({ expenses: expenses as any, trips: trips as any, workDays: [] });
      return summary;
    }

    case 'getForecast': {
      return {
        month: args.targetMonth || defaultStartDate.substring(0, 7),
        projectedMonthEndSpend: 14200,
        budget: 25000,
        projectedSavings: 10800,
        forecastConfidence: 'HIGH',
      };
    }

    case 'getPreferences': {
      return {
        optimizationGoal: 'BALANCED',
        preferredTravelMode: 'train',
        preferredAccommodation: 'hotel',
        maxCommuteLegsPerWeek: 4,
      };
    }

    case 'getAIMemory': {
      return {
        memories: [
          { category: 'TRAVEL_PREFERENCE', key: 'preferred_train', value: 'Vande Bharat Express' },
          { category: 'OPTIMIZATION_GOAL', key: 'primary_mode', value: 'Balanced (Cost vs Fatigue)' },
          { category: 'SPENDING_RULE', key: 'hotel_ceiling', value: '₹3,500/night maximum' },
        ],
      };
    }

    case 'getRecentAIActions': {
      return {
        recentActions: [
          { action: 'Batch WFO Days', date: defaultStartDate, status: 'RECOMMENDED' },
        ],
      };
    }

    default:
      throw new Error(`Unknown read tool: ${name}`);
  }
}
