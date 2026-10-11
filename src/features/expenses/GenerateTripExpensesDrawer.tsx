import React, { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useTripStore } from '@/stores/tripStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { generatePlannedExpensesForTrip } from '@/lib/expenseEngine';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Sparkles, 
  CheckCircle2, 
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface GenerateTripExpensesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenerateTripExpensesDrawer: React.FC<GenerateTripExpensesDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const trips = useTripStore((s) => s.trips);
  const templates = useExpenseStore((s) => s.templates);
  const expenses = useExpenseStore((s) => s.expenses);
  const generateExpensesFromTrip = useExpenseStore((s) => s.generateExpensesFromTrip);

  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (trips.length > 0 && !selectedTripId) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, selectedTripId]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  const previewGenerated = React.useMemo(() => {
    if (!selectedTrip) return [];
    return generatePlannedExpensesForTrip(selectedTrip, templates, expenses);
  }, [selectedTrip, templates, expenses]);

  const previewTotal = previewGenerated.reduce((sum, e) => sum + e.plannedAmount, 0);

  const handleGenerate = async () => {
    if (!selectedTrip) return;
    setIsGenerating(true);
    try {
      const created = await generateExpensesFromTrip(selectedTrip);
      toast.success(`Generated ${created.length} planned expense line-items for "${selectedTrip.title}"!`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to generate expenses');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Generate Planned Expenses for Trip</span>
        </div>
      }
      description="Connects trip route segments, hotel stays, and daily food templates into planned expense line-items"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || previewGenerated.length === 0}
            className="gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isGenerating ? 'Generating...' : `Generate ${previewGenerated.length} Planned Expenses`}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Trip Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Trip Block
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {trips.map((t) => {
              const isSelected = t.id === selectedTrip?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTripId(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/50 shadow-sm'
                      : 'bg-[#0e111a] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs truncate max-w-[200px]">
                      {t.title}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {formatCurrency(t.plannedCost)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    {formatDate(t.startDate)} ➔ {formatDate(t.endDate)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Generation Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30 border border-purple-500/20 text-center text-xs">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">New Expenses</span>
            <p className="text-xl font-bold text-white mt-0.5">{previewGenerated.length}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Office Days</span>
            <p className="text-xl font-bold text-blue-400 mt-0.5">
              {selectedTrip?.workDays?.length || 1} Days
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Total Planned</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{formatCurrency(previewTotal)}</p>
          </div>
        </div>

        {/* Preview of Generated Items */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Preview Planned Line Items ({previewGenerated.length})
          </h4>

          {previewGenerated.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              All planned expenses for this trip have already been generated and are saved in your expense records.
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {previewGenerated.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#111420] border border-slate-800 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-200">{item.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{item.date}</span>
                      <span>•</span>
                      <span className="capitalize">{item.category} ({item.subcategory})</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(item.plannedAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
