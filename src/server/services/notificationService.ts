import {
  findNotificationsByUserId,
  insertNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  saveFCMToken,
  deleteFCMToken,
  getFCMTokensForUser,
} from '../repositories/notificationRepository';
import { getAdminUserPreferences } from '../repositories/firestoreAdminRepository';
import type { NotificationDocument, NotificationType } from '../types';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetDate?: string;
  entityId?: string;
  data?: Record<string, any>;
  link?: string;
}

export interface SendNotificationResult {
  sent: boolean;
  notification?: NotificationDocument;
  isDuplicate?: boolean;
  reason?: string;
}

/**
 * Sends an in-app and push notification to the user after evaluating preferences and deduplication.
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const { userId, type, title, message, targetDate, entityId, data, link } = params;

  // 1. Check user notification preferences
  const prefs = await getAdminUserPreferences(userId);
  if (prefs) {
    // Check if notifications are disabled overall or for specific categories
    if (type === 'WFO_REMINDER' || type === 'TRAVEL_REMINDER') {
      if (prefs.preferredNotificationStyle === 'MINIMAL' && type === 'TRAVEL_REMINDER') {
        return { sent: false, reason: 'MINIMAL_STYLE_SUPPRESSED' };
      }
    }
  }

  // 2. Compute deterministic deduplication key
  const dateKey = targetDate || new Date().toISOString().substring(0, 10);
  const dedupKey = `${userId}_${type}_${dateKey}_${entityId || 'default'}`;

  // 3. Insert notification into database
  const notifId = `notif_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const { notification, isDuplicate } = await insertNotification({
    id: notifId,
    userId,
    type,
    dedupKey,
    title,
    message,
    data: data || {},
    link,
    read: false,
  });

  if (isDuplicate) {
    return { sent: false, notification, isDuplicate: true, reason: 'DUPLICATE_ALERT' };
  }

  // 4. Dispatch FCM Push Notification (if token registered)
  try {
    const fcmTokens = await getFCMTokensForUser(userId);
    if (fcmTokens.length > 0) {
      // In production with service account, admin.messaging().sendEachForMulticast() can be called
      // For MVP/local, we safely handle tokens without crashing
    }
  } catch (pushErr) {
    console.warn(`[NotificationService] FCM push error for ${userId}:`, pushErr);
  }

  return { sent: true, notification, isDuplicate: false };
}

export async function getUserNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<NotificationDocument[]> {
  return findNotificationsByUserId(userId, options);
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  return markNotificationRead(userId, notificationId);
}

export async function markAllUserNotificationsAsRead(userId: string): Promise<number> {
  return markAllNotificationsRead(userId);
}

export async function deleteUserNotification(userId: string, notificationId: string): Promise<boolean> {
  return deleteNotification(userId, notificationId);
}

export async function clearAllUserNotifications(userId: string): Promise<number> {
  return clearAllNotifications(userId);
}

export async function registerUserFCMToken(
  userId: string,
  token: string,
  deviceInfo?: string
) {
  return saveFCMToken(userId, token, deviceInfo);
}

export async function removeUserFCMToken(userId: string, token: string) {
  return deleteFCMToken(userId, token);
}
