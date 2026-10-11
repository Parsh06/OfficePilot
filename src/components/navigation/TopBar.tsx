import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sparkles, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkModeBadge } from '@/components/ui/work-mode-badge';
import { useSettingsStore } from '@/stores/settingsStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuth } from '@/features/auth/useAuth';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface TopBarProps {
  onOpenCommandPalette: () => void;
  className?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommandPalette,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profile = useSettingsStore((s) => s.profile);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = React.useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const displayName = user?.displayName || profile.name || 'My Account';
  const displayEmail = user?.email || profile.email;
  const displayPhoto = user?.photoURL || profile.avatarUrl;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const getDaySchedule = useScheduleStore((s) => s.getDaySchedule);
  const todaySchedule = React.useMemo(() => getDaySchedule(todayStr), [getDaySchedule, todayStr]);
  const currentMode = todaySchedule?.mode || 'WFH';


  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#090a0f]/80 backdrop-blur-md px-4 sm:px-6">
      {/* Search trigger button (Cmd + K) */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center justify-between w-full max-w-sm rounded-xl border border-slate-800 bg-[#121520] px-3.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-all shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <span>Search trips, expenses, actions...</span>
          </div>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-700 bg-slate-800/80 px-1.5 font-mono text-[10px] font-medium text-slate-400">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Today's Work Mode Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#111420] border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">Today:</span>
          <WorkModeBadge mode={currentMode} size="sm" />
        </div>

        {/* AI Quick Button */}
        <Button
          variant="ai"
          size="sm"
          onClick={() => navigate('/ai')}
          className="hidden md:flex text-xs h-8 gap-1.5 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </Button>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-[#090a0f]" />
          )}
        </button>

        {/* User Profile Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-800/60 border border-slate-800 bg-[#121520] transition-colors outline-none focus:ring-2 focus:ring-indigo-500/40">
              <span className="text-xs font-semibold text-slate-200 hidden lg:inline">
                {displayName}
              </span>
              <img
                src={displayPhoto}
                alt={displayName}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
              />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] rounded-2xl border border-slate-800 bg-[#121520] p-1.5 shadow-2xl text-slate-200 animate-in fade-in-80"
              sideOffset={8}
              align="end"
            >
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-white">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{displayEmail}</p>
              </div>

              <DropdownMenu.Item
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-slate-800 hover:text-white cursor-pointer outline-none transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Account Settings</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={() => navigate('/onboarding')}
                className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-slate-800 hover:text-white cursor-pointer outline-none transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Preferences Setup</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-slate-800 my-1" />

              <DropdownMenu.Item
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-rose-400 hover:bg-rose-950/30 cursor-pointer outline-none transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
};
