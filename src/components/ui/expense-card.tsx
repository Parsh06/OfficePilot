import React from 'react';
import type { ExpenseRecord } from '@/lib/expenseEngine';
import type { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import { 
  Plane, 
  Train, 
  Hotel, 
  Utensils, 
  Car, 
  Building, 
  Receipt,
  Tag,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseCardProps {
  expense: ExpenseRecord | Expense;
  onClick?: () => void;
  className?: string;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onClick,
  className,
}) => {
  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    FLIGHT: Plane,
    TRAIN: Train,
    HOTEL: Hotel,
    MEALS: Utensils,
    COMMUTE: Car,
    COWORKING: Building,
    TRAVEL: Train,
    FOOD: Utensils,
    ACCOMMODATION: Hotel,
    WORK: Building,
    MISCELLANEOUS: Receipt,
    OTHER: Receipt,
  };

  const IconComponent = categoryIcons[expense.category] || Receipt;
  
  const expRecord = expense as ExpenseRecord;
  const planned = expRecord.plannedAmount ?? (expense as Expense).amount ?? 0;
  const actual = expRecord.actualAmount;
  const variance = expRecord.variance ?? 0;
  const isPendingActual = actual === undefined || actual === null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-[#121520] hover:bg-[#161a28] hover:border-indigo-500/30 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 text-indigo-400 group-hover:scale-105 transition-transform">
          <IconComponent className="h-5 w-5" />
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
              {expense.title}
            </h4>
            {expense.reimbursable && (
              <StatusBadge status={expense.status} size="sm" />
            )}
            {expRecord.source === 'AI' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
            {expRecord.source === 'generated' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                <Building2 className="w-2.5 h-2.5" /> Generated
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{formatDate(expense.date)}</span>
            {expRecord.subcategory && (
              <>
                <span>•</span>
                <span className="capitalize text-slate-300">{expRecord.subcategory}</span>
              </>
            )}
            {'location' in expense && expense.location && (
              <>
                <span>•</span>
                <span>{expense.location}</span>
              </>
            )}
            {expRecord.tripId && (
              <>
                <span>•</span>
                <span className="text-indigo-400 font-mono text-[11px]">{expRecord.tripId}</span>
              </>
            )}
            {expense.tags && expense.tags.length > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-indigo-400">
                  <Tag className="w-3 h-3" />
                  {expense.tags[0]}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right space-y-0.5">
          {isPendingActual ? (
            <div>
              <p className="text-base font-bold text-amber-300 font-mono">
                {formatCurrency(planned, expense.currency)}
              </p>
              <p className="text-[10px] text-amber-400/80 font-medium uppercase tracking-wider">
                Planned Forecast
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-base font-bold text-white font-mono">
                  {formatCurrency(actual, expense.currency)}
                </p>
                {variance !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.2 rounded ${
                      variance < 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {variance < 0 ? (
                      <>
                        <TrendingDown className="w-3 h-3" />
                        Save {formatCurrency(Math.abs(variance))}
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3 h-3" />
                        +{formatCurrency(variance)}
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Planned: {formatCurrency(planned)}
              </p>
            </div>
          )}
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
    </div>
  );
};

