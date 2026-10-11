import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useNotificationStore } from '@/stores/notificationStore';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  ExternalLink,
  ShieldCheck,
  BellRing,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const notifications = useNotificationStore((s) => s.notifications);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const pushPermissionStatus = useNotificationStore((s) => s.pushPermissionStatus);
  const requestPushPermission = useNotificationStore((s) => s.requestPushPermission);

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'AI_SUGGESTION':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      toast.success('Push notifications enabled successfully!');
    } else {
      toast.info('Push notification permission was not granted.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications & Background Alerts"
        description="Timezone-aware commute reminders, holiday conflict alerts, and automated weekly schedule sync."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await markAllAsRead();
                toast.success('Marked all as read');
              }}
              className="gap-1.5 text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                await clearAll();
                toast.info('Notifications cleared');
              }}
              className="text-xs text-slate-400 hover:text-rose-400 gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          </div>
        }
      />

      {/* Push Permission Ribbon */}
      {pushPermissionStatus !== 'granted' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-900/20 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Enable Real-Time Commute & Expense Alerts</h4>
              <p className="text-slate-300 text-xs mt-0.5">
                Receive proactive reminders before your in-office sprint days and travel ticket departures.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleEnablePush}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            Enable Push Notifications
          </Button>
        </div>
      )}

      {/* Filter Tabs & System Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors',
              filter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-[#10131e] text-slate-400 hover:text-slate-200 border border-slate-800'
            )}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors',
              filter === 'UNREAD'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-[#10131e] text-slate-400 hover:text-slate-200 border border-slate-800'
            )}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Central Daily Scheduler: <strong>Active (00:00 UTC)</strong></span>
        </div>
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications"
          description="You're all caught up on travel alerts, schedule optimizations, and expense reminders."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group flex items-start justify-between p-4 rounded-2xl border transition-all',
                item.read
                  ? 'border-slate-800/60 bg-[#0d1017] opacity-75 hover:opacity-100'
                  : 'border-indigo-500/30 bg-[#121624] shadow-md hover:border-indigo-500/50'
              )}
            >
              <div
                onClick={() => {
                  markAsRead(item.id);
                  if (item.link) navigate(item.link);
                }}
                className="flex items-start gap-3.5 flex-1 cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 mt-0.5">
                  {getIcon(item.type)}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">
                      {item.title}
                    </h4>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.timestamp}
                    </span>
                    {item.link && (
                      <span className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        Open Action <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(item.id);
                  toast.success('Notification removed');
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-all"
                title="Delete Notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
