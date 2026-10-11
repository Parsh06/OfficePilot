import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useOptimizerStore } from '@/stores/optimizerStore';
import type { OptimizationMode, ScheduleCandidate } from '@/lib/optimizationEngine';
import { formatCurrency } from '@/lib/utils';
import {
  Sparkles,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  Building2,
  BedDouble,
  Navigation,
  ThumbsUp,
  ThumbsDown,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTripStore } from '@/stores/tripStore';

export const PlanOptimizerPage: React.FC = () => {
  const profile = useSettingsStore((s) => s.profile);
  const activeProfile = useTripStore((s) => s.activeProfile);
  const homeCity = profile?.homeCity || activeProfile?.homeLocation || 'Mumbai, Maharashtra';
  const officeCity = profile?.primaryOffice || activeProfile?.officeLocation || 'Pune Technology Center';

  const mode = useOptimizerStore((s) => s.mode);
  const setMode = useOptimizerStore((s) => s.setMode);
  const activeResult = useOptimizerStore((s) => s.activeResult);
  const isLoading = useOptimizerStore((s) => s.isLoading);
  const runOptimization = useOptimizerStore((s) => s.runOptimization);
  const applyCandidatePlan = useOptimizerStore((s) => s.applyCandidatePlan);

  const [selectedCandidateToApply, setSelectedCandidateToApply] = useState<ScheduleCandidate | null>(null);

  useEffect(() => {
    if (!activeResult) {
      runOptimization({ mode });
    }
  }, []);

  const handleModeChange = (newMode: OptimizationMode) => {
    setMode(newMode);
    runOptimization({ mode: newMode });
    toast.success(`Switched optimizer model to ${newMode} mode`);
  };

  const handleApplyConfirm = async () => {
    if (selectedCandidateToApply) {
      await applyCandidatePlan(selectedCandidateToApply);
      toast.success(`Successfully applied "${selectedCandidateToApply.title}" to your active calendar!`);
      setSelectedCandidateToApply(null);
    }
  };

  const baseline = activeResult?.baselinePlan;
  const options = activeResult?.options || [];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-[#131627] to-[#18112e] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-indigo-400" />
        </div>

        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/15 px-2.5 py-1 rounded-lg border border-indigo-500/30 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Deterministic Schedule Optimizer
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Algorithmic Route, Stay & Schedule Optimization
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Evaluates candidate itineraries using deterministic expense models, route segment costs, and lodging allowances to eliminate fragmented transit.
          </p>

          {/* Mode Switcher Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {(['SAVER', 'BALANCED', 'COMFORT'] as OptimizationMode[]).map((m) => {
              const isSelected = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 border border-indigo-400'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {m === 'SAVER' ? '💰 Saver (Min Cost)' : m === 'BALANCED' ? '⚖️ Balanced' : '🛋️ Comfort (Min Travel)'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Baseline Schedule Cost"
          value={formatCurrency(baseline?.totalCost || 0)}
          subtitle="Unbatched individual commutes"
          icon={DollarSign}
        />
        <MetricCard
          title="Recommended Savings"
          value={formatCurrency(activeResult?.recommendedOption?.savings || 0)}
          subtitle="Identified through batching"
          icon={Sparkles}
          highlight={true}
          trend={{ value: 'Deterministic Model', isPositive: true }}
        />
        <MetricCard
          title="Travel Time Reduction"
          value={`${Math.round(((baseline?.travelTimeMinutes || 0) - (activeResult?.recommendedOption?.travelTimeMinutes || 0)) / 60)} Hours`}
          subtitle="Fewer transit hours per month"
          icon={Clock}
          trend={{ value: 'Fewer transit legs', isPositive: true }}
        />
        <MetricCard
          title="Efficiency Score"
          value={`${activeResult?.recommendedOption?.totalScore || 94}/100`}
          subtitle="Composite weighted score"
          icon={Zap}
        />
      </div>

      {/* Baseline Comparison Header */}
      {baseline && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-300">Active Baseline:</span>
              <span className="text-slate-400">
                {baseline.wfoDaysCount} WFO Days • {baseline.travelLegsCount} Transit Legs • {formatCurrency(baseline.totalCost)} Total Cost
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              Target Optimization Window: {activeResult?.dateRange.startDate} ➔ {activeResult?.dateRange.endDate}
            </span>
          </div>

          {/* Calculation Basis & Data Lineage Card */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Info className="w-4 h-4 shrink-0" />
              <span>Calculation Basis & Data Lineage</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>Active Baseline ({formatCurrency(baseline.totalCost)}):</strong> Derived from your active work calendar ({baseline.wfoDaysCount} in-office days between {homeCity} ⇄ {officeCity}). Without batching, each in-office day involves independent roundtrip transit legs (6 segments/day = {baseline.travelLegsCount} legs @ ₹850 train + cab transfers) plus daily meal per diem.
              <br />
              • <strong>Optimization Candidates:</strong> Group contiguous office days into batched corporate stays (PG @ ₹1,800/nt or Hotel @ ₹2,800/nt), cutting mid-week transit legs from {baseline.travelLegsCount} down to 6, saving up to {formatCurrency(activeResult?.recommendedOption?.savings || 0)} and eliminating transit fatigue.
            </p>
          </div>
        </div>
      )}

      {/* Ranked Candidate Options Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Ranked Optimization Options</h3>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Running deterministic candidate generation and scoring engine...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {options.map((option, idx) => {
              return (
                <div
                  key={option.id}
                  className={`flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 relative ${
                    option.isRecommended
                      ? 'border-indigo-500/70 bg-gradient-to-b from-indigo-950/40 via-[#111422] to-[#0e101a] shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                      : 'border-slate-800 bg-[#0f121d] hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        Option {String.fromCharCode(65 + idx)}
                      </span>
                      {option.isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Recommended
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{option.title}</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {option.explanation}
                      </p>
                    </div>

                    {/* Cost & Savings Summary Box */}
                    <div className="p-4 rounded-xl bg-[#090b12] border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="text-slate-400">Estimated Cost:</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {formatCurrency(option.totalCost)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Difference vs Baseline:</span>
                        {option.savings > 0 ? (
                          <span className="font-bold text-emerald-400 font-mono">
                            Save {formatCurrency(option.savings)}
                          </span>
                        ) : option.costDifference > 0 ? (
                          <span className="font-bold text-rose-400 font-mono">
                            +{formatCurrency(option.costDifference)}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400">₹0 diff</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Optimization Score:</span>
                        <span className="font-bold text-indigo-300 font-mono">
                          {option.totalScore} / 100
                        </span>
                      </div>
                    </div>

                    {/* Metrics Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-0.5" />
                        <span className="text-[10px] text-slate-400 block">WFO</span>
                        <span className="font-bold text-slate-200">{option.wfoDaysCount} Days</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <Navigation className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                        <span className="text-[10px] text-slate-400 block">Legs</span>
                        <span className="font-bold text-slate-200">{option.travelLegsCount} Legs</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <BedDouble className="w-3.5 h-3.5 text-purple-400 mx-auto mb-0.5" />
                        <span className="text-[10px] text-slate-400 block">Nights</span>
                        <span className="font-bold text-slate-200">{option.nightsCount} Nights</span>
                      </div>
                    </div>

                    {/* Trade-Offs: Pros & Cons */}
                    <div className="space-y-2 text-xs pt-1">
                      {option.tradeOffs.pros.map((pro, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-emerald-300/90 text-[11px]">
                          <ThumbsUp className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </div>
                      ))}
                      {option.tradeOffs.cons.map((con, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                          <ThumbsDown className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                          <span>{con}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply Action Button */}
                  <div className="pt-5 border-t border-slate-800 mt-4">
                    <Button
                      type="button"
                      variant={option.isRecommended ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCandidateToApply(option)}
                      className={`w-full gap-2 ${
                        option.isRecommended ? 'shadow-md shadow-indigo-600/30' : ''
                      }`}
                    >
                      <span>Apply Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!selectedCandidateToApply}
        onOpenChange={(open) => !open && setSelectedCandidateToApply(null)}
        title={`Apply "${selectedCandidateToApply?.title}"?`}
        description={`This will sync ${selectedCandidateToApply?.wfoDaysCount} office days and ${selectedCandidateToApply?.trips.length} travel trip blocks into your active work calendar (${formatCurrency(
          selectedCandidateToApply?.totalCost || 0
        )} planned spend). No past historical expense data will be altered.`}
        confirmLabel="Confirm & Apply Plan"
        onConfirm={handleApplyConfirm}
      />
    </div>
  );
};
