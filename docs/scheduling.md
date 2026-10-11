# Scheduling Engine & Automated Vercel Cron — WorkTrip AI

## 1. Hybrid Scheduling Model

WorkTrip AI models hybrid work using four primary work states:
1. `WFO` (Work From Office) — Triggers travel and lodging generation.
2. `WFH` (Work From Home) — No transit required.
3. `HOLIDAY` (Official Public Holiday) — Non-working day.
4. `LEAVE` (Planned Paid Leave) — Non-working day.

Exceptions override the weekly baseline schedule without modifying user defaults.

---

## 2. Vercel Cron Configuration

The cron schedule is declared in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Idempotency & Protection
- Protected by `CRON_SECRET` checked against the `Authorization: Bearer <token>` header.
- Daily jobs use unique compound keys (`jobKey_YYYY-MM-DD`) in `scheduled_jobs` collection in MongoDB to guarantee idempotent execution.
- Dispatches budget variance alerts, upcoming travel reminders, and attendance milestone summaries.
