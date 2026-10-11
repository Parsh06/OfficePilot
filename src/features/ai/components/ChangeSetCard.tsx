import React from 'react';
import type { ChangeSet } from '@/lib/ai/types';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeSetCardProps {
  changeSet: ChangeSet;
  isExecuting?: boolean;
  onConfirm: (actionId: string) => void;
  onCancel: (actionId: string) => void;
  onUndo?: () => void;
}

export const ChangeSetCard: React.FC<ChangeSetCardProps> = ({
  changeSet,
  isExecuting = false,
  onConfirm,
  onCancel,
  onUndo,
}) => {
  const {
    actionId,
    title,
    description,
    riskLevel,
    status,
    proposedChanges,
    estimatedImpact,
    executionError,
  } = changeSet;

  const isPending = status === 'awaiting_confirmation' || status === 'draft';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isReversed = status === 'reversed';

  return (
    <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-[#121629] via-[#0d1020] to-[#090b14] p-4 shadow-xl text-xs space-y-3.5 my-2">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm leading-none">{title}</h4>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
              ID: {actionId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Risk Level Badge */}
          <span
            className={cn(
              'px-2 py-0.5 rounded-md font-bold uppercase text-[10px] border flex items-center gap-1',
              riskLevel === 'LOW_RISK' && 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
              riskLevel === 'MEDIUM_RISK' && 'bg-amber-950/60 text-amber-400 border-amber-500/30',
              riskLevel === 'HIGH_RISK' && 'bg-rose-950/60 text-rose-400 border-rose-500/30'
            )}
          >
            {riskLevel === 'HIGH_RISK' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
            {riskLevel.replace('_', ' ')}
          </span>

          {/* Status Badge */}
          {isCompleted && (
            <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Applied
            </span>
          )}
          {isReversed && (
            <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-purple-400" /> Reverted
            </span>
          )}
          {isFailed && (
            <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-400" /> Failed
            </span>
          )}
          {isPending && (
            <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" /> Awaiting Confirmation
            </span>
          )}
        </div>
      </div>

      <p className="text-slate-300 leading-relaxed">{description}</p>

      {/* Visual Diff Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
        {/* Work Mode Change */}
        <div className="p-2.5 rounded-xl bg-[#090b14]/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Schedule Shift</span>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span className="text-rose-400">WFO</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-emerald-400">WFH</span>
          </div>
        </div>

        {/* Travel Legs Diff */}
        <div className="p-2.5 rounded-xl bg-[#090b14]/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Travel Legs</span>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span className="text-slate-300">{estimatedImpact.travelLegsDiff !== 0 ? `Diff: ${estimatedImpact.travelLegsDiff}` : 'No change'}</span>
          </div>
        </div>

        {/* PG Nights Diff */}
        <div className="p-2.5 rounded-xl bg-[#090b14]/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lodging Nights</span>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span className="text-slate-300">{estimatedImpact.nightsDiff !== 0 ? `Diff: ${estimatedImpact.nightsDiff}` : 'No change'}</span>
          </div>
        </div>

        {/* Estimated Savings */}
        <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Estimated Savings</span>
          <div className="flex items-center gap-1 font-bold text-emerald-300 text-sm">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>₹{estimatedImpact.savings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Proposed Changes Detailed List (e.g. for bulk) */}
      {proposedChanges.length > 1 && (
        <div className="p-2.5 rounded-xl bg-[#07090f] border border-slate-800/80 space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
          <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
            Affected Dates ({proposedChanges.length} dates)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {proposedChanges.map((chg) => (
              <span
                key={chg.id}
                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-1"
              >
                <Calendar className="w-2.5 h-2.5 text-indigo-400" />
                {chg.targetDate || chg.description}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error display if failed */}
      {executionError && (
        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
          <strong>Error:</strong> {executionError}
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCancel(actionId)}
            disabled={isExecuting}
            className="text-xs h-8 text-slate-300 hover:text-white border-slate-700 gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onConfirm(actionId)}
            disabled={isExecuting}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-md shadow-emerald-600/30"
          >
            {isExecuting ? (
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Apply changes</span>
          </Button>
        </div>
      )}

      {/* Undo Button if completed */}
      {isCompleted && onUndo && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified & synced across Firestore and MongoDB
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onUndo}
            className="text-xs h-7 text-indigo-300 hover:text-white gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo this change</span>
          </Button>
        </div>
      )}
    </div>
  );
};
