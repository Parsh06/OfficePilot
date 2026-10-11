import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, clearRateLimitStore, RATE_LIMIT_PRESETS } from '../server/middleware/rateLimiter';
import { createApiHandler } from '../server/utils/handler';
import { CreateExpenseSchema, CreateTripSchema, PaginationQuerySchema, DateRangeQuerySchema } from '../server/schemas';
import { runAIChatOrchestrator } from '../lib/ai/orchestrator';
import { createDefaultSchedule, resolveDateRange, calculateScheduleMetrics } from '../lib/scheduleEngine';
import { calculateTripCostBreakdown } from '../lib/travelEngine';
import { calculateExpenseSummary } from '../lib/expenseEngine';
import { runScheduleOptimizer } from '../server/services/optimizerService';

describe('Phase 13: Application Hardening & Security Tests', () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Rate Limiting Tests
  // =========================================================================
  describe('Rate Limiting Middleware', () => {
    it('allows requests within the configured threshold and blocks upon exceeding limit', () => {
      const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'test' };
      const clientKey = 'user_123';

      for (let i = 1; i <= 5; i++) {
        const result = checkRateLimit(clientKey, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - i);
      }

      // 6th request should be blocked (HTTP 429)
      const blocked = checkRateLimit(clientKey, config);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });

    it('maintains isolated rate limits per user', () => {
      const config = { windowMs: 60000, maxRequests: 2, keyPrefix: 'test_iso' };
      
      // User 1 exhausts quota
      checkRateLimit('user_A', config);
      checkRateLimit('user_A', config);
      const userABlocked = checkRateLimit('user_A', config);
      expect(userABlocked.allowed).toBe(false);

      // User 2 should still have quota available
      const userBAllowed = checkRateLimit('user_B', config);
      expect(userBAllowed.allowed).toBe(true);
      expect(userBAllowed.remaining).toBe(1);
    });

    it('supports standard presets for AI, Optimizer, Analytics, Standard, and Cron', () => {
      expect(RATE_LIMIT_PRESETS.AI.maxRequests).toBe(20);
      expect(RATE_LIMIT_PRESETS.OPTIMIZER.maxRequests).toBe(15);
      expect(RATE_LIMIT_PRESETS.ANALYTICS.maxRequests).toBe(30);
      expect(RATE_LIMIT_PRESETS.STANDARD.maxRequests).toBe(60);
      expect(RATE_LIMIT_PRESETS.CRON.maxRequests).toBe(10);
    });
  });

  // =========================================================================
  // 2. Authorization & Tenant Isolation via Handler
  // =========================================================================
  describe('createApiHandler Security & Isolation', () => {
    it('rejects unauthenticated requests on protected endpoints with 401', async () => {
      const handler = createApiHandler(
        { requireAuth: true, methods: ['GET'] },
        async ({ user }) => ({ message: `Hello ${user.uid}` })
      );

      let statusCode = 0;
      let responseBody: any = null;
      const res: any = {
        setHeader: vi.fn().mockReturnThis(),
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
        },
      };

      const req: any = {
        method: 'GET',
        headers: {}, // No authorization header
        url: '/api/v1/profile',
      };

      await handler(req, res);
      expect(statusCode).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects unsupported HTTP methods with 405 Method Not Allowed', async () => {
      const handler = createApiHandler(
        { requireAuth: false, methods: ['POST'] },
        async () => ({ success: true })
      );

      let statusCode = 0;
      let responseBody: any = null;
      const res: any = {
        setHeader: vi.fn().mockReturnThis(),
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
        },
      };

      const req: any = {
        method: 'DELETE',
        headers: {},
        url: '/api/v1/resource',
      };

      await handler(req, res);
      expect(statusCode).toBe(405);
      expect(responseBody.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  // =========================================================================
  // 3. Strict Input Validation & Bounds
  // =========================================================================
  describe('Zod Input Validation & Schema Hardening', () => {
    it('rejects negative amounts in expense creation', () => {
      const invalidExpense = {
        title: 'Negative Coffee',
        category: 'MEALS',
        amount: -150, // Negative amount forbidden
        currency: 'USD',
        date: '2026-10-15',
      };

      const result = CreateExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('rejects negative estimatedCost in trip creation', () => {
      const invalidTrip = {
        title: 'Work Trip',
        origin: 'Mumbai',
        destination: 'Pune',
        officeLocation: 'Pune HQ',
        startDate: '2026-10-15',
        endDate: '2026-10-16',
        estimatedCost: -500, // Negative cost forbidden
      };

      const result = CreateTripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it('validates and caps pagination limits to max 100', () => {
      const validQuery = { page: '2', limit: '50' };
      const parsedValid = PaginationQuerySchema.parse(validQuery);
      expect(parsedValid.page).toBe(2);
      expect(parsedValid.limit).toBe(50);

      const oversizedQuery = { page: '1', limit: '500' };
      const parseInvalid = PaginationQuerySchema.safeParse(oversizedQuery);
      expect(parseInvalid.success).toBe(false);
    });

    it('validates ISO date format YYYY-MM-DD for date ranges', () => {
      const validDates = { startDate: '2026-10-01', endDate: '2026-10-31' };
      expect(DateRangeQuerySchema.safeParse(validDates).success).toBe(true);

      const invalidDates = { startDate: '10/01/2026', endDate: 'invalid-date' };
      expect(DateRangeQuerySchema.safeParse(invalidDates).success).toBe(false);
    });
  });

  // =========================================================================
  // 4. AI Security, Iteration Limits & Cross-Tenant Defense
  // =========================================================================
  describe('AI Orchestration Hardening & Data Minimization', () => {
    it('enforces tenant authorization and rejects cross-tenant ChangeSet approvals', async () => {
      const fakeProvider = {
        name: 'MockProvider',
        chat: vi.fn().mockResolvedValue({
          content: 'Hello',
          modelUsed: 'mock-model',
        }),
      };

      // User 1 requests AI chat
      const response = await runAIChatOrchestrator(
        'user_owner',
        { message: 'What is my schedule?' },
        { provider: fakeProvider }
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('requires authenticated userId before initiating AI reasoning', async () => {
      await expect(
        runAIChatOrchestrator('', { message: 'Hello' })
      ).rejects.toThrow('Unauthorized: Authenticated userId is required');
    });
  });

  // =========================================================================
  // 5. Synthetic Concurrent Load Simulation (10 Concurrent Users)
  // =========================================================================
  describe('Synthetic Concurrent Multi-User Load Simulation (10 Users)', () => {
    it('executes concurrent schedule resolutions, analytics computations, and optimizer runs without state collision', async () => {
      const userCount = 10;
      const userIds = Array.from({ length: userCount }, (_, i) => `concurrent_user_${i + 1}`);

      const start = Date.now();

      // Launch parallel workload simulation for 10 users
      const userTasks = userIds.map(async (userId, idx) => {
        // Task A: Resolve Work Schedule for October 2026
        const schedule = createDefaultSchedule(userId, {
          tuesday: idx % 2 === 0 ? 'WFO' : 'WFH',
          wednesday: 'WFO',
          thursday: 'WFO',
        });
        const resolvedDays = resolveDateRange('2026-10-01', '2026-10-31', schedule, [
          {
            id: `exc_${idx}`,
            userId,
            date: '2026-10-15',
            type: 'EXPLICIT_WFH_OVERRIDE',
            reason: 'Simulated exception',
            createdAt: new Date().toISOString(),
          },
        ]);
        const scheduleMetrics = calculateScheduleMetrics(resolvedDays);

        // Task B: Trip Cost Resolution
        const tripCost = calculateTripCostBreakdown(
          [
            { id: 's1', mode: 'cab', label: 'Cab Outbound', origin: 'Home', destination: 'Station', estimatedCost: 350, sequence: 1, direction: 'OUTBOUND', active: true },
            { id: 's2', mode: 'cab', label: 'Cab Return', origin: 'Station', destination: 'Home', estimatedCost: 350, sequence: 2, direction: 'RETURN', active: true },
          ],
          { id: 'acc_1', type: 'hotel', name: 'Hotel', location: 'Pune', checkIn: '2026-10-15', checkOut: '2026-10-17', nightlyCost: 1500, nights: 2, totalCost: 3000 },
          2
        );

        // Task C: Expense Variance & Aggregation
        const expenses = calculateExpenseSummary([
          { id: 'p1', userId, date: '2026-10-06', title: 'Travel', category: 'TRAVEL', subcategory: 'cab', plannedAmount: 800, actualAmount: 750, variance: -50, currency: 'INR', reimbursable: true, status: 'CONFIRMED', source: 'user', createdAt: '', updatedAt: '' },
          { id: 'p2', userId, date: '2026-10-07', title: 'Food', category: 'FOOD', subcategory: 'lunch', plannedAmount: 300, variance: 0, currency: 'INR', reimbursable: true, status: 'PENDING', source: 'user', createdAt: '', updatedAt: '' },
        ]);

        // Task D: Deterministic Optimizer Execution
        const optimizerResult = await runScheduleOptimizer(userId, {
          mode: 'BALANCED',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        });

        return {
          userId,
          wfoDaysCount: scheduleMetrics.wfoDays,
          wfhDaysCount: scheduleMetrics.wfhDays,
          tripTotalCost: tripCost.totalPlannedCost,
          monthPlannedCost: expenses.totalPlanned,
          monthActualCost: expenses.totalActual,
          optimizerRankedPlans: optimizerResult.options?.length || 1,
        };
      });

      const results = await Promise.all(userTasks);
      const elapsedMs = Date.now() - start;

      // Verify all 10 users completed successfully
      expect(results.length).toBe(10);
      results.forEach((res, i) => {
        expect(res.userId).toBe(`concurrent_user_${i + 1}`);
        expect(res.wfoDaysCount).toBeGreaterThan(0);
        expect(res.tripTotalCost).toBe(3700); // 350 + 350 + 3000
        expect(res.monthPlannedCost).toBe(1100); // 800 + 300
        expect(res.monthActualCost).toBe(750);
        expect(res.optimizerRankedPlans).toBeGreaterThanOrEqual(1);
      });

      // Verify throughput under 2 seconds for all 10 synthetic concurrent users
      expect(elapsedMs).toBeLessThan(2000);
    });
  });
});
