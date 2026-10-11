import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GroqProvider,
  buildAISystemPrompt,
  getAllAIToolDefinitions,
  executeReadTool,
  executeCalculationTool,
  executeUserWorkContextTool,
  getUserAIMemories,
  saveUserAIMemory,
  runAIChatOrchestrator,
} from '@/lib/ai';
import type { AIChatRequest } from '@/lib/ai';

// Mock backend repositories
vi.mock('@/server/repositories/firestoreAdminRepository', () => ({
  getAdminWorkSchedule: vi.fn(),
  getAdminTravelProfile: vi.fn(),
  getAdminUserProfile: vi.fn(),
  getAdminExpenseDefaults: vi.fn(),
  getAdminUserPreferences: vi.fn(),
  updateAdminUserPreferences: vi.fn(),
}));

vi.mock('@/server/repositories/workDayRepository', () => ({
  findWorkDaysByRange: vi.fn(),
}));

vi.mock('@/server/repositories/tripRepository', () => ({
  findTripsByUserId: vi.fn(),
}));

vi.mock('@/server/repositories/expenseRepository', () => ({
  findExpensesByUserId: vi.fn(),
}));

describe('AI Layer — Deterministic Tools, Security Boundary & Orchestrator', () => {
  const userId = 'usr_test_ai_secure_888';

  beforeEach(async () => {
    vi.clearAllMocks();
    const firestoreAdmin = await import('@/server/repositories/firestoreAdminRepository');
    const workDayRepo = await import('@/server/repositories/workDayRepository');
    const tripRepo = await import('@/server/repositories/tripRepository');
    const expenseRepo = await import('@/server/repositories/expenseRepository');

    vi.mocked(firestoreAdmin.getAdminWorkSchedule).mockResolvedValue({
      userId,
      homeCity: 'Mumbai',
      officeCity: 'Pune HQ',
      wfoTargetDaysPerMonth: 8,
      monday: 'WFH',
      tuesday: 'WFO',
      wednesday: 'WFO',
      thursday: 'WFO',
      friday: 'WFH',
      saturday: 'OFF',
      sunday: 'OFF',
    } as any);

    vi.mocked(firestoreAdmin.getAdminTravelProfile).mockResolvedValue({
      id: 'prof_mumbai_pune',
      userId,
      name: 'Mumbai-Pune Corridor',
      homeLocation: 'Mumbai',
      officeLocation: 'Pune HQ',
      outboundSegments: [
        { id: 's1', mode: 'train', label: 'Vande Bharat Express', estimatedCost: 850, estimatedDurationMinutes: 180, direction: 'OUTBOUND', active: true, sequence: 1 },
      ],
      returnSegments: [
        { id: 's2', mode: 'train', label: 'Vande Bharat Return', estimatedCost: 850, estimatedDurationMinutes: 180, direction: 'RETURN', active: true, sequence: 1 },
      ],
    } as any);

    vi.mocked(workDayRepo.findWorkDaysByRange).mockResolvedValue([]);
    vi.mocked(tripRepo.findTripsByUserId).mockResolvedValue([]);
    vi.mocked(expenseRepo.findExpensesByUserId).mockResolvedValue({ expenses: [], total: 0, page: 1, limit: 50 });
  });

  describe('1. Security Boundary & Authentication Tenant Scoping', () => {
    it('throws an error if unauthenticated userId is provided to orchestrator', async () => {
      await expect(
        runAIChatOrchestrator('', { message: 'How much will next week cost?' })
      ).rejects.toThrow('Unauthorized');
    });

    it('generates system prompt containing authenticated user ID and zero-hallucination mandate', () => {
      const prompt = buildAISystemPrompt({
        userId,
        userProfile: { name: 'Alex Doe', homeCity: 'Mumbai', primaryOffice: 'Pune HQ' },
        optimizationMode: 'BALANCED',
        mode: 'ASK',
      });

      expect(prompt).toContain(userId);
      expect(prompt).toContain('ZERO HALLUCINATED NUMBERS');
      expect(prompt).toContain('HIGH-LEVEL CONTEXT PREFERENCE');
      expect(prompt).toContain('SECURITY & TENANCY');
    });
  });

  describe('2. AI Provider Abstraction & Model Routing', () => {
    it('initializes GroqProvider and routes fast vs reasoning models', async () => {
      const provider = new GroqProvider({
        apiKey: '', // Test offline fallback
        fastModel: 'openai/gpt-oss-20b',
        reasoningModel: 'openai/gpt-oss-120b',
      });

      const fastRes = await provider.chat({
        messages: [{ role: 'user', content: 'What is my schedule?' }],
        modelType: 'FAST',
      });

      expect(fastRes.modelUsed).toContain('gpt-oss-20b');
      expect(fastRes.content).toBeTruthy();

      const reasoningRes = await provider.chat({
        messages: [{ role: 'user', content: 'Analyze multi-month variance' }],
        modelType: 'REASONING',
      });

      expect(reasoningRes.modelUsed).toContain('gpt-oss-120b');
    });

    it('registers all typed tools with descriptions and JSON schema parameters', () => {
      const tools = getAllAIToolDefinitions();
      expect(tools.length).toBeGreaterThanOrEqual(25);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('getUserWorkContext');
      expect(toolNames).toContain('calculateWeekCost');
      expect(toolNames).toContain('calculateMonthCost');
      expect(toolNames).toContain('compareScheduleOptions');
      expect(toolNames).toContain('getUserProfile');
      expect(toolNames).toContain('getCalendar');
    });
  });

  describe('3. Typed Read Tools & Context Tool', () => {
    it('executes getUserProfile, getWorkSchedule, getHolidays, getLeaveData', async () => {
      const profile = await executeReadTool('getUserProfile', {}, userId);
      expect(profile.userId).toBe(userId);
      expect(profile.homeCity).toBe('Mumbai');

      const schedule = await executeReadTool('getWorkSchedule', {}, userId);
      expect(schedule.tuesday).toBe('WFO');

      const holidays = await executeReadTool('getHolidays', { year: 2026 }, userId);
      expect(holidays.holidays.length).toBeGreaterThan(0);

      const leave = await executeReadTool('getLeaveData', {}, userId);
      expect(leave.annualLeaveBalance).toBe(14);
    });

    it('executes getUserWorkContext consolidating schedule, trips, corridor and forecast in one call', async () => {
      const context = await executeUserWorkContextTool(
        { startDate: '2026-10-12', endDate: '2026-10-25' },
        userId
      );

      expect(context.userId).toBe(userId);
      expect(context.attendanceSummary.totalDays).toBeGreaterThan(0);
      expect(context.travelCorridor.name).toBe('Mumbai-Pune Corridor');
      expect(context.accommodationPreference).toBeDefined();
      expect(context.expenseOverview).toBeDefined();
    });
  });

  describe('4. Deterministic Financial Calculation Tools', () => {
    it('calculates single-day cost accurately for WFO vs WFH', async () => {
      const wfoCost = await executeCalculationTool('calculateDayCost', { date: '2026-10-13', mode: 'WFO' }, userId);
      expect(wfoCost.totalCost).toBe(2150); // ₹1700 transit + ₹450 food
      expect(wfoCost.travelCost).toBe(1700);

      const wfhCost = await executeCalculationTool('calculateDayCost', { date: '2026-10-12', mode: 'WFH' }, userId);
      expect(wfhCost.totalCost).toBe(150);
      expect(wfhCost.travelCost).toBe(0);
    });

    it('calculates trip costs for PG vs Hotel stays', async () => {
      const pgTrip = await executeCalculationTool(
        'calculateTripCost',
        { startDate: '2026-10-13', endDate: '2026-10-15', includeStay: true, accommodationType: 'PG' },
        userId
      );

      expect(pgTrip.nights).toBe(2);
      expect(pgTrip.lodgingCost).toBe(3600); // 2 * 1800
      expect(pgTrip.transitCost).toBe(1700);
      expect(pgTrip.totalCost).toBe(1700 + 3600 + 3 * 450);
    });

    it('calculates week cost and month cost deterministically', async () => {
      const weekCost = await executeCalculationTool('calculateWeekCost', { startDate: '2026-10-12' }, userId);
      expect(typeof weekCost.totalCost).toBe('number');
      expect(weekCost.totalCost).toBeGreaterThan(0);

      const monthCost = await executeCalculationTool('calculateMonthCost', { month: '2026-10' }, userId);
      expect(typeof monthCost.totalCost).toBe('number');
      expect(monthCost.savingsVsDailyCommute).toBeGreaterThan(0);
    });

    it('calculates leave and holiday savings impact', async () => {
      const leaveImpact = await executeCalculationTool('calculateLeaveImpact', { leaveDate: '2026-10-15' }, userId);
      expect(leaveImpact.totalSavings).toBe(1150);
      expect(leaveImpact.travelLegsEliminated).toBe(1);

      const holidayImpact = await executeCalculationTool('calculateHolidayImpact', { holidayDate: '2026-10-14' }, userId);
      expect(holidayImpact.costSavings).toBe(1350);
    });

    it('runs scenario comparisons and savings calculations', async () => {
      const compResult = await executeCalculationTool(
        'compareScheduleOptions',
        { hypothesis: 'What if Thursday is WFH?' },
        userId
      );

      expect(compResult.hypothesis).toBe('What if Thursday is WFH?');
      expect(typeof compResult.costDiff).toBe('number');

      const tripComp = await executeCalculationTool('compareTripOptions', {}, userId);
      expect(tripComp.recommended).toContain('Option A');
      expect(tripComp.savings).toBe(500);
    });
  });

  describe('5. Structured AI Memory Management', () => {
    it('retrieves seeded user memories and saves explicit user preference memory', async () => {
      const memories = await getUserAIMemories(userId);
      expect(memories.length).toBeGreaterThanOrEqual(3);

      const saved = await saveUserAIMemory(userId, {
        category: 'SPENDING_RULE',
        key: 'preferred_budget_cap',
        value: '₹22,000 per month',
        confidence: 1.0,
        source: 'EXPLICIT_USER',
      });

      expect(saved.key).toBe('preferred_budget_cap');

      const updated = await getUserAIMemories(userId);
      const found = updated.find((m) => m.key === 'preferred_budget_cap');
      expect(found).toBeDefined();
      expect(found?.value).toBe('₹22,000 per month');
    });
  });

  describe('6. AI Chat Orchestrator End-to-End', () => {
    it('processes user questions, invokes calculation tools, and returns structured AIChatResponse', async () => {
      const request: AIChatRequest = {
        message: 'How much will next week cost?',
        mode: 'ASK',
      };

      const response = await runAIChatOrchestrator(userId, request);

      expect(response.message).toBeTruthy();
      expect(response.mode).toBe('ASK');
      expect(response.modelUsed).toBeTruthy();
      expect(Array.isArray(response.toolCalls)).toBe(true);
      expect(Array.isArray(response.recommendations)).toBe(true);
    });

    it('handles scenario query "What happens if Thursday is WFH?" with recommendations', async () => {
      const request: AIChatRequest = {
        message: 'What happens if Thursday is WFH?',
        mode: 'PLAN',
      };

      const response = await runAIChatOrchestrator(userId, request);

      expect(response.message).toBeTruthy();
      expect(response.mode).toBe('PLAN');
      expect(response.recommendations?.length).toBeGreaterThan(0);
      expect(response.recommendations?.[0].actionLink).toBe('/plan/scenarios');
    });
  });
});
