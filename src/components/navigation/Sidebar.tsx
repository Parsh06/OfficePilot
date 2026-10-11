import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Briefcase, 
  Sparkles, 
  BarChart3, 
  Receipt, 
  Bot, 
  Bell, 
  Settings, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Compass,
  PlaneTakeoff,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notificationStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  className,
}) => {
  const location = useLocation();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const [isPlanOpen, setIsPlanOpen] = useState(
    location.pathname.startsWith('/plan')
  );


  const isPlanActive = location.pathname.startsWith('/plan');

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col justify-between h-screen sticky top-0 border-r border-slate-800/80 bg-[#0c0e16] transition-all duration-300 z-40 select-none',
        isCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
          <NavLink to="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30">
              <PlaneTakeoff className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Office <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30">Pilot</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Smart Hybrid Mobility</span>
              </div>
            )}
          </NavLink>

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Navigation Links */}
        <nav className="p-3 space-y-1.5">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )
            }
            title="Dashboard"
          >
            <LayoutDashboard className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            {!isCollapsed && <span>Dashboard</span>}
          </NavLink>

          {/* Plan Section with Sub-navigation */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsPlanOpen(!isPlanOpen)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isPlanActive
                  ? 'text-indigo-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
              title="Plan"
            >
              <div className="flex items-center gap-3">
                <Compass className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                {!isCollapsed && <span>Plan</span>}
              </div>
              {!isCollapsed && (
                <div className="text-slate-500 group-hover:text-slate-300">
                  {isPlanOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              )}
            </button>

            {(!isCollapsed && isPlanOpen) && (
              <div className="pl-6 pr-1 py-1 space-y-1 border-l border-slate-800 ml-5 my-1">
                <NavLink
                  to="/plan/calendar"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    )
                  }
                >
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Calendar</span>
                </NavLink>

                <NavLink
                  to="/plan/trips"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    )
                  }
                >
                  <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                  <span>Trips & Bookings</span>
                </NavLink>

                <NavLink
                  to="/plan/optimizer"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    )
                  }
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Travel Optimizer</span>
                </NavLink>

                <NavLink
                  to="/plan/scenarios"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    )
                  }
                >
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  <span>Scenarios</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Expenses */}
          <NavLink
            to="/expenses"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )
            }
            title="Expenses"
          >
            <Receipt className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            {!isCollapsed && <span>Expenses</span>}
          </NavLink>

          {/* Analytics */}
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )
            }
            title="Analytics"
          >
            <BarChart3 className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            {!isCollapsed && <span>Analytics</span>}
          </NavLink>

          {/* AI Assistant */}
          <NavLink
            to="/ai"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-300 border border-purple-500/40 font-semibold shadow-sm shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )
            }
            title="AI Assistant"
          >
            <Bot className="h-5 w-5 shrink-0 text-purple-400 group-hover:text-purple-300 transition-colors" />
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span>AI Assistant</span>
                <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              </div>
            )}
          </NavLink>

          {/* Notifications */}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )
            }
            title="Notifications"
          >
            <div className="relative">
              <Bell className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  {unreadNotifications}
                </span>
              )}
            </div>
            {!isCollapsed && <span>Notifications</span>}
          </NavLink>
        </nav>
      </div>

      {/* Secondary / Settings Footer */}
      <div className="p-3 border-t border-slate-800/80 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group',
              isActive
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )
          }
          title="Settings"
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-200 transition-colors" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>

        <NavLink
          to="/help"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group',
              isActive
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )
          }
          title="Help & Support"
        >
          <HelpCircle className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-200 transition-colors" />
          {!isCollapsed && <span>Help</span>}
        </NavLink>
      </div>
    </aside>
  );
};
