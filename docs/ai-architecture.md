# AI Assistant Architecture & Guardrails — WorkTrip AI

## 1. AI Assistant Philosophy

WorkTrip AI does not allow the LLM to write directly or hallucinate calculations. Instead, it operates through a **Two-Phase Action Verification Engine** backed by deterministic typed tools.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Client UI
    participant Orch as AI Orchestrator
    participant Tools as Deterministic Tools
    participant DB as Firestore / Mongo

    User->>UI: "Make all Thursdays WFH for 3 months"
    UI->>Orch: POST /api/v1/ai
    Orch->>Tools: calculateScheduleImpact(dates)
    Tools-->>Orch: Financial delta: -₹9,377.50, Legs: -6
    Orch->>DB: Save ChangeSet (status: 'awaiting_confirmation')
    Orch-->>UI: Return ChangeSet with Diff & Impact
    UI-->>User: Renders Confirmation Card & Change Preview
    User->>UI: Clicks "Approve & Apply"
    UI->>Orch: POST /api/v1/ai/action (actionId)
    Orch->>Tools: executeApprovedChangeSet()
    Tools->>DB: Write verified changes & save Audit Log
    Orch-->>UI: Success confirmation + Undo Token
```

---

## 2. Autonomy Settings & Risk Classification

Actions are classified into three risk tiers:

| Action Type | Examples | Risk Level | Confirmation Required? |
|---|---|---|---|
| **Informational / Read** | `calculateWeeklyCost`, `getExpenseSummary` | Low | No (Auto-executed) |
| **Single-Day Modification** | `setWFH` for 1 day, `createExpense` | Medium | Yes in Balanced/Suggest mode |
| **Bulk Modification / Policy**| `setWFH` for 3 months, `deleteTrip` | High | Always requires explicit confirmation |

---

## 3. Two-Phase Execution & Undo Engine

- Every applied `ChangeSet` stores its `beforeState` and snapshot diff.
- The user can trigger **Undo** at any time to restore the previous state without data loss.
