import type {
  AIActionRecord,
  AuditLogRecord,
  ChangeSet,
} from '../types';
import { getCollection } from '@/server/db/mongodb';

// In-memory fallback stores for offline/mock environments
const ACTION_STORE = new Map<string, AIActionRecord>();
const AUDIT_STORE: AuditLogRecord[] = [];
const CHANGESET_STORE = new Map<string, ChangeSet>();

/**
 * Checks if an action has already been successfully executed (Idempotency Guard).
 */
export async function isActionAlreadyExecuted(actionId: string): Promise<boolean> {
  if (!actionId) return false;

  // Check memory store
  const memAction = ACTION_STORE.get(actionId);
  if (memAction && memAction.executionStatus === 'SUCCESS') {
    return true;
  }

  // Check MongoDB collection if available
  try {
    const col = await getCollection<AIActionRecord>('aiActions');
    if (col) {
      const doc = await col.findOne({ actionId, executionStatus: 'SUCCESS' });
      return !!doc;
    }
  } catch {
    // MongoDB offline fallback
  }

  return false;
}

/**
 * Persists a ChangeSet into store.
 */
export async function saveChangeSet(changeSet: ChangeSet): Promise<void> {
  CHANGESET_STORE.set(changeSet.actionId, changeSet);

  try {
    const col = await getCollection<any>('aiChangeSets');
    if (col) {
      await col.updateOne(
        { actionId: changeSet.actionId },
        { $set: changeSet },
        { upsert: true }
      );
    }
  } catch {
    // MongoDB offline fallback
  }
}

/**
 * Retrieves a ChangeSet by actionId.
 */
export async function getChangeSet(actionId: string): Promise<ChangeSet | undefined> {
  const mem = CHANGESET_STORE.get(actionId);
  if (mem) return mem;

  try {
    const col = await getCollection<any>('aiChangeSets');
    if (col) {
      const doc = await col.findOne({ actionId });
      if (doc) return doc as any;
    }
  } catch {
    // MongoDB offline fallback
  }

  return undefined;
}

/**
 * Records an executed AI action and writes an audit log record.
 */
export async function recordAIActionExecution(
  record: Omit<AIActionRecord, 'timestamp'>
): Promise<AIActionRecord> {
  const fullRecord: AIActionRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };

  ACTION_STORE.set(record.actionId, fullRecord);

  const auditLog: AuditLogRecord = {
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    actionId: record.actionId,
    userId: record.userId,
    eventType: record.executionStatus === 'SUCCESS' ? 'ACTION_EXECUTED' : 'ACTION_FAILED',
    toolName: record.tool,
    details: {
      arguments: record.arguments,
      approvalStatus: record.approvalStatus,
      riskLevel: record.riskLevel,
      reversible: record.reversible,
    },
    timestamp: new Date().toISOString(),
  };

  AUDIT_STORE.push(auditLog);

  // Persist to MongoDB collections
  try {
    const [actionCol, auditCol] = await Promise.all([
      getCollection<AIActionRecord>('aiActions'),
      getCollection<AuditLogRecord>('auditLogs'),
    ]);

    if (actionCol) {
      await actionCol.updateOne(
        { actionId: record.actionId },
        { $set: fullRecord },
        { upsert: true }
      );
    }

    if (auditCol) {
      await auditCol.insertOne(auditLog as any);
    }
  } catch {
    // MongoDB offline fallback
  }

  return fullRecord;
}

/**
 * Retrieves the most recent executed reversible action for a user.
 */
export async function getLatestReversibleAction(userId: string): Promise<AIActionRecord | null> {
  const userActions = Array.from(ACTION_STORE.values())
    .filter((a) => a.userId === userId && a.executionStatus === 'SUCCESS' && a.reversible)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (userActions.length > 0) {
    return userActions[0];
  }

  try {
    const col = await getCollection<AIActionRecord>('aiActions');
    if (col) {
      const doc = await col.findOne(
        { userId, executionStatus: 'SUCCESS', reversible: true },
        { sort: { timestamp: -1 } }
      );
      if (doc) return doc;
    }
  } catch {
    // Fallback
  }

  return null;
}
