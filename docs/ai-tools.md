# Deterministic AI Tools Reference — WorkTrip AI

## 1. Tool Categories

Tools are registered with strict JSON schemas and deterministic TypeScript handlers:

### Read & Calculation Tools
- `calculateWeeklyCost(weekOffset)`: Computes exact transit and lodging costs for a target week based on WFO/WFH distribution.
- `calculateMonthlyCost(monthOffset)`: Forecasts monthly spend vs budget limit.
- `calculateScheduleImpact(dates, targetMode)`: Evaluates financial savings, night deltas, and transit leg variations for proposed schedule changes.
- `getWFOCostBreakdown()`: Pinpoints the most expensive commuting day of the week with breakdown (transit, PG, food).
- `runCostOptimizer(targetSavings)`: Discovers schedule consolidation and ticket tier optimizations.
- `simulateScenario(date, mode)`: Simulates hypothetical attendance tweaks without modifying database state.
- `getAuditHistory(limit)`: Retrieves recent verified changes made to the user's account.

### Write Tools (Two-Phase Execution)
- `setWFH(date | dates, reason)`: Creates WFH exceptions.
- `setWFO(date | dates, reason)`: Creates in-office attendance exceptions.
- `createExpense(data)`: Logs a new verified expense record.
- `deleteExpense(expenseId)`: Deletes an expense.
- `createTrip(data)`: Creates a multi-leg trip itinerary.
- `deleteTrip(tripId)`: Removes a trip.
- `undoAIAction()`: Reverses the most recent action.
