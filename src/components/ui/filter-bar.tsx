import React from 'react';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from './button';

interface FilterOption<T extends string> {
  label: string;
  value: T;
  count?: number;
}

interface FilterBarProps<T extends string> {
  options: FilterOption<T>[];
  selected: T;
  onChange: (value: T) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function FilterBar<T extends string>({
  options,
  selected,
  onChange,
  onReset,
  hasActiveFilters = false,
  className,
  rightSlot,
}: FilterBarProps<T>) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0c0e14] rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 text-xs font-semibold">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filter:</span>
        </div>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-md text-[10px]',
                    isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {hasActiveFilters && onReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
