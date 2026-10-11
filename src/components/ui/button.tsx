import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-600/30',
        ai:
          'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] text-white shadow-lg shadow-purple-600/25 hover:bg-[right_center] transition-all duration-500 border border-purple-400/30',
        secondary:
          'bg-[#1a2030] text-slate-200 border border-[#262e45] hover:bg-[#222a40] hover:text-white hover:border-[#354060]',
        outline:
          'border border-slate-700/80 bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-600',
        ghost:
          'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
        destructive:
          'bg-rose-600/15 text-rose-400 border border-rose-500/30 hover:bg-rose-600/25 hover:text-rose-300',
        success:
          'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 hover:text-emerald-300',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
