import React, { useMemo } from 'react';
import { GreetingSection } from './GreetingSection';
import { MetricCard } from '@/components/ui/metric-card';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useTripStore } from '@/stores/tripStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { aggregateDashboardData } from '@/lib/analyticsEngine';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Home,
  Navigation,
  BedDouble,
  TrendingDown,
  TrendingUp,
  Receipt,
  CalendarDays,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const schedules = useScheduleStore((s) => s.schedules);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const trips = useTripStore((s) => s.trips);
  const expenses = useExpenseStore((s) => s.expenses);
  const budget = useSettingsStore((s) => s.profile.monthlyTravelBudget) || 25000;

  // Convert legacy schedules to workDays format
  const workDays = useMemo(() => {
    return schedules.map((s: any) => ({
      date: s.date,
      scheduleType: s.mode,
      notes: s.notes,
    }));
  }, [schedules]);

  // Run deterministic aggregation engine
  const dashboardData = useMemo(() => {
    return aggregateDashboardData({
      workDays,
      exceptions,
      trips,
      expenses,
      monthlyBudget: budget,
    });
  }, [workDays, exceptions, trips, expenses, budget]);

  const { hero, kpis, weekView, alerts, insights } = dashboardData;

  const getScheduleModeBadge = (mode: string, isOverride: boolean) => {
    switch (mode) {
      case 'WFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Building2 className="w-3 h-3 text-indigo-400" />
            Office (WFO){isOverride && ' • Override'}
          </span>
        );
      case 'WFH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Home className="w-3 h-3 text-emerald-400" />
            Home (WFH)
          </span>
        );
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Holiday
          </span>
        );
      case 'LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            Leave
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Off Day
          </span>
        );
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in-50 duration-300">
      {/* Top Greeting & Active Period */}
      <GreetingSection />

      {/* 1. HERO: Current Period Financial Health & Variance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12162a] via-[#0f1220] to-[#0a0c16] border border-indigo-500/20 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                {dashboardData.period.label}
              </span>
              <span className="text-xs text-slate-400">Monthly Forecast Model</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {formatCurrency(hero.actualSpend)}{' '}
              <span className="text-base sm:text-lg font-normal text-slate-400">
                spent to date
              </span>
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300">
              Projected month-end spend:{' '}
              <strong className="text-white">{formatCurrency(hero.projectedWorkSpend)}</strong>{' '}
              of {formatCurrency(hero.monthlyBudget)} budget ({hero.budgetUtilizationPct}% utilized)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:border-l lg:border-slate-800 lg:pl-8">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Net Variance
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {hero.variance <= 0 ? (
                  <span className="inline-flex items-center gap-1 text-base font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <TrendingDown className="w-4 h-4" />
                    Save {formatCurrency(Math.abs(hero.variance))}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-base font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                    <TrendingUp className="w-4 h-4" />
                    +{formatCurrency(hero.variance)} Overrun
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">vs planned forecast</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Avg Cost / WFO Day
              </span>
              <p className="text-lg font-bold text-white font-mono mt-0.5">
                {formatCurrency(kpis.averageWFOCost)}
              </p>
              <button
                type="button"
                onClick={() => navigate('/analytics')}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 mt-0.5"
              >
                View breakdown <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Budget Utilization</span>
            <span className="font-mono text-slate-200 font-semibold">{hero.budgetUtilizationPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                hero.budgetUtilizationPct > 100
                  ? 'bg-rose-500'
                  : hero.budgetUtilizationPct > 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, hero.budgetUtilizationPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. 6-KEY KPIS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="WFO Days"
          value={String(kpis.wfoDays)}
          subtitle="Office attendance"
          icon={Building2}
          onClick={() => navigate('/plan/calendar')}
        />
        <MetricCard
          title="WFH Days"
          value={String(kpis.wfhDays)}
          subtitle="Remote work"
          icon={Home}
          onClick={() => navigate('/plan/calendar')}
        />
        <MetricCard
          title="Travel Legs"
          value={String(kpis.travelLegs)}
          subtitle="Transit segments"
          icon={Navigation}
          onClick={() => navigate('/trips')}
        />
        <MetricCard
          title="PG / Lodging"
          value={`${kpis.pgNights} Nights`}
          subtitle="Overnight stays"
          icon={BedDouble}
          onClick={() => navigate('/trips')}
        />
        <MetricCard
          title="Avg WFO Cost"
          value={formatCurrency(kpis.averageWFOCost)}
          subtitle="Per in-office day"
          icon={Receipt}
          highlight={true}
          onClick={() => navigate('/analytics')}
        />
        <MetricCard
          title="Month Spend"
          value={formatCurrency(kpis.currentMonthCost)}
          subtitle="Total actuals"
          icon={CalendarDays}
          onClick={() => navigate('/expenses')}
        />
      </div>

      {/* 3. WEEK VIEW: Mon - Fri Interactive Day Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">This Week at a Glance (Mon – Fri)</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/plan/calendar')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Full Calendar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {weekView.map((day) => {
            const hasTravel = day.travelSegments.length > 0;
            const hasStay = !!day.accommodationStay;

            return (
              <div
                key={day.date}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
                  day.resolvedMode === 'WFO'
                    ? 'bg-[#121626] border-indigo-500/30 hover:border-indigo-500/60 shadow-md'
                    : 'bg-[#0f111c] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-100">{day.dayOfWeek}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{formatDate(day.date)}</p>
                    </div>
                    {getScheduleModeBadge(day.resolvedMode, day.isOverride)}
                  </div>

                  {/* Travel & Stay summary pills */}
                  <div className="space-y-1.5 pt-1">
                    {hasTravel ? (
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
                        <Navigation className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">
                          {day.travelSegments.map((s) => s.mode).join(' ➔ ')}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-0.5">No commute legs</div>
                    )}

                    {hasStay && (
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200">
                        <BedDouble className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{day.accommodationStay?.name || 'Hotel Stay'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer / Daily Spend */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Spend</span>
                    <p className="font-bold text-white font-mono">
                      {day.actualSpend > 0
                        ? formatCurrency(day.actualSpend)
                        : day.plannedSpend > 0
                        ? `${formatCurrency(day.plannedSpend)} (Est)`
                        : '₹0'}
                    </p>
                  </div>

                  {day.variance !== 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        day.variance < 0
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {day.variance < 0 ? `-₹${Math.abs(day.variance)}` : `+₹${day.variance}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. UPCOMING ALERTS & OPPORTUNITIES WIDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Upcoming Alerts & Conflicts ({alerts.length})</h3>
            </div>
          </div>

          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="p-5 rounded-xl border border-slate-800 bg-[#0e101a] text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                No schedule conflicts or price anomalies detected.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    alert.severity === 'warning'
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : alert.severity === 'success'
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-[#101322] border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{alert.title}</span>
                        {alert.metric && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300">
                            {alert.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>
                    </div>

                    {alert.actionLabel && alert.actionHref && (
                      <button
                        type="button"
                        onClick={() => navigate(alert.actionHref!)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 shrink-0 flex items-center gap-0.5 mt-0.5"
                      >
                        {alert.actionLabel} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Structured Insight Candidates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Actionable Spend & Batching Insights</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/analytics')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Full Analytics <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {insights.slice(0, 3).map((ins) => (
              <div
                key={ins.id}
                className="p-3.5 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-[#101222] to-[#0c0e18] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    {ins.title}
                  </span>
                  {ins.impactAmount && (
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      {formatCurrency(ins.impactAmount)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{ins.summary}</p>
                {ins.suggestedAction && (
                  <p className="text-[11px] text-purple-300/90 font-medium">
                    Recommendation: {ins.suggestedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
