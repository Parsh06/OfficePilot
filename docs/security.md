# Security, Privacy & Data Governance — WorkTrip AI

## 1. Security Architecture & Threat Model

WorkTrip AI adheres to strict zero-trust principles across frontend, edge API routes, and database layers:

1. **Strict Tenant Scoping**:
   - Every database query in Firestore and MongoDB is filtered by `request.auth.uid` or verified server token `user.uid`.
   - Cross-user data access is structurally impossible.
2. **API Rate Limiting**:
   - In-memory token bucket rate limiters protect against brute force and DDoS attacks.
3. **No Direct Database Access in Browser**:
   - MongoDB connection strings and Admin SDK keys are never exposed to client bundles.
4. **Deterministic AI Safety**:
   - AI actions are constrained to typed write tools with parameter validation.
   - High-risk and bulk actions strictly require user confirmation before database writes.
5. **Full Audit Logging**:
   - All profile edits, AI executions, and system schedule changes create immutable records in `audit_logs`.
6. **Data Export & Right to be Forgotten**:
   - 1-click JSON export of all user data.
   - Strong two-step account deletion purging Firestore and MongoDB collections without leaving orphaned records.
