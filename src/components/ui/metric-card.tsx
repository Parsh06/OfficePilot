import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    label?: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  highlight?: boolean;
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight = false,
  badge,
  className,
  onClick,
}) => {
  return (
    <Card
      variant={highlight ? 'glow' : 'default'}
      onClick={onClick}
      className={cn(
        'p-5 transition-all duration-300 relative overflow-hidden',
        onClick && 'cursor-pointer hover:border-slate-600 hover:scale-[1.01]',
        highlight && 'border-indigo-500/40 bg-gradient-to-br from-indigo-950/20 via-[#121622] to-[#10131c]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2 pt-1">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {value}
            </h3>
            {badge}
          </div>
        </div>

        {Icon && (
          <div className={cn(
            'p-2.5 rounded-xl border',
            highlight 
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' 
              : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center justify-between text-xs pt-2 border-t border-slate-800/50">
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 font-medium',
                trend.isNeutral
                  ? 'text-slate-400'
                  : trend.isPositive
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              )}
            >
              {trend.isNeutral ? (
                <Minus className="w-3.5 h-3.5" />
              ) : trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
              {trend.label && <span className="text-slate-500 font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
