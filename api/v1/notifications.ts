import { createApiHandler } from '@/server/utils/handler';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllUserNotificationsAsRead,
  deleteUserNotification,
  clearAllUserNotifications,
} from '@/server/services/notificationService';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'PATCH', 'DELETE'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user, req, query, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      const unreadOnly = query?.unreadOnly === 'true';
      const limit = query?.limit ? parseInt(query.limit, 10) : 50;
      return getUserNotifications(user.uid, { unreadOnly, limit });
    }

    if (method === 'PATCH') {
      const id = query?.id || (body as any)?.id;
      const markAll = query?.markAll === 'true' || (body as any)?.markAll;

      if (markAll) {
        const count = await markAllUserNotificationsAsRead(user.uid);
        return { success: true, updatedCount: count };
      }

      if (id) {
        const updated = await markNotificationAsRead(user.uid, id);
        return { success: updated };
      }

      return { success: false, message: 'Missing notification id or markAll parameter' };
    }

    if (method === 'DELETE') {
      const id = query?.id || (body as any)?.id;
      const clearAll = query?.clearAll === 'true' || (body as any)?.clearAll;

      if (clearAll) {
        const count = await clearAllUserNotifications(user.uid);
        return { success: true, deletedCount: count };
      }

      if (id) {
        const deleted = await deleteUserNotification(user.uid, id);
        return { success: deleted };
      }

      return { success: false, message: 'Missing notification id or clearAll parameter' };
    }

    return [];
  }
);
