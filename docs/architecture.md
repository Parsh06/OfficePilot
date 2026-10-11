# System Architecture — WorkTrip AI

## 1. High-Level Architecture Overview

WorkTrip AI is designed with a high-performance **Hybrid-Cloud Architecture** separating client-side reactive presentation, edge serverless computing, document-based configuration management, and document database persistence.

```
+-----------------------------------------------------------------------+
|                         Frontend Client (SPA)                         |
|  React 19 | Vite | Tailwind CSS v4 | Zustand Stores | React Router v7 |
+-----------------------------------------------------------------------+
              |                                            |
      (Token Auth & REST)                           (Realtime Config)
              |                                            |
              v                                            v
+-----------------------------+              +--------------------------+
|  Vercel Serverless Platform  |              |  Google Cloud Firestore  |
|  • /api/v1/* (Endpoints)    |              |  • users/{uid}           |
|  • /api/cron/* (Cron Jobs)  |              |  • workSchedules         |
|  • Middleware & Rate Limits |              |  • travelProfiles        |
+-----------------------------+              |  • scheduleExceptions    |
      |              |                       +--------------------------+
 (Connection)  (Tool Calling)                              ^
      |              |                                     |
      v              v                               (Admin Access)
+-------------+  +-------------------------+               |
|   MongoDB   |  |     Groq LLM Engine     |---------------+
|    Atlas    |  |  • Llama 3.1 8B Instant |
|  • expenses |  |  • Llama 3.3 70B Reason |
|  • trips    |  +-------------------------+
|  • audits   |
+-------------+
```

---

## 2. Core Architectural Principles

1. **Deterministic Calculations over Hallucinations**:
   - The AI Assistant never executes calculations or writes to databases arbitrarily.
   - All cost calculations, schedule changes, and travel aggregations route through typed, deterministic backend functions.
2. **Two-Phase Action Verification**:
   - Every medium-to-high risk AI action produces a structured `ChangeSet`.
   - The user inspects the before/after state and financial delta, then explicitly approves before execution.
   - Every change records an audit trail and can be reversed via `undoAIAction`.
3. **Dual Database Responsibilities**:
   - **Firestore**: User profiles, preferences, work schedules, travel profiles, and schedule exceptions.
   - **MongoDB Atlas**: Expense records, trip itineraries, what-if scenarios, audit logs, and analytics snapshots.
4. **Tenant Isolation**:
   - Direct MongoDB access from the browser client is prohibited.
   - All serverless endpoints verify Firebase JWTs and enforce query filters strictly matching `userId: user.uid`.
