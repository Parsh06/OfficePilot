import React, { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionCard } from '@/components/ui/section-card';
import { useOptimizerStore } from '@/stores/optimizerStore';
import { WHAT_IF_PRESETS } from '@/lib/optimizationEngine';
import { formatCurrency } from '@/lib/utils';
import {
  Sparkles,
  Layers,
  Building2,
  BedDouble,
  Navigation,
  ShieldCheck,
  Zap,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

export const PlanScenariosPage: React.FC = () => {
  const runSimulation = useOptimizerStore((s) => s.runSimulation);
  const activeSimulation = useOptimizerStore((s) => s.activeSimulation);
  const isLoading = useOptimizerStore((s) => s.isLoading);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(WHAT_IF_PRESETS[0].id);

  useEffect(() => {
    if (!activeSimulation) {
      handleRunPreset(WHAT_IF_PRESETS[0]);
    }
  }, []);

  const handleRunPreset = async (preset: typeof WHAT_IF_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    await runSimulation(preset.request);
    toast.success(`Simulated: "${preset.hypothesis}"`);
  };

  const current = activeSimulation?.currentPlan;
  const proposed = activeSimulation?.proposedPlan;
  const delta = activeSimulation?.delta;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-[#161324] to-[#121528] shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              What-If Scenario Simulation Engine
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Simulate Schedule Deviations Without Altering Real Data
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Test policy shifts, holiday bridges, unplanned remote days, and same-day express commutes. All calculations are executed in a deterministic sandbox.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Mutation Guarantee: Simulating scenarios never modifies your active calendar.</span>
          </div>
        </div>
      </div>

      {/* Quick Simulation Presets */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Choose a What-If Scenario to Simulate
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {WHAT_IF_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleRunPreset(preset)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-600/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-[#0f111c] border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-xs font-bold text-white mb-1">“{preset.hypothesis}”</p>
                <p className="text-[11px] text-slate-400 leading-snug">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulation Result: Side-by-Side Comparison */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          Calculating simulation deltas, route segments, and expense categories...
        </div>
      ) : activeSimulation && current && proposed && delta ? (
        <div className="space-y-6">
          {/* Delta KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              title="Cost Delta"
              value={
                delta.savings > 0
                  ? `-₹${delta.savings.toLocaleString('en-IN')}`
                  : delta.costDiff > 0
                  ? `+₹${delta.costDiff.toLocaleString('en-IN')}`
                  : '₹0'
              }
              subtitle={delta.savings > 0 ? 'Cost Savings' : delta.costDiff > 0 ? 'Additional Cost' : 'Identical spend'}
              icon={DollarSign}
              highlight={delta.savings > 0}
            />
            <MetricCard
              title="WFO Attendance"
              value={`${proposed.wfoDaysCount} Days (${delta.wfoDiff >= 0 ? `+${delta.wfoDiff}` : delta.wfoDiff})`}
              subtitle={`Current: ${current.wfoDaysCount} Days`}
              icon={Building2}
            />
            <MetricCard
              title="Travel Legs"
              value={`${proposed.travelLegsCount} Legs (${delta.travelLegsDiff >= 0 ? `+${delta.travelLegsDiff}` : delta.travelLegsDiff})`}
              subtitle={`Current: ${current.travelLegsCount} Legs`}
              icon={Navigation}
            />
            <MetricCard
              title="Lodging Nights"
              value={`${proposed.nightsCount} Nights (${delta.nightsDiff >= 0 ? `+${delta.nightsDiff}` : delta.nightsDiff})`}
              subtitle={`Current: ${current.nightsCount} Nights`}
              icon={BedDouble}
            />
          </div>

          {/* Side-by-Side Comparison Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Active Plan */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0e111a] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Baseline
                  </span>
                  <h4 className="text-base font-bold text-white">{current.title}</h4>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatCurrency(current.totalCost)}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">WFO Days:</span>
                  <span className="font-semibold text-white">{current.wfoDaysCount} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Transit Legs:</span>
                  <span className="font-semibold text-white">{current.travelLegsCount} Legs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Hotel / PG Nights:</span>
                  <span className="font-semibold text-white">{current.nightsCount} Nights</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Travel Time:</span>
                  <span className="font-semibold text-amber-400">{Math.round(current.travelTimeMinutes / 60)} Hours</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Convenience Score:</span>
                  <span className="font-semibold text-indigo-300">{current.convenienceScore} / 100</span>
                </div>
              </div>
            </div>

            {/* Simulated Proposed Plan */}
            <div className="p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-[#121524] to-[#0f111e] space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Simulated Alternative
                  </span>
                  <h4 className="text-base font-bold text-white">{proposed.title}</h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatCurrency(proposed.totalCost)}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">WFO Days:</span>
                  <span className="font-semibold text-white">{proposed.wfoDaysCount} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Transit Legs:</span>
                  <span className="font-semibold text-white">{proposed.travelLegsCount} Legs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Hotel / PG Nights:</span>
                  <span className="font-semibold text-white">{proposed.nightsCount} Nights</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Travel Time:</span>
                  <span className="font-semibold text-emerald-400">{Math.round(proposed.travelTimeMinutes / 60)} Hours</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Convenience Score:</span>
                  <span className="font-semibold text-indigo-300">{proposed.convenienceScore} / 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Affected Expense Categories Breakdown */}
          <SectionCard
            title="Affected Expense Categories Delta"
            description="Specific line-item differences generated by this scenario hypothesis"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {Object.entries(activeSimulation.affectedExpenseCategories).map(([cat, val]) => (
                <div key={cat} className="p-3.5 rounded-xl bg-[#0b0d16] border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">{cat}</span>
                  <div className="flex items-baseline justify-between text-xs font-mono">
                    <span className="text-slate-400">Current: ₹{val.current}</span>
                    <span className="text-slate-200">Prop: ₹{val.proposed}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 text-[11px] font-mono font-bold">
                    {val.diff < 0 ? (
                      <span className="text-emerald-400">-₹{Math.abs(val.diff)} (Savings)</span>
                    ) : val.diff > 0 ? (
                      <span className="text-rose-400">+₹{val.diff} (Increase)</span>
                    ) : (
                      <span className="text-slate-500">₹0 diff</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendation summary alert */}
            <div className="mt-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{activeSimulation.recommendation}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
};
