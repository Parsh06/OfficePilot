# API Specification — WorkTrip AI

All backend API routes are hosted under `/api/v1/*` as Vercel Serverless Functions.

---

## 1. Authentication & Rate Limiting

- **Auth**: Pass Firebase ID token in `Authorization: Bearer <id_token>` header.
- **Rate Limiting**: In-memory token bucket middleware (e.g., 60 req/min for standard queries, 10 req/min for AI).

---

## 2. Core Endpoints

### 1. User & Profile
- `GET /api/v1/profile` — Fetch user profile & hybrid preferences.
- `GET /api/v1/profile?action=export` — Download full personal JSON export.
- `PUT /api/v1/profile` — Update user profile & preferences.
- `DELETE /api/v1/profile` — Purge user account and all Firestore/Mongo data.

### 2. Schedule & Calendar
- `GET /api/v1/schedule` — Retrieve monthly schedule matrix and exceptions.
- `POST /api/v1/schedule` — Save work schedule configuration.
- `POST /api/v1/calendar` — Add/update schedule exception (WFH/WFO override, Holiday, Leave).
- `DELETE /api/v1/calendar?id=<exceptionId>` — Remove exception.

### 3. Trips & Itineraries
- `GET /api/v1/trips` — List generated work trips for user.
- `POST /api/v1/trips` — Create or update multi-leg trip itinerary.
- `DELETE /api/v1/trips?id=<tripId>` — Delete trip.

### 4. Expenses & Analytics
- `GET /api/v1/expenses` — List recorded and projected expenses.
- `POST /api/v1/expenses` — Log new expense item.
- `GET /api/v1/analytics` — Fetch aggregated financial KPIs and breakdown.

### 5. AI Assistant & Two-Phase Actions
- `POST /api/v1/ai` — Submit natural language prompt (`message`, `mode`, `history`).
- `POST /api/v1/ai/action` — Execute approved ChangeSet (`actionId`).
- `POST /api/v1/ai/undo` — Revert last verified AI action.

### 6. Health & Diagnostics
- `GET /api/v1/health` — System status, MongoDB latency, Firebase Admin status.

### 7. Vercel Cron
- `POST /api/cron/daily` — Daily reconciliation job (requires `Authorization: Bearer <CRON_SECRET>`).
