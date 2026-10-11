import { getCollection } from '../db/mongodb';
import type { AuditLogDocument } from '../types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'auditLogs';

export async function logAuditEvent(
  userId: string,
  actionId: string,
  actionType: string,
  resource: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLogDocument> {
  const collection = await getCollection<AuditLogDocument>(COLLECTION_NAME);
  const logDoc: Omit<AuditLogDocument, '_id'> = {
    userId,
    actionId,
    actionType,
    resource,
    details,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
  };

  if (!collection) {
    return { ...logDoc, _id: new ObjectId() };
  }

  const result = await collection.insertOne(logDoc as any);
  return { ...logDoc, _id: result.insertedId };
}
