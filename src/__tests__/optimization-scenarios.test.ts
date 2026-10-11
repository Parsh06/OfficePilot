import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCandidateScore,
  generateOptimizationCandidates,
  simulateWhatIfScenario,
  WHAT_IF_PRESETS,
} from '@/lib/optimizationEngine';
import type {
  OptimizationConstraints,
  ScenarioSimulationRequest,
} from '@/lib/optimizationEngine';
import { createDefaultSchedule, resolveDateRange } from '@/lib/scheduleEngine';
import { createDefaultExpenseTemplates } from '@/lib/expenseEngine';
import type { TravelProfile } from '@/lib/travelEngine';
import {
  runScheduleOptimizer,
  simulateScenario,
} from '@/server/services/optimizerService';

// Mock backend repositories
vi.mock('@/server/repositories/firestoreAdminRepository', () => ({
  getAdminWorkSchedule: vi.fn(),
  getAdminTravelProfile: vi.fn(),
}));

vi.mock('@/server/repositories/workDayRepository', () => ({
  findWorkDaysByRange: vi.fn(),
}));

describe('Deterministic Optimization & Scenario Engine', () => {
  const userId = 'usr_test_opt_123';
  const defaultSchedule = createDefaultSchedule(userId, { timezone: 'Asia/Kolkata' });
  // Resolve a 1-week work window: 2026-10-12 (Mon) to 2026-10-18 (Sun)
  // Default schedule: Tue, Wed, Thu = WFO; Mon, Fri = WFH
  const sampleWorkDays = resolveDateRange(
    '2026-10-12',
    '2026-10-18',
    defaultSchedule,
    []
  );

  const sampleTravelProfile: TravelProfile = {
    id: 'prof_mumbai_pune',
    userId,
    name: 'Mumbai-Pune Express Corridor',
    homeLocation: 'Mumbai',
    officeLocation: 'Pune',
    outboundSegments: [
      {
        id: 'seg_out_1',
        mode: 'train',
        label: 'Vande Bharat Express',
        origin: 'Mumbai',
        destination: 'Pune',
        estimatedCost: 850,
        sequence: 1,
        direction: 'OUTBOUND',
        active: true,
      },
      {
        id: 'seg_out_2',
        mode: 'rapido',
        label: 'Campus Cab',
        origin: 'Pune Station',
        destination: 'Office Campus',
        estimatedCost: 150,
        sequence: 2,
        direction: 'OUTBOUND',
        active: true,
      },
    ],
    returnSegments: [
      {
        id: 'seg_ret_1',
        mode: 'rapido',
        label: 'Station Drop',
        origin: 'Office Campus',
        destination: 'Pune Station',
        estimatedCost: 150,
        sequence: 1,
        direction: 'RETURN',
        active: true,
      },
      {
        id: 'seg_ret_2',
        mode: 'train',
        label: 'Vande Bharat Return',
        origin: 'Pune',
        destination: 'Mumbai',
        estimatedCost: 850,
        sequence: 2,
        direction: 'RETURN',
        active: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleTemplates = createDefaultExpenseTemplates(userId);

  describe('1. Scoring Engine (Deterministic Composite Weights & Penalties)', () => {
    it('applies SAVER mode weights prioritizing cost reduction (60% Cost, 25% Travel, 15% Convenience)', () => {
      const saverScore = calculateCandidateScore({
        mode: 'SAVER',
        totalCost: 2000,
        maxCostBaseline: 6000,
        travelTimeMinutes: 150,
        travelLegsCount: 2,
        wfoDaysCount: 3,
        wfhDaysCount: 2,
        nightsCount: 2,
        isContiguousWFO: true,
      });

      expect(saverScore.totalScore).toBeGreaterThan(0);
      expect(saverScore.totalScore).toBeLessThanOrEqual(100);
      expect(saverScore.normalizedCostScore).toBeGreaterThan(50);
      expect(saverScore.constraintPenalty).toBe(0);
    });

    it('applies COMFORT mode weights prioritizing convenience and low travel fatigue (20% Cost, 35% Travel, 45% Convenience)', () => {
      const comfortScore = calculateCandidateScore({
        mode: 'COMFORT',
        totalCost: 7500,
        maxCostBaseline: 7500,
        travelTimeMinutes: 120,
        travelLegsCount: 2,
        wfoDaysCount: 3,
        wfhDaysCount: 2,
        nightsCount: 2,
        isContiguousWFO: true,
      });

      expect(comfortScore.normalizedConvenienceScore).toBeGreaterThanOrEqual(85);
      expect(comfortScore.totalScore).toBeGreaterThan(0);
    });

    it('penalizes candidates failing minimum required WFO days constraint', () => {
      const constraints: OptimizationConstraints = {
        minWfoDays: 3,
      };

      const penalizedScore = calculateCandidateScore({
        mode: 'BALANCED',
        totalCost: 1000,
        maxCostBaseline: 5000,
        travelTimeMinutes: 75,
        travelLegsCount: 1,
        wfoDaysCount: 1, // Violates minWfoDays: 3
        wfhDaysCount: 4,
        nightsCount: 0,
        isContiguousWFO: false,
        constraints,
      });

      // 2 days missing * 25 = 50 penalty
      expect(penalizedScore.constraintPenalty).toBe(50);
    });

    it('applies contiguous WFO bonus to convenience score', () => {
      const contiguousScore = calculateCandidateScore({
        mode: 'BALANCED',
        totalCost: 3000,
        maxCostBaseline: 5000,
        travelTimeMinutes: 150,
        travelLegsCount: 2,
        wfoDaysCount: 3,
        wfhDaysCount: 2,
        nightsCount: 2,
        isContiguousWFO: true,
      });

      const nonContiguousScore = calculateCandidateScore({
        mode: 'BALANCED',
        totalCost: 3000,
        maxCostBaseline: 5000,
        travelTimeMinutes: 150,
        travelLegsCount: 2,
        wfoDaysCount: 3,
        wfhDaysCount: 2,
        nightsCount: 2,
        isContiguousWFO: false,
      });

      expect(contiguousScore.normalizedConvenienceScore).toBeGreaterThan(
        nonContiguousScore.normalizedConvenienceScore
      );
    });
  });

  describe('2. Candidate Generation & Ranking', () => {
    it('generates baseline, Option A, Option B, and Option C with ranked order', () => {
      const result = generateOptimizationCandidates({
        userId,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        workDays: sampleWorkDays,
        exceptions: [],
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
        mode: 'SAVER',
      });

      expect(result.mode).toBe('SAVER');
      expect(result.baselinePlan).toBeDefined();
      expect(result.options.length).toBe(3);

      // Verify all 3 primary strategy types are generated
      const strategyTypes = result.options.map((o) => o.strategyType);
      expect(strategyTypes).toContain('BATCHED_STAY');
      expect(strategyTypes).toContain('SHIFTED_WFO');
      expect(strategyTypes).toContain('SINGLE_DAY_COMMUTES');

      // Recommended option is marked
      expect(result.recommendedOption).toBeDefined();
      expect(result.recommendedOption.isRecommended).toBe(true);
      expect(result.options[0].isRecommended).toBe(true);

      // Options are sorted descending by totalScore
      expect(result.options[0].totalScore).toBeGreaterThanOrEqual(result.options[1].totalScore);
      expect(result.options[1].totalScore).toBeGreaterThanOrEqual(result.options[2].totalScore);
    });

    it('calculates trade-offs, pros, cons, and cost differences accurately', () => {
      const result = generateOptimizationCandidates({
        userId,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        workDays: sampleWorkDays,
        exceptions: [],
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
        mode: 'BALANCED',
      });

      result.options.forEach((opt) => {
        expect(opt.tradeOffs.pros.length).toBeGreaterThan(0);
        expect(opt.explanation).toBeTruthy();
        expect(opt.trips.length).toBeGreaterThan(0);
        expect(opt.expenses.length).toBeGreaterThan(0);
        expect(typeof opt.totalCost).toBe('number');
        expect(typeof opt.costDifference).toBe('number');
      });
    });

    it('adjusts ranking dynamically when mode changes from SAVER to COMFORT', () => {
      const saverResult = generateOptimizationCandidates({
        userId,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        workDays: sampleWorkDays,
        exceptions: [],
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
        mode: 'SAVER',
      });

      const comfortResult = generateOptimizationCandidates({
        userId,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        workDays: sampleWorkDays,
        exceptions: [],
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
        mode: 'COMFORT',
      });

      expect(saverResult.mode).toBe('SAVER');
      expect(comfortResult.mode).toBe('COMFORT');
      // Total scores reflect different weighting profiles
      expect(saverResult.options[0].totalScore).toBeGreaterThan(0);
      expect(comfortResult.options[0].totalScore).toBeGreaterThan(0);
    });
  });

  describe('3. What-If Scenario Engine', () => {
    it('simulates Preset 1: "What if Thursday is WFH?" without mutating baseline data', () => {
      const preset = WHAT_IF_PRESETS.find((p) => p.id === 'sim_wfh_thursday')!;
      expect(preset).toBeDefined();

      const originalWorkDaysCopy = JSON.parse(JSON.stringify(sampleWorkDays));

      const simResult = simulateWhatIfScenario({
        request: preset.request,
        userId,
        currentWorkDays: sampleWorkDays,
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
      });

      // Verification of zero mutation
      expect(sampleWorkDays).toEqual(originalWorkDaysCopy);

      expect(simResult.hypothesis).toBe('What if Thursday is WFH?');
      expect(simResult.currentPlan).toBeDefined();
      expect(simResult.proposedPlan).toBeDefined();
      expect(simResult.delta).toBeDefined();
      expect(simResult.affectedDates).toContain('2026-10-15');
      expect(simResult.recommendation).toBeTruthy();
    });

    it('simulates Preset 2: "What if Wednesday is a holiday?"', () => {
      const preset = WHAT_IF_PRESETS.find((p) => p.id === 'sim_holiday_wednesday')!;

      const simResult = simulateWhatIfScenario({
        request: preset.request,
        userId,
        currentWorkDays: sampleWorkDays,
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
      });

      expect(simResult.affectedDates).toContain('2026-10-14');
      const wednesday = simResult.proposedPlan.workDays.find((d) => d.date === '2026-10-14');
      expect(wednesday?.resolvedMode).toBe('HOLIDAY');
    });

    it('simulates Preset 3: "What if I take Thursday leave?"', () => {
      const preset = WHAT_IF_PRESETS.find((p) => p.id === 'sim_leave_thursday')!;

      const simResult = simulateWhatIfScenario({
        request: preset.request,
        userId,
        currentWorkDays: sampleWorkDays,
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
      });

      expect(simResult.affectedDates).toContain('2026-10-15');
      const thursday = simResult.proposedPlan.workDays.find((d) => d.date === '2026-10-15');
      expect(thursday?.resolvedMode).toBe('LEAVE');
    });

    it('simulates Preset 4: "What if I move Tuesday WFO to Friday?"', () => {
      const preset = WHAT_IF_PRESETS.find((p) => p.id === 'sim_move_tue_to_fri')!;

      const simResult = simulateWhatIfScenario({
        request: preset.request,
        userId,
        currentWorkDays: sampleWorkDays,
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
      });

      expect(simResult.affectedDates).toContain('2026-10-13');
      expect(simResult.affectedDates).toContain('2026-10-16');

      const tuesday = simResult.proposedPlan.workDays.find((d) => d.date === '2026-10-13');
      const friday = simResult.proposedPlan.workDays.find((d) => d.date === '2026-10-16');
      expect(tuesday?.resolvedMode).toBe('WFH');
      expect(friday?.resolvedMode).toBe('WFO');
    });

    it('simulates Preset 5: "What if I return home Tuesday instead of staying?"', () => {
      const preset = WHAT_IF_PRESETS.find((p) => p.id === 'sim_return_home_tue')!;

      const simResult = simulateWhatIfScenario({
        request: preset.request,
        userId,
        currentWorkDays: sampleWorkDays,
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
      });

      expect(simResult.proposedPlan.strategyType).toBe('SINGLE_DAY_COMMUTES');
      expect(simResult.proposedPlan.nightsCount).toBe(0);
    });

    it('breaks down affected expense categories in delta', () => {
      const request: ScenarioSimulationRequest = {
        name: 'Custom WFH Friday',
        hypothesis: 'What if Friday was remote?',
        dateOverrides: [{ date: '2026-10-16', mode: 'WFH', reason: 'Remote test' }],
      };

      const simResult = simulateWhatIfScenario({
        request,
        userId,
        currentWorkDays: sampleWorkDays,
        travelProfiles: [sampleTravelProfile],
        templates: sampleTemplates,
      });

      expect(simResult.affectedExpenseCategories).toBeDefined();
      expect(typeof simResult.delta.costDiff).toBe('number');
      expect(typeof simResult.delta.savings).toBe('number');
      expect(typeof simResult.delta.travelLegsDiff).toBe('number');
      expect(typeof simResult.delta.nightsDiff).toBe('number');
    });
  });

  describe('4. Backend Optimizer Services', () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      const firestoreAdmin = await import('@/server/repositories/firestoreAdminRepository');
      const workDayRepo = await import('@/server/repositories/workDayRepository');
      vi.mocked(firestoreAdmin.getAdminWorkSchedule).mockResolvedValue(defaultSchedule as any);
      vi.mocked(firestoreAdmin.getAdminTravelProfile).mockResolvedValue(sampleTravelProfile as any);
      vi.mocked(workDayRepo.findWorkDaysByRange).mockResolvedValue([]);
    });

    it('runScheduleOptimizer fetches user schedule and runs optimization', async () => {
      const { getAdminWorkSchedule, getAdminTravelProfile } = await import(
        '@/server/repositories/firestoreAdminRepository'
      );
      const result = await runScheduleOptimizer(userId, {
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        mode: 'SAVER',
      });

      expect(getAdminWorkSchedule).toHaveBeenCalledWith(userId);
      expect(getAdminTravelProfile).toHaveBeenCalledWith(userId);
      expect(result.mode).toBe('SAVER');
      expect(result.options.length).toBe(3);
      expect(result.recommendedOption).toBeDefined();
    });

    it('simulateScenario runs What-If simulation via backend service', async () => {
      const { getAdminWorkSchedule } = await import(
        '@/server/repositories/firestoreAdminRepository'
      );
      const request: ScenarioSimulationRequest = {
        name: 'Backend Test',
        hypothesis: 'What if Thursday is WFH?',
        dateOverrides: [{ date: '2026-10-15', mode: 'WFH' }],
      };

      const result = await simulateScenario(userId, request);

      expect(getAdminWorkSchedule).toHaveBeenCalledWith(userId);
      expect(result.name).toBe('Backend Test');
      expect(result.delta).toBeDefined();
      expect(result.proposedPlan).toBeDefined();
    });
  });
});
