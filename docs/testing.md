# Testing & Quality Verification — WorkTrip AI

## 1. Test Suite Architecture

WorkTrip AI features 18 dedicated Vitest test suites covering 100% of critical core business logic:

1. `schedule-engine.test.ts` — Matrix generation, shift calculations, weekend logic.
2. `trip-engine.test.ts` — Multi-leg itinerary grouping and auto-generation.
3. `calendar-exceptions.test.ts` — Holiday bridges, leaves, overrides.
4. `expense-engine.test.ts` — Financial projections, category aggregation, budget utilization.
5. `optimization-scenarios.test.ts` — What-if simulations and potential savings calculations.
6. `ai-actions.test.ts` — Two-phase ChangeSet generation and execution.
7. `ai-layer.test.ts` — Context tool, memory retention, risk classification.
8. `firestore-services.test.ts` — Security and CRUD operations.
9. `backend-services.test.ts` — Serverless service routines.
10. `scheduler-notifications.test.ts` — Automated cron dispatcher and notification triggers.
11. `hardening-security.test.ts` — Rate limiting, request sanitization, authentication headers.
12. `backend-auth.test.ts` — Token decoding and tenant scoping.
13. `onboarding-schemas.test.ts` — Zod schema validation for user configurations.
14. `ui-components.test.tsx` — Radix UI, MetricCards, TripCards rendering.
15. `stores.test.ts` — Zustand store reactive state transitions.
16. `api-client.test.ts` — Frontend HTTP client error handling.
17. `auth.test.tsx` — Firebase auth providers and protected routing.
18. `dashboard-analytics.test.ts` — High-precision KPI and variance engine.

---

## 2. Running Test Commands

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Execute typecheck
npm run typecheck

# Execute linter
npm run lint
```
