import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Compass, 
  Receipt, 
  Bot, 
  MoreHorizontal,
  Settings,
  HelpCircle,
  Bell,
  Sparkles,
  BarChart3,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer } from '@/components/ui/drawer';
import { useNotificationStore } from '@/stores/notificationStore';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );


  const navItems = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Plan', path: '/plan/calendar', icon: Compass },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'AI', path: '/ai', icon: Bot, isAI: true },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-[#090a0f]/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : item.path.startsWith('/plan')
              ? location.pathname.startsWith('/plan')
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 relative min-w-[56px]',
                isActive
                  ? item.isAI
                    ? 'text-purple-400 font-semibold'
                    : 'text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive && item.isAI && 'text-purple-400',
                    isActive && !item.isAI && 'text-indigo-400'
                  )}
                />
                {item.isAI && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More Menu Trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-slate-400 hover:text-slate-200 min-w-[56px]',
            ['/analytics', '/notifications', '/settings', '/help'].some((p) =>
              location.pathname.startsWith(p)
            ) && 'text-indigo-400 font-semibold'
          )}
        >
          <div className="relative">
            <MoreHorizontal className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-indigo-500" />
            )}
          </div>
          <span className="text-[10px] mt-1">More</span>
        </button>
      </nav>

      {/* More Navigation Bottom Sheet */}
      <Drawer
        open={isMoreOpen}
        onOpenChange={setIsMoreOpen}
        title="More Features & Settings"
        side="bottom"
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          <NavLink
            to="/analytics"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#121520] hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <p className="text-xs font-semibold">Analytics</p>
              <p className="text-[10px] text-slate-400">KPIs & trends</p>
            </div>
          </NavLink>

          <NavLink
            to="/plan/optimizer"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#121520] hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div className="text-left">
              <p className="text-xs font-semibold">Optimizer</p>
              <p className="text-[10px] text-slate-400">Smart routing</p>
            </div>
          </NavLink>

          <NavLink
            to="/plan/scenarios"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#121520] hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <Briefcase className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <p className="text-xs font-semibold">Scenarios</p>
              <p className="text-[10px] text-slate-400">Policy models</p>
            </div>
          </NavLink>

          <NavLink
            to="/notifications"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#121520] hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <Bell className="w-5 h-5 text-sky-400" />
            <div className="text-left">
              <p className="text-xs font-semibold">Notifications</p>
              <p className="text-[10px] text-slate-400">
                {unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All caught up'}
              </p>
            </div>
          </NavLink>

          <NavLink
            to="/settings"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#121520] hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-400" />
            <div className="text-left">
              <p className="text-xs font-semibold">Settings</p>
              <p className="text-[10px] text-slate-400">Schedule & prefs</p>
            </div>
          </NavLink>

          <NavLink
            to="/help"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#121520] hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-slate-400" />
            <div className="text-left">
              <p className="text-xs font-semibold">Help & FAQ</p>
              <p className="text-[10px] text-slate-400">Documentation</p>
            </div>
          </NavLink>
        </div>
      </Drawer>
    </>
  );
};
