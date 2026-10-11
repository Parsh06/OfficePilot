import React from 'react';
import { TripStatus, ReimbursableStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TripStatus | ReimbursableStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, size = 'md' }) => {
  const configs: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    PLANNED: {
      label: 'Planned',
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      icon: Clock,
    },
    CONFIRMED: {
      label: 'Confirmed',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-slate-700/30',
      text: 'text-slate-300',
      border: 'border-slate-700/50',
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: XCircle,
    },
    PENDING: {
      label: 'Pending Review',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Clock,
    },
    APPROVED: {
      label: 'Approved',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
    },
    REIMBURSED: {
      label: 'Reimbursed',
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: CheckCircle2,
    },
    REJECTED: {
      label: 'Rejected',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: AlertCircle,
    },
    NOT_APPLICABLE: {
      label: 'N/A',
      bg: 'bg-slate-800',
      text: 'text-slate-400',
      border: 'border-slate-700',
      icon: Clock,
    },
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg font-medium border',
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};
