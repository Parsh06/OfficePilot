import { describe, it, expect } from 'vitest';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useTripStore } from '@/stores/tripStore';
import { useScenarioStore } from '@/stores/scenarioStore';

describe('Zustand State Stores & Domain Logic', () => {
  it('updates day schedule mode properly', () => {
    const testDate = '2026-10-20';
    useScheduleStore.getState().setDayMode(testDate, 'WFO', 'Sprint Architecture', 'Seattle HQ');

    const day = useScheduleStore.getState().getDaySchedule(testDate);
    expect(day).toBeDefined();
    expect(day?.mode).toBe('WFO');
    expect(day?.notes).toBe('Sprint Architecture');
    expect(day?.location).toBe('Seattle HQ');
  });

  it('calculates total expense spending and filters', () => {
    const initialTotal = useExpenseStore.getState().getTotalSpending();
    expect(initialTotal).toBeGreaterThan(0);

    const newExpense = useExpenseStore.getState().addExpense({
      title: 'Sound Transit Light Rail',
      category: 'TRAVEL',
      subcategory: 'metro',
      amount: 6.50,
      currency: 'USD',
      date: '2026-10-09',
      reimbursable: true,
      status: 'PENDING',
    });

    expect(newExpense.id).toBeDefined();
    expect(useExpenseStore.getState().getTotalSpending()).toBe(initialTotal + 6.50);
  });

  it('adds and optimizes trips', () => {
    const initialTripCount = useTripStore.getState().trips.length;
    const newTrip = useTripStore.getState().addTrip({
      title: 'Q4 Product Design Offsite',
      origin: 'San Francisco (SFO)',
      destination: 'Austin (AUS)',
      officeLocation: 'Austin Domain Hub',
      startDate: '2026-11-15',
      endDate: '2026-11-18',
      status: 'PLANNED',
      estimatedCost: 1200,
    });

    expect(useTripStore.getState().trips.length).toBe(initialTripCount + 1);
    expect(newTrip.destination).toBe('Austin (AUS)');

    const prevScore = newTrip.aiOptimizationScore;
    useTripStore.getState().optimizeTrip(newTrip.id);
    const optimized = useTripStore.getState().getTrip(newTrip.id);
    expect(optimized?.aiOptimizationScore).toBeGreaterThanOrEqual(prevScore);
  });

  it('creates and calculates scenarios', () => {
    const scenario = useScenarioStore.getState().addScenario({
      name: 'Custom 3-Day Test',
      description: 'Test simulation model',
      wfoDaysPerWeek: 3,
      batchingCadence: 'WEEKLY',
      transportPreference: 'FLIGHT',
      hotelTier: 'STANDARD',
    });

    expect(scenario.id).toBeDefined();
    expect(scenario.projectedMonthlyCost).toBeGreaterThan(0);
    expect(scenario.projectedYearlyCost).toBe(scenario.projectedMonthlyCost * 12);
  });
});
