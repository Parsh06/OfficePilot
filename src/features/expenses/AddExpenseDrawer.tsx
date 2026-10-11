import React, { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExpenseStore } from '@/stores/expenseStore';
import { useTripStore } from '@/stores/tripStore';
import type { ExpenseCategory, PaymentMethod } from '@/lib/expenseEngine';
import { PlusCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface AddExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES: { value: ExpenseCategory; label: string; subcategories: string[] }[] = [
  {
    value: 'TRAVEL',
    label: 'Travel / Commute',
    subcategories: ['train', 'metro', 'rapido', 'uber', 'auto', 'bus', 'cab', 'flight', 'fuel', 'parking', 'other'],
  },
  {
    value: 'FOOD',
    label: 'Food & Meals',
    subcategories: ['breakfast', 'lunch', 'snacks', 'dinner', 'beverage', 'other'],
  },
  {
    value: 'ACCOMMODATION',
    label: 'Accommodation',
    subcategories: ['PG', 'hotel', 'guest house', 'other'],
  },
  {
    value: 'WORK',
    label: 'Work & Office',
    subcategories: ['coworking', 'supplies', 'software', 'client_meeting', 'other'],
  },
  {
    value: 'MISCELLANEOUS',
    label: 'Miscellaneous',
    subcategories: ['tips', 'emergency', 'laundry', 'other'],
  },
];

export const AddExpenseDrawer: React.FC<AddExpenseDrawerProps> = ({ open, onOpenChange }) => {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const trips = useTripStore((s) => s.trips);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [subcategory, setSubcategory] = useState('lunch');
  const [amount, setAmount] = useState<number | ''>('');
  const [isPlanned, setIsPlanned] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [reimbursable, setReimbursable] = useState(true);
  const [tripId, setTripId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCatObj = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setCategory(cat);
    const catObj = CATEGORIES.find((c) => c.value === cat);
    if (catObj && catObj.subcategories.length > 0) {
      setSubcategory(catObj.subcategories[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount === '' || Number(amount) <= 0) {
      toast.error('Please enter a title and a valid positive amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const numAmount = Number(amount);
      addExpense({
        title: title.trim(),
        date,
        category,
        subcategory,
        plannedAmount: isPlanned ? numAmount : numAmount,
        actualAmount: isPlanned ? undefined : numAmount,
        currency: 'INR',
        paymentMethod,
        reimbursable,
        status: isPlanned ? 'PLANNED' : 'CONFIRMED',
        source: 'user',
        tripId: tripId || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Expense "${title}" logged successfully!`);
      // Reset
      setTitle('');
      setAmount('');
      setNotes('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to add expense');
    } finally {
      setIsSubmitting(false);
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
          <span>Quick Log Expense</span>
        </div>
      }
      description="Record an out-of-pocket, reimbursable, or planned budget line item"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Planned vs Actual Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setIsPlanned(false)}
            className={`py-2 rounded-lg font-medium transition-all ${
              !isPlanned
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Actual Expense (Paid)
          </button>
          <button
            type="button"
            onClick={() => setIsPlanned(true)}
            className={`py-2 rounded-lg font-medium transition-all ${
              isPlanned
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Planned (Budget Forecast)
          </button>
        </div>

        {/* Title & Amount */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Expense Title / Description</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lunch at Pune Cafeteria"
              className="h-10 text-sm bg-slate-900 border-slate-700"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount (₹)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 250"
                min="0"
                step="any"
                className="h-10 text-sm font-mono bg-slate-900 border-slate-700"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 text-xs bg-slate-900 border-slate-700"
                required
              />
            </div>
          </div>
        </div>

        {/* Category & Subcategory */}
        <div className="space-y-3 p-4 rounded-xl bg-[#0e111a] border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const isSelected = c.value === category;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleCategoryChange(c.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Subcategory</label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2 capitalize"
            >
              {currentCatObj.subcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Payment Method & Trip Association */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2"
            >
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="CORPORATE_CARD">Corporate Card</option>
              <option value="CASH">Cash</option>
              <option value="REIMBURSABLE">Reimbursable</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Link to Trip (Optional)</label>
            <select
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2"
            >
              <option value="">No Trip Association</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reimbursable Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="reimbursable-check"
            checked={reimbursable}
            onChange={(e) => setReimbursable(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="reimbursable-check" className="text-xs text-slate-300">
            Reimbursable by employer / client
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-slate-400 block mb-1">Notes / Merchant</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Swiggy order / Metro QR receipt"
            className="h-9 text-xs bg-slate-900 border-slate-700"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
