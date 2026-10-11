import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionCard } from '@/components/ui/section-card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Receipt,
  Sparkles,
  Building2,
  CalendarDays,
  Plane,
  Hotel,
  Utensils,
  Calculator,
  Compass,
  Info,
} from 'lucide-react';
import { useExpenseStore } from '@/stores/expenseStore';
import { useTripStore } from '@/stores/tripStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  computeHistoricalAnalytics,
  calculateDeterministicForecast,
} from '@/lib/analyticsEngine';
import { formatCurrency } from '@/lib/utils';

type AnalyticsTab = 'overview' | 'spending' | 'travel' | 'accommodation' | 'forecast';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  const expenses = useExpenseStore((s) => s.expenses);
  const trips = useTripStore((s) => s.trips);
  const schedules = useScheduleStore((s) => s.schedules);
  const budget = useSettingsStore((s) => s.profile.monthlyTravelBudget) || 25000;

  const workDays = useMemo(() => {
    return schedules.map((s) => ({
      date: s.date,
      dayOfWeek: new Date(s.date).toLocaleString('en-US', { weekday: 'long' }).toUpperCase() as any,
      scheduleType: s.mode as any,
      isOverride: false,
      source: 'USER' as const,
      notes: s.notes,
    }));
  }, [schedules]);

  // Historical calculations
  const analytics = useMemo(() => {
    return computeHistoricalAnalytics(expenses, trips, workDays);
  }, [expenses, trips, workDays]);

  // Deterministic Forecast calculations
  const forecast = useMemo(() => {
    return calculateDeterministicForecast(expenses, trips, workDays, budget);
  }, [expenses, trips, workDays, budget]);

  const { monthlyTrends, categoryBreakdown, weekdayComparison, cityComparison, wfoCostTrends, summary } = analytics;
  const { costPerWFOBreakdown } = forecast;

  const categoryColors: Record<string, string> = {
    TRAVEL: '#6366f1',
    FOOD: '#10b981',
    ACCOMMODATION: '#8b5cf6',
    WORK: '#38bdf8',
    MISCELLANEOUS: '#f59e0b',
  };

  const tabs: { id: AnalyticsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview & KPIs', icon: Compass },
    { id: 'spending', label: 'Spending & Variance', icon: Receipt },
    { id: 'travel', label: 'Travel & Commute', icon: Plane },
    { id: 'accommodation', label: 'Lodging & Stays', icon: Hotel },
    { id: 'forecast', label: 'Deterministic Forecast', icon: Calculator },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <PageHeader
        title="Travel & Expense Analytics"
        description="Transparent financial telemetry, deterministic cost-per-WFO calculations, and multi-modal commute breakdowns."
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-[#0c0e16] border border-slate-800 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* PRIMARY KPIS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Daily Average"
          value={formatCurrency(summary.dailyAverageSpend)}
          subtitle="All recorded days"
          icon={Receipt}
        />
        <MetricCard
          title="Weekly Average"
          value={formatCurrency(summary.weeklyAverageSpend)}
          subtitle="Active work weeks"
          icon={CalendarDays}
        />
        <MetricCard
          title="Monthly Spend"
          value={formatCurrency(summary.monthlyAverageSpend)}
          subtitle={`Budget: ${formatCurrency(budget)}`}
          icon={Calculator}
        />
        <MetricCard
          title="Cost / WFO Day"
          value={formatCurrency(forecast.averageWFOCost)}
          subtitle={`${costPerWFOBreakdown.wfoDaysCount} office days logged`}
          icon={Building2}
          highlight={true}
        />
        <MetricCard
          title="Spend / Trip"
          value={formatCurrency(summary.averageSpendPerTrip)}
          subtitle="Multi-day batch average"
          icon={Plane}
        />
        <MetricCard
          title="Projected Year"
          value={formatCurrency(forecast.projectedYearSpend)}
          subtitle="Deterministic projection"
          icon={Sparkles}
        />
      </div>

      {/* TRANSPARENT COST PER WFO DAY EXPLANATION PANEL */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/30 via-slate-900/80 to-[#0e111c] border border-indigo-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Transparent Cost Per WFO Day Engine
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {formatCurrency(costPerWFOBreakdown.costPerWFODay)} / Day
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-mono">
          {costPerWFOBreakdown.formulaExplanation}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Travel Component</span>
            <span className="font-mono font-semibold text-slate-200">
              {formatCurrency(costPerWFOBreakdown.components.travelCost)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Lodging Component</span>
            <span className="font-mono font-semibold text-slate-200">
              {formatCurrency(costPerWFOBreakdown.components.accommodationCost)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Food & Per Diem</span>
            <span className="font-mono font-semibold text-slate-200">
              {formatCurrency(costPerWFOBreakdown.components.foodPerDiemCost)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Work & Incidentals</span>
            <span className="font-mono font-semibold text-slate-200">
              {formatCurrency(costPerWFOBreakdown.components.otherWorkCost)}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'spending') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Monthly Spending Trend (Planned vs Actual) */}
          <SectionCard
            title="Monthly Spending Trend (Planned vs Actual)"
            description="Month-over-month trajectory comparing budget forecast with confirmed actuals"
          >
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121520',
                      borderColor: '#23293c',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    name="Planned Forecast"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPlanned)"
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Spend"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Chart 2: Category Breakdown (Donut Chart) */}
          <SectionCard
            title="Spend by Category Breakdown"
            description="Proportionate distribution of travel, lodging, meals, work, and misc costs"
          >
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="actual"
                    nameKey="category"
                  >
                    {categoryBreakdown.map((entry) => (
                      <Cell
                        key={`cell-${entry.category}`}
                        fill={categoryColors[entry.category] || '#94a3b8'}
                        stroke="#10131c"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121520',
                      borderColor: '#23293c',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spend']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Chart 3: Weekday Cost Comparison */}
          <SectionCard
            title="Weekday Cost Comparison"
            description="Average spending on Monday through Friday work days"
          >
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                  <XAxis dataKey="weekday" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121520',
                      borderColor: '#23293c',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Average Cost']}
                  />
                  <Bar dataKey="averageCost" name="Avg Cost (₹)" fill="#818cf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Chart 5: WFO Cost Trend Over Time */}
          <SectionCard
            title="Cost Per WFO Day Trend"
            description="Historical daily cost tracking for each individual office commute"
          >
            <div className="h-64 w-full pt-2">
              {wfoCostTrends.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No office day expense data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wfoCostTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121520',
                        borderColor: '#23293c',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="costPerWFODay"
                      name="Actual WFO Cost"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="plannedCost"
                      name="Planned Forecast"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ fill: '#6366f1', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* TAB 3: TRAVEL & COMMUTE */}
      {activeTab === 'travel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Total Travel Spend"
              value={formatCurrency(summary.totalTravelCost)}
              subtitle="Trains, metro, cabs & flights"
              icon={Plane}
            />
            <MetricCard
              title="Total Stays"
              value={formatCurrency(summary.totalAccommodationCost)}
              subtitle="PG, hotels, guest houses"
              icon={Hotel}
            />
            <MetricCard
              title="Meals & Food"
              value={formatCurrency(summary.totalFoodCost)}
              subtitle="Per diems & office meals"
              icon={Utensils}
            />
          </div>

          <SectionCard
            title="Spend by Destination City"
            description="Aggregated trip budgets and travel costs across destination hubs"
          >
            <div className="space-y-3">
              {cityComparison.length === 0 ? (
                <p className="text-xs text-slate-500">No destination city trips recorded.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cityComparison.map((c) => (
                    <div
                      key={c.city}
                      className="p-4 rounded-xl bg-[#111422] border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{c.city}</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatCurrency(c.totalCost)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{c.tripsCount} trips scheduled</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* TAB 4: ACCOMMODATION */}
      {activeTab === 'accommodation' && (
        <div className="space-y-6">
          <SectionCard
            title="Lodging & Overnight Stay Analytics"
            description="Cost distribution across PG suites, hotels, and guest house stays"
          >
            <div className="p-4 rounded-xl bg-[#111422] border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Total Accommodation Expenditure</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatCurrency(summary.totalAccommodationCost)}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Average Stay Cost / Night</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatCurrency(costPerWFOBreakdown.components.accommodationCost > 0 ? Math.round(costPerWFOBreakdown.components.accommodationCost / Math.max(1, trips.length)) : 2500)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Accommodation vs Travel Ratio</span>
                <span className="font-mono font-semibold text-indigo-400">
                  {summary.totalTravelCost > 0
                    ? `${Math.round((summary.totalAccommodationCost / summary.totalTravelCost) * 100)}%`
                    : '100%'}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* TAB 5: FORECAST */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Current Month Spend"
              value={formatCurrency(forecast.currentMonthSpend)}
              subtitle="Confirmed to date"
              icon={Receipt}
            />
            <MetricCard
              title="Projected Month End"
              value={formatCurrency(forecast.projectedMonthSpend)}
              subtitle={`Budget: ${formatCurrency(budget)}`}
              icon={Calculator}
              highlight={true}
            />
            <MetricCard
              title="Expected Upcoming (30d)"
              value={formatCurrency(forecast.expectedUpcomingSpend)}
              subtitle="Scheduled itineraries"
              icon={Compass}
            />
            <MetricCard
              title="Annualized Run Rate"
              value={formatCurrency(forecast.projectedYearSpend)}
              subtitle="Extrapolated 12 months"
              icon={Sparkles}
            />
          </div>

          <SectionCard
            title="Deterministic Forecast Rationale"
            description="Pure arithmetic models based on scheduled work calendar, route segments, and historical variance"
          >
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  Month-end projection combines confirmed actual expenses with planned per-diem allowances for all remaining scheduled office days.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};
