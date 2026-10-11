import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarDays, Briefcase, Sparkles, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PlanLayout: React.FC = () => {
  const location = useLocation();

  const navTabs = [
    { label: 'Calendar', path: '/plan/calendar', icon: CalendarDays },
    { label: 'Trips & Bookings', path: '/plan/trips', icon: Briefcase },
    { label: 'Travel Optimizer', path: '/plan/optimizer', icon: Sparkles },
    { label: 'Scenarios', path: '/plan/scenarios', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hybrid Work & Travel Plan"
        description="Manage your office attendance schedule, trips, booking itineraries, and scenario models."
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#0c0e15] border border-slate-800 rounded-2xl overflow-x-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Child Route Content */}
      <Outlet />
    </div>
  );
};
