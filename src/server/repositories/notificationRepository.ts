import { getCollection } from '../db/mongodb';
import type { NotificationDocument, FCMTokenDocument } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';
const FCM_TOKENS_COLLECTION = 'fcmTokens';

// In-memory fallback stores for test and offline environments
const MEMORY_NOTIFICATIONS = new Map<string, NotificationDocument>();
const MEMORY_FCM_TOKENS = new Map<string, FCMTokenDocument>();

export async function findNotificationsByUserId(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<NotificationDocument[]> {
  const collection = await getCollection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  const limit = options.limit || 50;

  if (!collection) {
    const list: NotificationDocument[] = [];
    for (const notif of MEMORY_NOTIFICATIONS.values()) {
      if (notif.userId === userId) {
        if (!options.unreadOnly || !notif.read) {
          list.push(notif);
        }
      }
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  try {
    const query: any = { userId };
    if (options.unreadOnly) query.read = false;

    return await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch {
    const list: NotificationDocument[] = [];
    for (const notif of MEMORY_NOTIFICATIONS.values()) {
      if (notif.userId === userId) {
        if (!options.unreadOnly || !notif.read) {
          list.push(notif);
        }
      }
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export async function insertNotification(
  notification: Omit<NotificationDocument, '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ notification: NotificationDocument; isDuplicate: boolean }> {
  const now = new Date().toISOString();
  const dedupKey = notification.dedupKey;

  // 1. Check deduplication key in memory store
  const existingMem = Array.from(MEMORY_NOTIFICATIONS.values()).find(
    (n) => n.userId === notification.userId && n.dedupKey === dedupKey
  );
  if (existingMem) {
    return { notification: existingMem, isDuplicate: true };
  }

  const fullDoc: NotificationDocument = {
    ...notification,
    createdAt: now,
    updatedAt: now,
  };

  const collection = await getCollection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (collection) {
    try {
      const existing = await collection.findOne({
        userId: notification.userId,
        dedupKey,
      });
      if (existing) {
        return { notification: existing, isDuplicate: true };
      }

      const res = await collection.insertOne(fullDoc as any);
      fullDoc._id = res.insertedId;
    } catch {
      // Fallback
    }
  }

  MEMORY_NOTIFICATIONS.set(notification.id, fullDoc);
  return { notification: fullDoc, isDuplicate: false };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const memNotif = MEMORY_NOTIFICATIONS.get(notificationId);
  if (memNotif && memNotif.userId === userId) {
    memNotif.read = true;
    memNotif.updatedAt = new Date().toISOString();
  }

  const collection = await getCollection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (collection) {
    try {
      const res = await collection.updateOne(
        { id: notificationId, userId },
        { $set: { read: true, updatedAt: new Date().toISOString() } }
      );
      return res.matchedCount > 0;
    } catch {
      // Fallback
    }
  }

  return !!memNotif;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  let count = 0;
  for (const notif of MEMORY_NOTIFICATIONS.values()) {
    if (notif.userId === userId && !notif.read) {
      notif.read = true;
      notif.updatedAt = new Date().toISOString();
      count++;
    }
  }

  const collection = await getCollection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (collection) {
    try {
      const res = await collection.updateMany(
        { userId, read: false },
        { $set: { read: true, updatedAt: new Date().toISOString() } }
      );
      return res.modifiedCount || count;
    } catch {
      // Fallback
    }
  }

  return count;
}

export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const memNotif = MEMORY_NOTIFICATIONS.get(notificationId);
  if (memNotif && memNotif.userId === userId) {
    MEMORY_NOTIFICATIONS.delete(notificationId);
  }

  const collection = await getCollection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (collection) {
    try {
      const res = await collection.deleteOne({ id: notificationId, userId });
      return res.deletedCount > 0;
    } catch {
      // Fallback
    }
  }

  return !!memNotif;
}

export async function clearAllNotifications(userId: string): Promise<number> {
  let count = 0;
  for (const [id, notif] of MEMORY_NOTIFICATIONS.entries()) {
    if (notif.userId === userId) {
      MEMORY_NOTIFICATIONS.delete(id);
      count++;
    }
  }

  const collection = await getCollection<NotificationDocument>(NOTIFICATIONS_COLLECTION);
  if (collection) {
    try {
      const res = await collection.deleteMany({ userId });
      return res.deletedCount || count;
    } catch {
      // Fallback
    }
  }

  return count;
}

export async function saveFCMToken(
  userId: string,
  token: string,
  deviceInfo?: string
): Promise<FCMTokenDocument> {
  const now = new Date().toISOString();
  const tokenDoc: FCMTokenDocument = {
    userId,
    token,
    deviceInfo,
    createdAt: now,
    updatedAt: now,
  };

  MEMORY_FCM_TOKENS.set(`${userId}_${token}`, tokenDoc);

  const collection = await getCollection<FCMTokenDocument>(FCM_TOKENS_COLLECTION);
  if (collection) {
    try {
      await collection.updateOne(
        { userId, token },
        { $set: tokenDoc, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );
    } catch {
      // Fallback
    }
  }

  return tokenDoc;
}

export async function deleteFCMToken(userId: string, token: string): Promise<boolean> {
  MEMORY_FCM_TOKENS.delete(`${userId}_${token}`);

  const collection = await getCollection<FCMTokenDocument>(FCM_TOKENS_COLLECTION);
  if (collection) {
    try {
      const res = await collection.deleteOne({ userId, token });
      return res.deletedCount > 0;
    } catch {
      // Fallback
    }
  }

  return true;
}

export async function getFCMTokensForUser(userId: string): Promise<string[]> {
  const tokens: string[] = [];

  for (const [key, doc] of MEMORY_FCM_TOKENS.entries()) {
    if (key.startsWith(`${userId}_`)) {
      tokens.push(doc.token);
    }
  }

  const collection = await getCollection<FCMTokenDocument>(FCM_TOKENS_COLLECTION);
  if (collection) {
    try {
      const docs = await collection.find({ userId }).toArray();
      docs.forEach((d) => {
        if (!tokens.includes(d.token)) tokens.push(d.token);
      });
    } catch {
      // Fallback
    }
  }

  return tokens;
}
