import React from 'react';
import { AIRecommendation } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from './button';
import { Sparkles, TrendingDown, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightCardProps {
  recommendation: AIRecommendation;
  onApply?: (id: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  recommendation,
  onApply,
  onDismiss,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#141829] via-[#10131e] to-[#0d0f17] p-5 shadow-lg shadow-indigo-950/20 transition-all duration-300',
        recommendation.applied && 'border-emerald-500/40 bg-emerald-950/10',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {recommendation.type.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {recommendation.confidenceScore}% confidence
            </span>
          </div>
        </div>

        {onDismiss && !recommendation.applied && (
          <button
            onClick={() => onDismiss(recommendation.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            title="Dismiss insight"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="my-3">
        <h4 className="text-sm font-semibold text-slate-100 mb-1">
          {recommendation.title}
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {recommendation.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mt-4">
        {recommendation.potentialSavings ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <TrendingDown className="w-4 h-4" />
            <span>Save {formatCurrency(recommendation.potentialSavings)}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Impact: {recommendation.impactLevel}</span>
        )}

        {recommendation.applied ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Applied
          </span>
        ) : (
          onApply && (
            <Button
              type="button"
              variant="ai"
              size="sm"
              onClick={() => onApply(recommendation.id)}
              className="text-xs h-8"
            >
              {recommendation.actionLabel || 'Apply Recommendation'}
            </Button>
          )
        )}
      </div>
    </div>
  );
};
