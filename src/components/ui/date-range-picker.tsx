import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (start: string, end: string) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 p-1.5 bg-[#0e111a] border border-slate-800 rounded-xl text-xs', className)}>
      <CalendarIcon className="w-4 h-4 text-indigo-400 ml-1.5" />
      <input
        type="date"
        value={startDate || ''}
        onChange={(e) => onChange(e.target.value, endDate || e.target.value)}
        className="bg-transparent text-slate-200 focus:outline-none border-0 p-1 text-xs cursor-pointer"
      />
      <span className="text-slate-500 font-medium">to</span>
      <input
        type="date"
        value={endDate || ''}
        onChange={(e) => onChange(startDate || e.target.value, e.target.value)}
        className="bg-transparent text-slate-200 focus:outline-none border-0 p-1 text-xs cursor-pointer"
      />
    </div>
  );
};
