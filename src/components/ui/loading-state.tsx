import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  label?: string;
  sublabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Optimizing and loading data...',
  sublabel,
  className,
  size = 'md',
}) => {
  const spinnerSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 lg:p-12 text-center rounded-2xl border border-slate-800/80 bg-[#0d1017]/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md animate-pulse" />
        <Loader2 className={cn('animate-spin text-indigo-400 relative z-10', spinnerSizes[size])} />
      </div>
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1 max-w-xs">{sublabel}</p>}
    </div>
  );
};
