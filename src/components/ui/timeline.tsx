import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  status?: 'completed' | 'active' | 'upcoming';
  badge?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  return (
    <div className={cn('relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800', className)}>
      {items.map((item) => {
        const IconComponent = item.icon;
        const isCompleted = item.status === 'completed';
        const isActive = item.status === 'active';

        return (
          <div key={item.id} className="relative group">
            {/* Dot / Icon */}
            <div
              className={cn(
                'absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] transition-colors',
                isActive
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40 ring-4 ring-indigo-600/20'
                  : isCompleted
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              )}
            >
              {IconComponent ? (
                <IconComponent className="h-3 w-3" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </div>

            {/* Content */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">
                    {item.title}
                  </h4>
                  {item.badge}
                </div>
                {item.time && (
                  <span className="text-xs text-slate-400 font-mono">
                    {item.time}
                  </span>
                )}
              </div>

              {item.subtitle && (
                <p className="text-xs font-medium text-slate-400">
                  {item.subtitle}
                </p>
              )}

              {item.description && (
                <div className="text-xs text-slate-400 mt-1">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
