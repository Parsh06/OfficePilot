import type { AIToolDefinition } from '../types';
import { executeReadTool } from './readTools';

export const CONTEXT_TOOL_DEFINITION: AIToolDefinition = {
  name: 'getUserWorkContext',
  description:
    'Retrieves consolidated high-level user work context for a date range: schedule, holidays, leave, trips, expenses, travel profiles, accommodation, and budget projections in one structured payload. Use this tool for holistic analysis.',
  parameters: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format (defaults to current week start)' },
      endDate: { type: 'string', description: 'End date in YYYY-MM-DD format (defaults to +14 days)' },
      includeForecast: { type: 'boolean', description: 'Whether to include spending forecast' },
    },
  },
};

export async function executeUserWorkContextTool(
  args: { startDate?: string; endDate?: string; includeForecast?: boolean },
  userId: string
): Promise<any> {
  const now = new Date();
  const startDate = args.startDate || now.toISOString().substring(0, 10);
  const d = new Date(startDate);
  d.setDate(d.getDate() + 14);
  const endDate = args.endDate || d.toISOString().substring(0, 10);

  const [
    profile,
    calendar,
    travelProfiles,
    accommodation,
    trips,
    expenses,
    preferences,
    forecast,
  ] = await Promise.all([
    executeReadTool('getUserProfile', {}, userId),
    executeReadTool('getCalendar', { startDate, endDate }, userId),
    executeReadTool('getTravelProfiles', {}, userId),
    executeReadTool('getAccommodation', {}, userId),
    executeReadTool('getTrips', { startDate, endDate }, userId),
    executeReadTool('getExpenses', { startDate, endDate }, userId),
    executeReadTool('getPreferences', {}, userId),
    args.includeForecast !== false
      ? executeReadTool('getForecast', { targetMonth: startDate.substring(0, 7) }, userId)
      : Promise.resolve(null),
  ]);

  const wfoDays = calendar.days?.filter((d: any) => d.mode === 'WFO') || [];
  const wfhDays = calendar.days?.filter((d: any) => d.mode === 'WFH') || [];

  return {
    userId,
    dateRange: { startDate, endDate },
    userProfile: profile,
    attendanceSummary: {
      totalDays: calendar.days?.length || 0,
      wfoDaysCount: wfoDays.length,
      wfhDaysCount: wfhDays.length,
      wfoDates: wfoDays.map((d: any) => d.date),
    },
    travelCorridor: travelProfiles[0] || null,
    accommodationPreference: accommodation,
    plannedTrips: trips.trips || [],
    expenseOverview: {
      totalPlanned: expenses.totalPlanned || 0,
      totalActual: expenses.totalActual || 0,
      variance: expenses.variance || 0,
    },
    preferences,
    forecast,
  };
}
