import { create } from 'zustand';
import type { NotificationItem } from '@/types';
import { apiClient } from '@/lib/api/client';
import { initialNotifications } from './mockData';

interface NotificationState {
  notifications: NotificationItem[];
  isLoading: boolean;
  pushPermissionStatus: 'default' | 'granted' | 'denied';
  unreadCount: () => number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  requestPushPermission: () => Promise<boolean>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: initialNotifications,
  isLoading: false,
  pushPermissionStatus:
    typeof window !== 'undefined' && 'Notification' in window
      ? (Notification.permission as 'default' | 'granted' | 'denied')
      : 'default',

  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const serverNotifs = await apiClient.listNotifications();
      if (serverNotifs && Array.isArray(serverNotifs) && serverNotifs.length > 0) {
        const formatted: NotificationItem[] = serverNotifs.map((n: any) => ({
          id: n.id || n._id,
          title: n.title,
          message: n.message,
          type: n.type === 'WFO_REMINDER' || n.type === 'TRAVEL_REMINDER' ? 'INFO'
            : n.type === 'HOLIDAY_CONFLICT' ? 'WARNING'
            : n.type === 'OPTIMIZATION_OPPORTUNITY' ? 'AI_SUGGESTION'
            : 'INFO',
          timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today',
          read: !!n.read,
          link: n.link,
        }));
        set({ notifications: formatted, isLoading: false });
        return;
      }
    } catch {
      // Offline fallback: retain initial mock notifications
    }
    set({ isLoading: false });
  },

  markAsRead: async (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    try {
      await apiClient.markNotificationRead(id);
    } catch {
      // Local fallback
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    try {
      await apiClient.markAllNotificationsRead();
    } catch {
      // Local fallback
    }
  },

  deleteNotification: async (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    try {
      await apiClient.deleteNotification(id);
    } catch {
      // Local fallback
    }
  },

  clearAll: async () => {
    set({ notifications: [] });
    try {
      await apiClient.clearNotifications();
    } catch {
      // Local fallback
    }
  },

  addNotification: (notif) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif_${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    set((state) => ({ notifications: [newNotif, ...state.notifications] }));
  },

  requestPushPermission: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      set({ pushPermissionStatus: permission });

      if (permission === 'granted') {
        // Generate simulated client push token for demo/web
        const mockToken = `fcm_web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await apiClient.registerPushToken(mockToken, navigator.userAgent);
        return true;
      }
    } catch (err) {
      console.warn('[NotificationStore] Permission request error:', err);
    }

    return false;
  },
}));
