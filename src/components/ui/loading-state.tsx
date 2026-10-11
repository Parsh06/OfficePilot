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
      <div className="relative mb-4 flex items-center justify-center">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-transparent blur-md animate-pulse pointer-events-none" />
        <div className="relative z-10 p-2.5 rounded-2xl bg-[#101322] border border-slate-800 shadow-xl flex items-center justify-center">
          <img 
            src="/assets/Appicon.png" 
            alt="Office Pilot" 
            className={cn('object-contain', size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8')} 
          />
          <Loader2 className={cn('absolute -top-1 -right-1 text-indigo-400 animate-spin', spinnerSizes[size])} />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1 max-w-xs">{sublabel}</p>}
    </div>
  );
};
