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

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenarios: initialScenarios,
  selectedScenarioId: 'scen_01',
  activeScenarioId: 'scen_01',

  setSelectedScenarioId: (id) => set({ selectedScenarioId: id }),
  
  setActiveScenario: (id) => {
    set((state) => ({
      activeScenarioId: id,
      scenarios: state.scenarios.map((s) => ({
        ...s,
        isCurrent: s.id === id,
      })),
    }));
  },

  addScenario: (scenarioData) => {
    // Calculate realistic projection based on parameters
    const basePerTripCost = scenarioData.transportPreference === 'FLIGHT' ? 650 : scenarioData.transportPreference === 'TRAIN' ? 280 : 380;
    const hotelCostPerNight = scenarioData.hotelTier === 'PREMIUM' ? 280 : scenarioData.hotelTier === 'STANDARD' ? 175 : 120;
    
    let tripsPerMonth = 4;
    let nightsPerTrip = 1;
    let travelHoursPerMonth = 24;

    if (scenarioData.batchingCadence === 'BIWEEKLY') {
      tripsPerMonth = 2;
      nightsPerTrip = 3;
      travelHoursPerMonth = 14;
    } else if (scenarioData.batchingCadence === 'MONTHLY') {
      tripsPerMonth = 1;
      nightsPerTrip = 6;
      travelHoursPerMonth = 7;
    }

    const projectedMonthly = (tripsPerMonth * basePerTripCost) + (tripsPerMonth * nightsPerTrip * hotelCostPerNight);
    const baselineMonthly = 3020;
    const savings = Math.max(0, baselineMonthly - projectedMonthly);

    const newScenario: Scenario = {
      ...scenarioData,
      id: `scen_${Date.now()}`,
      projectedMonthlyCost: projectedMonthly,
      projectedYearlyCost: projectedMonthly * 12,
      projectedTravelHours: travelHoursPerMonth,
      savingsVsBaseline: savings,
      isRecommended: savings > 500,
      isCurrent: false,
    };

    set((state) => ({
      scenarios: [...state.scenarios, newScenario],
      selectedScenarioId: newScenario.id,
    }));

    return newScenario;
  },

  deleteScenario: (id) => {
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      selectedScenarioId: state.selectedScenarioId === id ? null : state.selectedScenarioId,
    }));
  },
}));
