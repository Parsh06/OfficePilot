import { getAdminWorkSchedule, getAdminTravelProfile } from '../repositories/firestoreAdminRepository';
import { findWorkDaysByRange } from '../repositories/workDayRepository';
import {
  generateOptimizationCandidates,
  simulateWhatIfScenario,
} from '@/lib/optimizationEngine';
import type {
  OptimizationMode,
  OptimizationConstraints,
  OptimizationResult,
  ScenarioSimulationRequest,
  ScenarioSimulationResult,
} from '@/lib/optimizationEngine';
import { createDefaultSchedule, resolveDateRange } from '@/lib/scheduleEngine';
import { createDefaultExpenseTemplates } from '@/lib/expenseEngine';
import type { TravelProfile } from '@/lib/travelEngine';

/**
 * Runs the deterministic optimization engine for a user.
 */
export async function runScheduleOptimizer(
  userId: string,
  params: {
    startDate?: string;
    endDate?: string;
    mode?: OptimizationMode;
    constraints?: OptimizationConstraints;
  } = {}
): Promise<OptimizationResult> {
  const startDate = params.startDate || new Date().toISOString().substring(0, 10);
  const d = new Date(startDate);
  d.setDate(d.getDate() + 14); // Next 2-week window
  const endDate = params.endDate || d.toISOString().substring(0, 10);

  const [workScheduleDoc, travelProfileDoc, calendarWorkDays] = await Promise.all([
    getAdminWorkSchedule(userId),
    getAdminTravelProfile(userId),
    findWorkDaysByRange(userId, startDate, endDate),
  ]);

  const normalSchedule = workScheduleDoc
    ? (workScheduleDoc as any)
    : createDefaultSchedule(userId, { timezone: 'Asia/Kolkata' });

  const resolvedWorkDays = resolveDateRange(startDate, endDate, normalSchedule, []);

  // If calendar days exist, merge them
  const mergedWorkDays = resolvedWorkDays.map((rd) => {
    const override = calendarWorkDays.find((cd) => cd.date === rd.date);
    if (override) {
      return {
        ...rd,
        resolvedMode: override.mode as any,
        finalMode: override.mode as any,
        isOverridden: true,
      };
    }
    return rd;
  });

  const travelProfile: TravelProfile = travelProfileDoc
    ? (travelProfileDoc as any)
    : {
        id: 'prof_default',
        userId,
        name: 'Standard Commute Corridor',
        homeLocation: 'Mumbai',
        officeLocation: 'Pune',
        outboundSegments: [
          { id: 's_out_1', mode: 'train', label: 'Vande Bharat Express', origin: 'Mumbai', destination: 'Pune', estimatedCost: 850, sequence: 1, direction: 'OUTBOUND', active: true },
        ],
        returnSegments: [
          { id: 's_ret_1', mode: 'train', label: 'Express Return', origin: 'Pune', destination: 'Mumbai', estimatedCost: 850, sequence: 1, direction: 'RETURN', active: true },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const templates = createDefaultExpenseTemplates(userId);

  return generateOptimizationCandidates({
    userId,
    startDate,
    endDate,
    workDays: mergedWorkDays,
    exceptions: [],
    travelProfiles: [travelProfile],
    templates,
    constraints: params.constraints || {},
    mode: params.mode || 'BALANCED',
  });
}

/**
 * Simulates a What-If scenario deterministically without mutating user records.
 */
export async function simulateScenario(
  userId: string,
  request: ScenarioSimulationRequest
): Promise<ScenarioSimulationResult> {
  const startDate = request.dateOverrides[0]?.date || new Date().toISOString().substring(0, 10);
  const d = new Date(startDate);
  d.setDate(d.getDate() + 7);
  const endDate = d.toISOString().substring(0, 10);

  const [workScheduleDoc, travelProfileDoc] = await Promise.all([
    getAdminWorkSchedule(userId),
    getAdminTravelProfile(userId),
  ]);

  const normalSchedule = workScheduleDoc
    ? (workScheduleDoc as any)
    : createDefaultSchedule(userId, { timezone: 'Asia/Kolkata' });

  const resolvedWorkDays = resolveDateRange(startDate, endDate, normalSchedule, []);

  const travelProfile: TravelProfile = travelProfileDoc
    ? (travelProfileDoc as any)
    : {
        id: 'prof_default',
        userId,
        name: 'Standard Commute Corridor',
        homeLocation: 'Mumbai',
        officeLocation: 'Pune',
        outboundSegments: [
          { id: 's_out_1', mode: 'train', label: 'Vande Bharat Express', origin: 'Mumbai', destination: 'Pune', estimatedCost: 850, sequence: 1, direction: 'OUTBOUND', active: true },
        ],
        returnSegments: [
          { id: 's_ret_1', mode: 'train', label: 'Express Return', origin: 'Pune', destination: 'Mumbai', estimatedCost: 850, sequence: 1, direction: 'RETURN', active: true },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const templates = createDefaultExpenseTemplates(userId);

  return simulateWhatIfScenario({
    request,
    userId,
    currentWorkDays: resolvedWorkDays,
    travelProfiles: [travelProfile],
    templates,
  });
}
