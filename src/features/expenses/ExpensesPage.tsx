import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { ExpenseCard } from '@/components/ui/expense-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AddExpenseDrawer } from './AddExpenseDrawer';
import { ExpenseDetailsDrawer } from './ExpenseDetailsDrawer';
import { GenerateTripExpensesDrawer } from './GenerateTripExpensesDrawer';
import { useExpenseStore } from '@/stores/expenseStore';
import { useTripStore } from '@/stores/tripStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { calculateExpenseSummary, type ExpenseRecord, type ExpenseCategory } from '@/lib/expenseEngine';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Receipt, 
  PlusCircle, 
  Clock, 
  LayoutList, 
  Table as TableIcon,
  Trash2,
  Sparkles,
  CalendarDays,
  Briefcase,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

type ViewGroupingMode = 'group-day' | 'group-trip' | 'cards' | 'table';

export const ExpensesPage: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const trips = useTripStore((s) => s.trips);
  const budget = useSettingsStore((s) => s.profile.monthlyTravelBudget) || 25000;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [selectedTripFilter, setSelectedTripFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'PLANNED' | 'CONFIRMED' | 'REIMBURSABLE'>('ALL');
  const [viewMode, setViewMode] = useState<ViewGroupingMode>('group-day');
  
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isGenerateDrawerOpen, setIsGenerateDrawerOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);

  // Filter options
  const categoryFilterOptions: { label: string; value: ExpenseCategory | 'ALL'; count?: number }[] = [
    { label: 'All Categories', value: 'ALL', count: expenses.length },
    { label: 'Travel', value: 'TRAVEL', count: expenses.filter((e) => e.category === 'TRAVEL').length },
    { label: 'Food', value: 'FOOD', count: expenses.filter((e) => e.category === 'FOOD').length },
    { label: 'Accommodation', value: 'ACCOMMODATION', count: expenses.filter((e) => e.category === 'ACCOMMODATION').length },
    { label: 'Work', value: 'WORK', count: expenses.filter((e) => e.category === 'WORK').length },
    { label: 'Miscellaneous', value: 'MISCELLANEOUS', count: expenses.filter((e) => e.category === 'MISCELLANEOUS').length },
  ];

  const summary = useMemo(() => calculateExpenseSummary(expenses), [expenses]);

  // Apply filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedTripFilter !== 'ALL' && item.tripId !== selectedTripFilter) return false;
      if (selectedStatusFilter === 'PLANNED' && item.status !== 'PLANNED') return false;
      if (selectedStatusFilter === 'CONFIRMED' && item.status !== 'CONFIRMED') return false;
      if (selectedStatusFilter === 'REIMBURSABLE' && !item.reimbursable) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchSubcategory = item.subcategory?.toLowerCase().includes(q);
        const matchTrip = item.tripId?.toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchCategory && !matchSubcategory && !matchTrip) return false;
      }
      return true;
    });
  }, [expenses, selectedCategory, selectedTripFilter, selectedStatusFilter, searchQuery]);

  // Group by Day
  const groupedByDay = useMemo(() => {
    const groups: { [date: string]: ExpenseRecord[] } = {};
    for (const exp of filteredExpenses) {
      if (!groups[exp.date]) {
        groups[exp.date] = [];
      }
      groups[exp.date].push(exp);
    }
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  // Group by Trip
  const groupedByTrip = useMemo(() => {
    const groups: { [tripKey: string]: { tripTitle: string; expenses: ExpenseRecord[] } } = {};
    for (const exp of filteredExpenses) {
      const key = exp.tripId || 'unassigned';
      if (!groups[key]) {
        const tripObj = trips.find((t) => t.id === exp.tripId);
        groups[key] = {
          tripTitle: tripObj ? tripObj.title : exp.tripId ? `Trip (${exp.tripId})` : 'Independent Daily Expenses',
          expenses: [],
        };
      }
      groups[key].expenses.push(exp);
    }
    return Object.entries(groups);
  }, [filteredExpenses, trips]);

  const handleDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete.id);
      toast.success(`Expense "${expenseToDelete.title}" deleted.`);
      setExpenseToDelete(null);
    }
  };

  // Table columns definition
  const columns: Column<ExpenseRecord>[] = [
    {
      key: 'title',
      header: 'Expense / Line Item',
      render: (item) => (
        <div 
          onClick={() => setSelectedExpenseId(item.id)}
          className="font-semibold text-white cursor-pointer hover:text-indigo-400 transition-colors"
        >
          <p>{item.title}</p>
          <p className="text-xs text-slate-400 font-normal">
            <span className="capitalize">{item.subcategory}</span> • {item.date}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          {item.category}
        </span>
      ),
    },
    {
      key: 'plannedAmount',
      header: 'Planned',
      align: 'right',
      render: (item) => (
        <span className="font-mono text-slate-300 text-xs">
          {formatCurrency(item.plannedAmount, item.currency)}
        </span>
      ),
    },
    {
      key: 'actualAmount',
      header: 'Actual',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-white text-xs">
          {item.actualAmount !== undefined ? formatCurrency(item.actualAmount, item.currency) : '— (Pending)'}
        </span>
      ),
    },
    {
      key: 'variance',
      header: 'Variance',
      align: 'right',
      render: (item) => {
        if (item.actualAmount === undefined) {
          return <span className="text-[11px] text-slate-500">Pending</span>;
        }
        const v = item.variance;
        return (
          <span
            className={`font-mono text-xs font-semibold ${
              v < 0 ? 'text-emerald-400' : v > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {v < 0 ? `-₹${Math.abs(v)}` : v > 0 ? `+₹${v}` : '₹0'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpenseToDelete(item);
          }}
          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
          title="Delete expense"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel Expenses & Planned Forecasts"
        description="Connects work schedules, trip routes, and per diem templates with deterministic planned vs actual tracking."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateDrawerOpen(true)}
              className="gap-2 border-purple-500/30 hover:bg-purple-500/10 text-purple-300"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Generate from Trips</span>
            </Button>

            <Button
              type="button"
              variant="default"
              onClick={() => setIsAddDrawerOpen(true)}
              className="gap-2 shadow-md shadow-indigo-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Expense</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards: Planned vs Actual Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spending"
          value={formatCurrency(summary.totalSpent)}
          subtitle={`Limit: ${formatCurrency(budget)}`}
          icon={Receipt}
          trend={{
            value: `${Math.round((summary.totalSpent / budget) * 100)}% budget`,
            isNeutral: true,
          }}
        />
        <MetricCard
          title="Planned Forecast"
          value={formatCurrency(summary.totalPlanned)}
          subtitle={`${summary.plannedCount} items scheduled`}
          icon={CalendarDays}
          trend={{ value: 'Deterministic Engine', isNeutral: true }}
        />
        <MetricCard
          title="Actual Paid"
          value={formatCurrency(summary.totalActual)}
          subtitle={`${summary.confirmedCount} records confirmed`}
          icon={Clock}
          trend={{ value: 'Reimbursable ready', isPositive: true }}
        />
        <MetricCard
          title="Net Variance"
          value={
            summary.totalVariance < 0
              ? `-₹${Math.abs(summary.totalVariance)} Saved`
              : summary.totalVariance > 0
              ? `+₹${summary.totalVariance} Over`
              : '₹0 On Budget'
          }
          subtitle={
            summary.totalVariance < 0
              ? 'Spending below forecast'
              : summary.totalVariance > 0
              ? 'Exceeded planned budget'
              : '100% Target accuracy'
          }
          icon={summary.totalVariance <= 0 ? TrendingDown : TrendingUp}
          highlight={true}
          trend={{
            value: summary.totalVariance <= 0 ? 'Cost Savings' : 'Overrun Warning',
            isPositive: summary.totalVariance <= 0,
          }}
        />
      </div>

      {/* Search, Filter Bar & View Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="max-w-md w-full">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search expenses by title, subcategory, trip ID..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Trip Selector Filter */}
            <select
              value={selectedTripFilter}
              onChange={(e) => setSelectedTripFilter(e.target.value)}
              className="h-9 rounded-xl bg-[#0c0e14] border border-slate-800 text-xs text-slate-300 px-3 hover:border-slate-700"
            >
              <option value="ALL">All Trip Blocks</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="h-9 rounded-xl bg-[#0c0e14] border border-slate-800 text-xs text-slate-300 px-3 hover:border-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PLANNED">Planned Forecasts</option>
              <option value="CONFIRMED">Actuals Paid</option>
              <option value="REIMBURSABLE">Reimbursable Only</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-[#0c0e14] border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('group-day')}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  viewMode === 'group-day'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Group by Work Day"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Day</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('group-trip')}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  viewMode === 'group-trip'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Group by Trip"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trip</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Card View"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <FilterBar
          options={categoryFilterOptions}
          selected={selectedCategory}
          onChange={(cat) => setSelectedCategory(cat)}
          onReset={() => {
            setSelectedCategory('ALL');
            setSelectedTripFilter('ALL');
            setSelectedStatusFilter('ALL');
            setSearchQuery('');
          }}
          hasActiveFilters={
            selectedCategory !== 'ALL' ||
            selectedTripFilter !== 'ALL' ||
            selectedStatusFilter !== 'ALL' ||
            searchQuery !== ''
          }
        />
      </div>

      {/* Main Expenses View */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Expenses Found"
          description="No expense line items matched your selected filters."
          actionLabel="Add First Expense"
          onAction={() => setIsAddDrawerOpen(true)}
        />
      ) : viewMode === 'group-day' ? (
        /* Group by Day View */
        <div className="space-y-6">
          {groupedByDay.map(([dateStr, items]) => {
            const dayPlanned = items.reduce((sum, e) => sum + e.plannedAmount, 0);
            const dayActual = items.reduce((sum, e) => sum + (e.actualAmount ?? 0), 0);
            const dayVariance = items.reduce((sum, e) => sum + e.variance, 0);

            return (
              <div key={dateStr} className="space-y-2">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">{formatDate(dateStr)}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({items.length} items)</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Planned: <strong className="text-slate-200">{formatCurrency(dayPlanned)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Actual: <strong className="text-emerald-400">{formatCurrency(dayActual)}</strong>
                    </span>
                    {dayVariance !== 0 && (
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded font-semibold ${
                          dayVariance < 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {dayVariance < 0 ? `-₹${Math.abs(dayVariance)} saved` : `+₹${dayVariance} over`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((exp) => (
                    <ExpenseCard
                      key={exp.id}
                      expense={exp}
                      onClick={() => setSelectedExpenseId(exp.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'group-trip' ? (
        /* Group by Trip View */
        <div className="space-y-6">
          {groupedByTrip.map(([tripKey, group]) => {
            const tripPlanned = group.expenses.reduce((sum, e) => sum + e.plannedAmount, 0);
            const tripActual = group.expenses.reduce((sum, e) => sum + (e.actualAmount ?? 0), 0);
            const tripVariance = group.expenses.reduce((sum, e) => sum + e.variance, 0);

            return (
              <div key={tripKey} className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 border border-indigo-500/20">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-100">{group.tripTitle}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({group.expenses.length} records)</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Planned: <strong className="text-slate-200">{formatCurrency(tripPlanned)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Actual: <strong className="text-emerald-400">{formatCurrency(tripActual)}</strong>
                    </span>
                    {tripVariance !== 0 && (
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded font-semibold ${
                          tripVariance < 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tripVariance < 0 ? `-₹${Math.abs(tripVariance)} saved` : `+₹${tripVariance}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {group.expenses.map((exp) => (
                    <ExpenseCard
                      key={exp.id}
                      expense={exp}
                      onClick={() => setSelectedExpenseId(exp.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'cards' ? (
        /* Flat Cards View */
        <div className="space-y-3">
          {filteredExpenses.map((exp) => (
            <ExpenseCard
              key={exp.id}
              expense={exp}
              onClick={() => setSelectedExpenseId(exp.id)}
            />
          ))}
        </div>
      ) : (
        /* Data Table View */
        <DataTable
          data={filteredExpenses}
          columns={columns}
          keyExtractor={(e) => e.id}
        />
      )}

      {/* Drawers */}
      <AddExpenseDrawer
        open={isAddDrawerOpen}
        onOpenChange={setIsAddDrawerOpen}
      />

      <GenerateTripExpensesDrawer
        open={isGenerateDrawerOpen}
        onOpenChange={setIsGenerateDrawerOpen}
      />

      <ExpenseDetailsDrawer
        expenseId={selectedExpenseId}
        open={!!selectedExpenseId}
        onOpenChange={(open) => !open && setSelectedExpenseId(null)}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
        title="Delete Expense Record?"
        description={`Are you sure you want to remove "${expenseToDelete?.title}" (${formatCurrency(
          expenseToDelete?.actualAmount ?? expenseToDelete?.plannedAmount ?? 0
        )})? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};
