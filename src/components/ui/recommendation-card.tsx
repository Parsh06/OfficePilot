import React from 'react';
import { Card } from './card';
import { Button } from './button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
  title: string;
  description: string;
  badge?: string;
  savings?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  title,
  description,
  badge = 'Optimization',
  savings,
  ctaText = 'Apply',
  onCtaClick,
  className,
}) => {
  return (
    <Card
      variant="glow"
      className={cn(
        'p-5 border-indigo-500/30 bg-gradient-to-r from-[#121625] to-[#161327] flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              {badge}
            </span>
            {savings && (
              <span className="text-xs font-semibold text-emerald-400">
                {savings}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-xs text-slate-400 max-w-xl">{description}</p>
        </div>
      </div>

      {onCtaClick && (
        <Button
          type="button"
          variant="ai"
          size="sm"
          onClick={onCtaClick}
          className="shrink-0 gap-1.5"
        >
          <span>{ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </Card>
  );
};
