# Database Architecture & Responsibilities — WorkTrip AI

## 1. Dual Database Strategy

WorkTrip AI separates storage responsibilities between **Google Cloud Firestore** (for low-latency user configurations & reactive client synchronization) and **MongoDB Atlas** (for relational aggregation, financial analytics, change audit trails, and automated batch cron jobs).

```
+-------------------------------------------------------------+
|                     DATABASE MAPPING                        |
+-------------------------------------------------------------+
| FIRESTORE:                                                  |
|   • users/{uid}                     (User Profile)          |
|   • users/{uid}/preferences/main    (AI & App Settings)     |
|   • users/{uid}/workSchedules/main  (Hybrid Schedule)       |
|   • users/{uid}/travelProfiles/main (Route & Transit Config)|
|   • users/{uid}/scheduleExceptions/*(Calendar Overrides)    |
|                                                             |
| MONGODB ATLAS:                                              |
|   • expenses                        (Financial Actuals)     |
|   • trips                           (Multi-Leg Itineraries) |
|   • scenarios                       (What-If Simulations)   |
|   • audit_logs                      (System & AI Audits)    |
|   • change_sets                     (Proposed AI Actions)   |
|   • notifications                   (In-App Alerts)         |
|   • scheduled_jobs                  (Cron Execution Logs)   |
+-------------------------------------------------------------+
```

---

## 2. MongoDB Atlas Indexing Strategy

All production collections have compound indexes ensuring queries are bounded and scoped by `userId`:

1. **`expenses`**:
   - `{ userId: 1, date: -1 }` (Primary time-series retrieval)
   - `{ userId: 1, category: 1 }` (Category breakdown)
   - `{ userId: 1, tripId: 1 }` (Trip aggregation)
2. **`trips`**:
   - `{ userId: 1, startDate: 1, endDate: 1 }` (Range queries)
   - `{ userId: 1, status: 1 }` (Active trip tracking)
3. **`change_sets`**:
   - `{ actionId: 1 }` (Unique constraint)
   - `{ userId: 1, status: 1, createdAt: -1 }`
4. **`audit_logs`**:
   - `{ userId: 1, timestamp: -1 }`
5. **`scheduled_jobs`**:
   - `{ jobKey: 1, executionDate: 1 }` (Unique constraint for idempotency)

---

## 3. Serverless Connection Pooling

MongoDB connections in serverless functions are cached using `globalThis._mongoConnectionCache`. This prevents connection exhaustion during concurrent traffic spikes while enforcing a max pool size of 10.
