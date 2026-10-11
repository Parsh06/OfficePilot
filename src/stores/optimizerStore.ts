import { create } from 'zustand';
import type {
  OptimizationMode,
  OptimizationConstraints,
  OptimizationResult,
  ScenarioSimulationRequest,
  ScenarioSimulationResult,
  ScheduleCandidate,
} from '@/lib/optimizationEngine';
import {
  generateOptimizationCandidates,
  simulateWhatIfScenario,
} from '@/lib/optimizationEngine';
import { useScheduleStore } from './scheduleStore';
import { useTripStore } from './tripStore';
import { useExpenseStore } from './expenseStore';
import { useSettingsStore } from './settingsStore';
import { resolveDateRange } from '@/lib/scheduleEngine';

interface OptimizerState {
  mode: OptimizationMode;
  constraints: OptimizationConstraints;
  activeResult: OptimizationResult | null;
  activeSimulation: ScenarioSimulationResult | null;
  isLoading: boolean;
  selectedOptionId: string | null;

  // Setters
  setMode: (mode: OptimizationMode) => void;
  setConstraints: (constraints: Partial<OptimizationConstraints>) => void;
  setSelectedOptionId: (id: string | null) => void;

  // Actions
  runOptimization: (params?: {
    startDate?: string;
    endDate?: string;
    mode?: OptimizationMode;
  }) => Promise<OptimizationResult>;
  runSimulation: (request: ScenarioSimulationRequest) => Promise<ScenarioSimulationResult>;
  applyCandidatePlan: (candidate: ScheduleCandidate) => Promise<void>;
}

export const useOptimizerStore = create<OptimizerState>((set, get) => ({
  mode: 'BALANCED',
  constraints: {
    minWfoDays: 2,
    allowOvernightStay: true,
  },
  activeResult: null,
  activeSimulation: null,
  isLoading: false,
  selectedOptionId: null,

  setMode: (mode) => set({ mode }),
  setConstraints: (newConstraints) =>
    set((state) => ({ constraints: { ...state.constraints, ...newConstraints } })),
  setSelectedOptionId: (id) => set({ selectedOptionId: id }),

  runOptimization: async (params = {}) => {
    set({ isLoading: true });
    const targetMode = params.mode || get().mode;
    const scheduleState = useScheduleStore.getState();
    const tripState = useTripStore.getState();
    const expenseState = useExpenseStore.getState();
    const settingsState = useSettingsStore.getState();

    const startDate = params.startDate || new Date().toISOString().substring(0, 10);
    const d = new Date(startDate);
    d.setDate(d.getDate() + 14);
    const endDate = params.endDate || d.toISOString().substring(0, 10);

    const normalSchedule = scheduleState.normalSchedule;
    const resolvedWorkDays = resolveDateRange(startDate, endDate, normalSchedule, scheduleState.exceptions);

    // Run deterministic candidate generator
    const result = generateOptimizationCandidates({
      userId: settingsState.profile.id || 'demo-user',
      startDate,
      endDate,
      workDays: resolvedWorkDays,
      exceptions: scheduleState.exceptions,
      travelProfiles: tripState.travelProfiles,
      templates: expenseState.templates,
      constraints: get().constraints,
      mode: targetMode,
    });

    set({
      activeResult: result,
      selectedOptionId: result.recommendedOption.id,
      mode: targetMode,
      isLoading: false,
    });

    return result;
  },

  runSimulation: async (request: ScenarioSimulationRequest) => {
    set({ isLoading: true });
    const scheduleState = useScheduleStore.getState();
    const tripState = useTripStore.getState();
    const expenseState = useExpenseStore.getState();
    const settingsState = useSettingsStore.getState();

    const startDate = request.startDate || request.dateOverrides[0]?.date || new Date().toISOString().substring(0, 10);
    let endDate = request.endDate;
    if (!endDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 7);
      endDate = d.toISOString().substring(0, 10);
    }

    const normalSchedule = scheduleState.normalSchedule;
    const resolvedWorkDays = resolveDateRange(startDate, endDate, normalSchedule, scheduleState.exceptions);

    const simResult = simulateWhatIfScenario({
      request,
      userId: settingsState.profile.id || 'demo-user',
      currentWorkDays: resolvedWorkDays,
      travelProfiles: tripState.travelProfiles,
      templates: expenseState.templates,
    });

    set({ activeSimulation: simResult, isLoading: false });
    return simResult;
  },

  applyCandidatePlan: async (candidate: ScheduleCandidate) => {
    const scheduleState = useScheduleStore.getState();
    const tripState = useTripStore.getState();

    // 1. Apply date overrides to scheduleStore
    for (const wd of candidate.workDays) {
      if (wd.isOverridden || wd.resolvedMode === 'WFO' || wd.resolvedMode === 'WFH') {
        scheduleState.setDayMode(wd.date, wd.resolvedMode as any, `Applied via ${candidate.title}`);
      }
    }

    // 2. Add or update trips to tripStore
    for (const trip of candidate.trips) {
      tripState.addTrip({
        title: trip.title,
        origin: trip.origin,
        destination: trip.destination,
        officeLocation: trip.officeLocation,
        startDate: trip.startDate,
        endDate: trip.endDate,
        status: 'CONFIRMED',
        estimatedCost: trip.plannedCost,
        workDays: trip.workDays,
        travelSegments: trip.travelSegments,
        accommodation: trip.accommodation,
        nightsCount: trip.nightsCount,
      });
    }
  },
}));
