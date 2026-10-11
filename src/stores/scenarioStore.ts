import { create } from 'zustand';
import { Scenario } from '@/types';
import { initialScenarios } from './mockData';

interface ScenarioState {
  scenarios: Scenario[];
  selectedScenarioId: string | null;
  activeScenarioId: string;
  setSelectedScenarioId: (id: string | null) => void;
  setActiveScenario: (id: string) => void;
  addScenario: (scenario: Omit<Scenario, 'id' | 'projectedMonthlyCost' | 'projectedYearlyCost' | 'projectedTravelHours' | 'savingsVsBaseline'>) => Scenario;
  deleteScenario: (id: string) => void;
}

const STORAGE_KEY = 'officepilot_user_scenarios';

const getInitialScenarios = (): Scenario[] => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
  }
  return initialScenarios;
};

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenarios: getInitialScenarios(),
  selectedScenarioId: 'scen_01',
  activeScenarioId: 'scen_01',

  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),
  
  setActiveScenario: (id) => {
    set((state) => {
      const updated = state.scenarios.map((s) => ({
        ...s,
        isCurrent: s.id === id,
      }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return {
        activeScenarioId: id,
        scenarios: updated,
      };
    });
  },

  addScenario: (scenarioData) => {
    // Deterministic realistic INR projection
    const roundTripTransitCost =
      scenarioData.transportPreference === 'FLIGHT'
        ? 7000
        : scenarioData.transportPreference === 'TRAIN'
        ? 1700
        : scenarioData.transportPreference === 'DRIVE'
        ? 3000
        : 1700;

    const lodgingCostPerNight =
      scenarioData.hotelTier === 'PREMIUM'
        ? 4500
        : scenarioData.hotelTier === 'STANDARD'
        ? 2800
        : 1800; // Corporate PG
    
    let tripsPerMonth = 4;
    let nightsPerTrip = 1;
    let travelHoursPerMonth = 24;

    if (scenarioData.batchingCadence === 'BIWEEKLY') {
      tripsPerMonth = 2;
      nightsPerTrip = 3;
      travelHoursPerMonth = 12;
    } else if (scenarioData.batchingCadence === 'MONTHLY') {
      tripsPerMonth = 1;
      nightsPerTrip = 6;
      travelHoursPerMonth = 6;
    }

    const transitTotal = tripsPerMonth * roundTripTransitCost;
    const lodgingTotal = tripsPerMonth * nightsPerTrip * lodgingCostPerNight;
    const foodTotal = (scenarioData.wfoDaysPerWeek * 4) * 450; // Daily meals
    const projectedMonthly = transitTotal + lodgingTotal + foodTotal;
    const baselineMonthly = 24800; // Unbatched daily commutes
    const savings = Math.max(0, baselineMonthly - projectedMonthly);

    const newScenario: Scenario = {
      ...scenarioData,
      id: `scen_${Date.now()}`,
      projectedMonthlyCost: projectedMonthly,
      projectedYearlyCost: projectedMonthly * 12,
      projectedTravelHours: travelHoursPerMonth,
      savingsVsBaseline: savings,
      isRecommended: savings > 2000,
      isCurrent: false,
    };

    set((state) => {
      const updated = [...state.scenarios, newScenario];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return {
        scenarios: updated,
        selectedScenarioId: newScenario.id,
      };
    });

    return newScenario;
  },

  deleteScenario: (id) => {
    set((state) => {
      const updated = state.scenarios.filter((s) => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return {
        scenarios: updated,
        selectedScenarioId: state.selectedScenarioId === id ? null : state.selectedScenarioId,
      };
    });
  },
}));
