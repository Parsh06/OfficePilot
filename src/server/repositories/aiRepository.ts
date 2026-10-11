import { getCollection } from '../db/mongodb';
import type { AIConversationDocument, AIMessageDocument, AIMemoryDocument } from '../types';
import { ObjectId } from 'mongodb';

export async function findMessagesByConversation(
  userId: string,
  conversationId: string
): Promise<AIMessageDocument[]> {
  const collection = await getCollection<AIMessageDocument>('aiMessages');
  if (!collection) return [];
  return collection
    .find({ userId, conversationId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function insertAIMessage(message: Omit<AIMessageDocument, '_id'>): Promise<AIMessageDocument> {
  const collection = await getCollection<AIMessageDocument>('aiMessages');
  if (!collection) {
    return { ...message, _id: new ObjectId() };
  }
  const result = await collection.insertOne(message as any);
  return { ...message, _id: result.insertedId };
}

export async function getOrCreateConversation(
  userId: string,
  conversationId?: string,
  title: string = 'New Conversation'
): Promise<AIConversationDocument> {
  const collection = await getCollection<AIConversationDocument>('aiConversations');
  const now = new Date().toISOString();

  if (conversationId && collection) {
    try {
      const existing = await collection.findOne({ _id: new ObjectId(conversationId), userId });
      if (existing) return existing;
    } catch {
      // Invalid ObjectId fallback
    }
  }

  const newConv: Omit<AIConversationDocument, '_id'> = {
    userId,
    title,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (!collection) {
    return { ...newConv, _id: new ObjectId() };
  }

  const res = await collection.insertOne(newConv as any);
  return { ...newConv, _id: res.insertedId };
}

export async function findUserAIMemory(userId: string): Promise<AIMemoryDocument[]> {
  const collection = await getCollection<AIMemoryDocument>('aiMemory');
  if (!collection) return [];
  return collection.find({ userId }).toArray();
}
