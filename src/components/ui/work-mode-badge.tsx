import React from 'react';
import { WorkMode } from '@/types';
import { cn } from '@/lib/utils';
import { Building2, Home, Palmtree, CalendarHeart, Plane } from 'lucide-react';

interface WorkModeBadgeProps {
  mode: WorkMode;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const WorkModeBadge: React.FC<WorkModeBadgeProps> = ({
  mode,
  className,
  showIcon = true,
  size = 'md',
}) => {
  const configs: Record<
    WorkMode,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    WFO: {
      label: 'Office (WFO)',
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: Building2,
    },
    WFH: {
      label: 'Remote (WFH)',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: Home,
    },
    LEAVE: {
      label: 'Leave / Off',
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      icon: Palmtree,
    },
    HOLIDAY: {
      label: 'Holiday',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: CalendarHeart,
    },
    TRAVEL: {
      label: 'In Transit',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Plane,
    },
    OFF: {
      label: 'Weekend / Off',
      bg: 'bg-slate-500/15',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      icon: Home,
    },
    FLEXIBLE: {
      label: 'Flexible',
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: Building2,
    },
  };

  const config = configs[mode] || configs.WFH;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg font-semibold border transition-colors',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <IconComponent className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
};
