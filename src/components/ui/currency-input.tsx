import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  currencySymbol?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currencySymbol = '$', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <span className="absolute left-3.5 text-sm font-medium text-slate-400 select-none">
          {currencySymbol}
        </span>
        <input
          ref={ref}
          type="number"
          step="0.01"
          min="0"
          value={isNaN(value) ? '' : value === 0 ? '' : value}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChange(isNaN(val) ? 0 : val);
          }}
          className={cn(
            'flex h-10 w-full rounded-xl border border-slate-800 bg-[#0f121a] pl-8 pr-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';
