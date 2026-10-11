import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors border',
  {
    variants: {
      variant: {
        default: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        secondary: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
        success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        ai: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-sm shadow-purple-500/20',
        outline: 'text-slate-300 border-slate-700 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
