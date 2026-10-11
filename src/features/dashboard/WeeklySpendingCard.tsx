import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useExpenseStore } from '@/stores/expenseStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ArrowUpRight, TrendingDown } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const WeeklySpendingCard: React.FC = () => {
  const expenses = useExpenseStore((s) => s.expenses);
  const totalSpend = React.useMemo(
    () => expenses.reduce((acc, e) => acc + (e.actualAmount ?? e.plannedAmount ?? 0), 0),
    [expenses]
  );
  const pendingReimbursements = React.useMemo(
    () =>
      expenses
        .filter((e) => e.reimbursable && e.status !== 'REIMBURSED')
        .reduce((acc, e) => acc + (e.actualAmount ?? e.plannedAmount ?? 0), 0),
    [expenses]
  );
  const budget = useSettingsStore((s) => s.profile.monthlyTravelBudget) || 25000;

  const percentUsed = Math.min(100, Math.round((totalSpend / budget) * 100));


  return (
    <Card variant="elevated" className="p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Monthly Travel Spending
          </span>
          <NavLink
            to="/expenses"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium transition-colors"
          >
            Details <ArrowUpRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div>
            <h3 className="text-2xl lg:text-3xl font-bold text-white">
              {formatCurrency(totalSpend)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              of {formatCurrency(budget)} monthly budget limit
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {percentUsed}% Used
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/60 text-xs">
        <div>
          <span className="text-slate-500">Pending Reimbursement:</span>
          <p className="font-semibold text-amber-400">
            {formatCurrency(pendingReimbursements)}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Projected Savings:</span>
          <p className="font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingDown className="w-3 h-3" />
            $420 vs baseline
          </p>
        </div>
      </div>
    </Card>
  );
};
