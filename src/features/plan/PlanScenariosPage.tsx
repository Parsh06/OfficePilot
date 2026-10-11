import React, { useState, useEffect, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useOptimizerStore } from '@/stores/optimizerStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useTripStore } from '@/stores/tripStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { WHAT_IF_PRESETS } from '@/lib/optimizationEngine';
import type { ScenarioSimulationRequest } from '@/lib/optimizationEngine';
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
  Calendar,
  Info,
  BookmarkCheck,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

type DayMode = 'WFO' | 'WFH' | 'HOLIDAY' | 'LEAVE';

export const PlanScenariosPage: React.FC = () => {
  const runSimulation = useOptimizerStore((s) => s.runSimulation);
  const activeSimulation = useOptimizerStore((s) => s.activeSimulation);
  const isLoading = useOptimizerStore((s) => s.isLoading);
  const applyCandidatePlan = useOptimizerStore((s) => s.applyCandidatePlan);

  const scenarios = useScenarioStore((s) => s.scenarios);
  const addScenario = useScenarioStore((s) => s.addScenario);
  const deleteScenario = useScenarioStore((s) => s.deleteScenario);

  const normalSchedule = useScheduleStore((s) => s.normalSchedule);
  const profile = useSettingsStore((s) => s.profile);
  const activeProfile = useTripStore((s) => s.activeProfile);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(WHAT_IF_PRESETS[0].id);
  const [showCustomBuilder, setShowCustomBuilder] = useState<boolean>(false);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState<boolean>(false);

  // Custom Builder State
  const defaultMonday = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().substring(0, 10);
  }, []);

  const [customName, setCustomName] = useState<string>('My Custom Hybrid Sprint');
  const [customHypothesis, setCustomHypothesis] = useState<string>('What if I work in-office 3 consecutive days and stay at Corporate PG?');
  const [startDate, setStartDate] = useState<string>(defaultMonday);
  const [stayOption, setStayOption] = useState<'AUTO' | 'STAY_OVERNIGHT' | 'RETURN_HOME'>('AUTO');
  const [accType, setAccType] = useState<'PG' | 'hotel' | 'guest_house'>('PG');

  // Days of the target week for overrides
  const targetDays = useMemo(() => {
    const list: Array<{ date: string; dayName: string; initialMode: DayMode }> = [];
    const base = new Date(startDate);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayKeys: Array<keyof typeof normalSchedule> = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().substring(0, 10);
      const key = dayKeys[i];
      const initial = ((normalSchedule as any)[key] as DayMode) || (i < 5 ? 'WFO' : 'WFH');
      list.push({
        date: iso,
        dayName: dayNames[i],
        initialMode: initial,
      });
    }
    return list;
  }, [startDate, normalSchedule]);

  const [dayOverrides, setDayOverrides] = useState<Record<string, DayMode>>({});

  useEffect(() => {
    // Initialize day overrides with current baseline
    const initial: Record<string, DayMode> = {};
    targetDays.forEach((td) => {
      initial[td.date] = td.initialMode;
    });
    setDayOverrides(initial);
  }, [targetDays]);

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

  const handleToggleDayMode = (date: string, mode: DayMode) => {
    setDayOverrides((prev) => ({
      ...prev,
      [date]: mode,
    }));
  };

  const handleRunCustomSimulation = async () => {
    const overridesList: Array<{ date: string; mode: DayMode; reason?: string }> = Object.entries(dayOverrides).map(
      ([date, mode]) => ({
        date,
        mode,
        reason: `Custom Simulation Override (${mode})`,
      })
    );

    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + 6);
    const endDate = endDateObj.toISOString().substring(0, 10);

    const req: ScenarioSimulationRequest = {
      name: customName || 'Custom Hybrid Scenario',
      hypothesis: customHypothesis || 'User Custom Scenario',
      startDate,
      endDate,
      dateOverrides: overridesList,
      stayOverride: stayOption,
      accommodationType: accType,
      nightlyCost: accType === 'PG' ? 1800 : accType === 'guest_house' ? 2000 : 2800,
    };

    setSelectedPresetId('');
    await runSimulation(req);
    toast.success(`Simulation completed for "${req.name}"!`);
  };

  const handleApplyToCalendar = async () => {
    if (activeSimulation?.proposedPlan) {
      await applyCandidatePlan(activeSimulation.proposedPlan);
      toast.success(`Successfully applied "${activeSimulation.name}" to your active calendar!`);
      setConfirmApplyOpen(false);
    }
  };

  const handleSaveToLibrary = () => {
    if (!activeSimulation) return;
    const wfoCount = activeSimulation.proposedPlan.wfoDaysCount;
    addScenario({
      name: activeSimulation.name,
      description: activeSimulation.hypothesis,
      wfoDaysPerWeek: Math.max(1, Math.min(5, wfoCount)),
      batchingCadence: stayOption === 'STAY_OVERNIGHT' || stayOption === 'AUTO' ? 'BIWEEKLY' : 'WEEKLY',
      transportPreference: 'OPTIMAL',
      hotelTier: accType === 'PG' ? 'BUDGET' : accType === 'guest_house' ? 'STANDARD' : 'PREMIUM',
    });
    toast.success(`Saved "${activeSimulation.name}" to your Scenario Library!`);
  };

  const current = activeSimulation?.currentPlan;
  const proposed = activeSimulation?.proposedPlan;
  const delta = activeSimulation?.delta;

  const homeCity = profile?.homeCity || activeProfile?.homeLocation || 'Mumbai, Maharashtra';
  const officeCity = profile?.primaryOffice || activeProfile?.officeLocation || 'Pune Technology Center';

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-[#161324] to-[#121528] shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              What-If Scenario Simulation Lab
            </span>
            <span className="text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              Corridor: {homeCity} ⇄ {officeCity}
            </span>
            <span className="text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              Currency: INR (₹)
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Simulate Custom Schedule Shifts & See Financial Impact Live
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Test schedule variations, holiday bridges, unplanned remote days, or batched stays. All calculations are executed deterministically using your actual corridor rates without mutating your active calendar.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant={showCustomBuilder ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCustomBuilder(!showCustomBuilder)}
              className="gap-2 cursor-pointer border-amber-500/40 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{showCustomBuilder ? 'Hide Custom Builder' : '+ Build Custom Scenario'}</span>
            </Button>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero Mutation Guarantee: Running simulations will never modify your real records.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Custom Scenario Builder Form */}
      {showCustomBuilder && (
        <div className="p-6 rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-[#121528] to-[#0d101a] shadow-xl space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Custom Scenario Parameter Configurator
              </h3>
            </div>
            <span className="text-xs text-slate-400">Deterministic Rate Modeling</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Scenario Name
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. 3-Day Pune Sprint, Friday Remote Bridge"
                className="bg-slate-900/80 border-slate-700 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Hypothesis / Question
              </label>
              <Input
                value={customHypothesis}
                onChange={(e) => setCustomHypothesis(e.target.value)}
                placeholder="e.g. What if I work in-office Tue-Thu and stay at Corporate PG?"
                className="bg-slate-900/80 border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Strategy Overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Target Week Starting
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900/80 border-slate-700 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-indigo-400" />
                Lodging Stay Strategy
              </label>
              <select
                value={stayOption}
                onChange={(e) => setStayOption(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="AUTO">Auto Optimal (Batch multi-day)</option>
                <option value="STAY_OVERNIGHT">Stay Overnight (Corporate Suite)</option>
                <option value="RETURN_HOME">Daily Commute (No Stay / Return Same Day)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Accommodation Tier
              </label>
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="PG">Corporate PG Suite (₹1,800/night)</option>
                <option value="guest_house">Company Guest House (₹2,000/night)</option>
                <option value="hotel">Executive Hotel (₹2,800/night)</option>
              </select>
            </div>
          </div>

          {/* Interactive Day Override Matrix */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Interactive Attendance Overrides for Target Week
              </label>
              <span className="text-[11px] text-slate-400">
                Click any mode button to test schedule alternatives
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {targetDays.map((td) => {
                const currentMode = dayOverrides[td.date] || td.initialMode;
                return (
                  <div
                    key={td.date}
                    className="p-3 rounded-xl border border-slate-800 bg-[#0b0e18] flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{td.dayName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{td.date}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {(['WFO', 'WFH', 'LEAVE', 'HOLIDAY'] as DayMode[]).map((m) => {
                        const isSelected = currentMode === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleToggleDayMode(td.date, m)}
                            className={`py-1 px-1 rounded text-center font-bold transition-all cursor-pointer ${
                              isSelected
                                ? m === 'WFO'
                                  ? 'bg-indigo-600 text-white shadow'
                                  : m === 'WFH'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : m === 'LEAVE'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'bg-amber-600 text-white shadow'
                                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const initial: Record<string, DayMode> = {};
                targetDays.forEach((td) => {
                  initial[td.date] = td.initialMode;
                });
                setDayOverrides(initial);
                toast.info('Reset day overrides to baseline schedule');
              }}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Baseline</span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isLoading}
              onClick={handleRunCustomSimulation}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs shadow-md shadow-indigo-600/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Simulating...' : 'Run Custom Simulation'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Quick Simulation Presets */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Or Pick a Standard What-If Hypothesis Preset
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {WHAT_IF_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleRunPreset(preset)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
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
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
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

          {/* Action Bar for Simulation */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5 text-xs text-indigo-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{activeSimulation.name}:</strong> {activeSimulation.recommendation}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveToLibrary}
                className="text-xs gap-1.5 cursor-pointer bg-slate-900 border-slate-700"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Save to Library</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => setConfirmApplyOpen(true)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Calendar</span>
              </Button>
            </div>
          </div>

          {/* Side-by-Side Comparison Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Active Plan */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0e111a] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Baseline Active Calendar
                  </span>
                  <h4 className="text-base font-bold text-white">{current.title}</h4>
                </div>
                <span className="text-sm font-mono font-bold text-slate-300">
                  {formatCurrency(current.totalCost)}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">WFO Attendance:</span>
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
                    Simulated Alternative Hypothesis
                  </span>
                  <h4 className="text-base font-bold text-white">{proposed.title}</h4>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {formatCurrency(proposed.totalCost)}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">WFO Attendance:</span>
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
            description="Detailed line-item differences generated by this scenario hypothesis"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {Object.entries(activeSimulation.affectedExpenseCategories).map(([cat, val]) => (
                <div key={cat} className="p-3.5 rounded-xl bg-[#0b0d16] border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">{cat}</span>
                  <div className="flex items-baseline justify-between text-xs font-mono">
                    <span className="text-slate-400">Baseline: ₹{val.current}</span>
                    <span className="text-slate-200">Proposed: ₹{val.proposed}</span>
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

            {/* Transparent Calculation Basis & Lineage Box */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Calculation Basis & Data Lineage</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                • <strong>Baseline:</strong> Calculated from your active work schedule and transit corridor ({homeCity} ⇄ {officeCity}) assuming unbatched daily roundtrips.
                <br />
                • <strong>Proposed:</strong> Evaluated deterministically with your simulated overrides, applying ₹850 per transit leg, Corporate PG / Hotel lodging rates, and daily food allowances.
                <br />
                • <strong>Zero Hallucination:</strong> All numbers are computed using pure mathematical formulas without AI improvisation.
              </p>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {/* Saved Scenarios Library */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Saved Hybrid Scenario Library ({scenarios.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Stored Locally & Across Sessions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className={`p-4 rounded-2xl border transition-all ${
                sc.isCurrent
                  ? 'bg-indigo-950/20 border-indigo-500/50 ring-1 ring-indigo-500/30'
                  : 'bg-[#0e111a] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{sc.name}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{sc.description}</p>
                </div>
                {sc.isRecommended && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    Recommended
                  </span>
                )}
              </div>

              <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Monthly Spend</span>
                  <span className="font-mono font-bold text-white">₹{sc.projectedMonthlyCost.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Savings vs Baseline</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {sc.savingsVsBaseline > 0 ? `₹${sc.savingsVsBaseline.toLocaleString('en-IN')}` : '₹0'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Transit Overhead</span>
                  <span className="text-slate-300">{sc.projectedTravelHours}h / month</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">WFO Attendance</span>
                  <span className="text-slate-300">{sc.wfoDaysPerWeek} Days / week</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800/60 mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    useScenarioStore.getState().setActiveScenario(sc.id);
                    toast.success(`Set "${sc.name}" as active comparison scenario`);
                  }}
                  className="text-[11px] h-7 px-2 text-indigo-400 hover:text-indigo-300"
                >
                  {sc.isCurrent ? 'Active Model' : 'Set as Active'}
                </Button>

                {scenarios.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      deleteScenario(sc.id);
                      toast.info(`Deleted scenario "${sc.name}"`);
                    }}
                    className="text-[11px] h-7 px-2 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog for Applying Scenario to Active Calendar */}
      <ConfirmDialog
        open={confirmApplyOpen}
        onOpenChange={setConfirmApplyOpen}
        title="Apply Scenario to Active Calendar?"
        description={`This will overwrite attendance modes on your calendar with the simulated days from "${activeSimulation?.name}". You can always revert or adjust days anytime.`}
        confirmLabel="Apply to Calendar"
        variant="default"
        onConfirm={handleApplyToCalendar}
      />
    </div>
  );
};
