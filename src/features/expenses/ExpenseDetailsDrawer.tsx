import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExpenseStore } from '@/stores/expenseStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaymentMethod } from '@/lib/expenseEngine';
import { 
  Receipt, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Briefcase, 
  CreditCard,
  Building2,
  Copy,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface ExpenseDetailsDrawerProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpenseDetailsDrawer: React.FC<ExpenseDetailsDrawerProps> = ({
  expenseId,
  open,
  onOpenChange,
}) => {
  const getExpenseById = useExpenseStore((s) => s.getExpenseById);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const markActual = useExpenseStore((s) => s.markActual);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const addExpense = useExpenseStore((s) => s.addExpense);

  const expense = expenseId ? getExpenseById(expenseId) : undefined;

  const [actualInput, setActualInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setActualInput(expense.actualAmount !== undefined ? String(expense.actualAmount) : '');
      setPaymentMethod(expense.paymentMethod || 'UPI');
      setNotes(expense.notes || '');
    }
  }, [expense]);

  if (!expense) return null;

  const planned = Number(expense.plannedAmount) || 0;
  const currentActual = expense.actualAmount !== undefined ? Number(expense.actualAmount) : undefined;
  const currentVariance = expense.variance;

  const handleSaveActual = async () => {
    const val = parseFloat(actualInput);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsSaving(true);
    try {
      await markActual(expense.id, val, paymentMethod);
      if (notes !== expense.notes) {
        await updateExpense(expense.id, { notes });
      }
      toast.success('Actual expense amount updated!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPlannedAsActual = async () => {
    setIsSaving(true);
    try {
      await markActual(expense.id, planned, paymentMethod);
      toast.success(`Confirmed planned amount ${formatCurrency(planned)} as actual!`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to confirm expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = () => {
    addExpense({
      ...expense,
      id: undefined,
      title: `${expense.title} (Copy)`,
      createdAt: undefined,
    });
    toast.success('Expense record duplicated');
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteExpense(expense.id);
    toast.success('Expense deleted');
    onOpenChange(false);
  };

  const getSourceBadge = () => {
    switch (expense.source) {
      case 'AI':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3 text-purple-400" />
            AI Auditor
          </span>
        );
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Building2 className="w-3 h-3 text-blue-400" />
            Schedule Generator
          </span>
        );
      case 'imported':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            Imported Receipt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            User Logged
          </span>
        );
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-400" />
          <span>{expense.title}</span>
        </div>
      }
      description={`Expense ID: ${expense.id} • ${formatDate(expense.date)}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              className="gap-1.5 text-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSaveActual}
              disabled={isSaving || !actualInput}
              className="gap-1.5 text-xs shadow-md shadow-indigo-600/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Actual'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Planned vs Actual Comparison Card */}
        <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-gradient-to-r from-[#121524] via-[#101320] to-[#0e111a] border border-slate-800">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase">
              Planned
            </span>
            <p className="text-lg font-bold text-white mt-0.5">{formatCurrency(planned)}</p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase">
              Actual
            </span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">
              {currentActual !== undefined ? formatCurrency(currentActual) : '— (Pending)'}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase">
              Variance
            </span>
            {currentActual !== undefined ? (
              <p
                className={`text-lg font-bold flex items-center gap-0.5 mt-0.5 ${
                  currentVariance < 0
                    ? 'text-emerald-400'
                    : currentVariance > 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {currentVariance < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    Save {formatCurrency(Math.abs(currentVariance))}
                  </>
                ) : currentVariance > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    +{formatCurrency(currentVariance)}
                  </>
                ) : (
                  '₹0 on budget'
                )}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Pending actual</p>
            )}
          </div>
        </div>

        {/* Enter Actual Amount Input Box */}
        <div className="p-4 rounded-xl bg-[#0e111a] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Record Actual Paid Amount
            </h4>
            {currentActual === undefined && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConfirmPlannedAsActual}
                className="text-[11px] h-6 px-2 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                Match Planned ({formatCurrency(planned)})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Actual Amount (₹)</label>
              <Input
                type="number"
                value={actualInput}
                onChange={(e) => setActualInput(e.target.value)}
                placeholder={`Planned: ${planned}`}
                className="text-sm font-mono h-9 bg-slate-900 border-slate-700"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CORPORATE_CARD">Corporate Card</option>
                <option value="CASH">Cash</option>
                <option value="REIMBURSABLE">Reimbursable Out-of-Pocket</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Details & Metadata */}
        <div className="p-4 rounded-xl bg-[#0e111a] border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Date
            </span>
            <span className="font-medium text-slate-200 font-mono">{expense.date}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              Category / Subcategory
            </span>
            <span className="font-medium text-slate-200">
              {expense.category} • <span className="capitalize">{expense.subcategory}</span>
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              Audit Source
            </span>
            {getSourceBadge()}
          </div>

          {expense.tripId && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                Linked Trip
              </span>
              <span className="font-mono text-slate-300 text-[11px]">{expense.tripId}</span>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Notes / Description</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add expense note or receipt notes..."
              className="text-xs h-8 bg-slate-900 border-slate-700"
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
};
