import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScenarioSchema, ScenarioFormData } from '@/schemas';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScenarioStore } from '@/stores/scenarioStore';
import { toast } from 'sonner';

interface AddScenarioDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddScenarioDrawer: React.FC<AddScenarioDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const addScenario = useScenarioStore((s) => s.addScenario);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScenarioFormData>({
    resolver: zodResolver(ScenarioSchema),
    defaultValues: {
      name: '',
      description: '',
      wfoDaysPerWeek: 2,
      batchingCadence: 'BIWEEKLY',
      transportPreference: 'OPTIMAL',
      hotelTier: 'STANDARD',
    },
  });

  const onSubmit = (data: ScenarioFormData) => {
    addScenario(data);
    toast.success(`Scenario "${data.name}" added to comparison model!`);
    reset();
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Create Hybrid Scenario Model"
      description="Simulate the cost, travel hours, and policy compliance of different attendance patterns."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)}
          >
            Simulate Scenario
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Scenario Name
          </label>
          <Input
            {...register('name')}
            placeholder="e.g. Monthly Immersion Block, 3-Day Hybrid Weekly"
          />
          {errors.name && (
            <p className="text-xs text-rose-400">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={2}
            className="flex w-full rounded-xl border border-slate-800 bg-[#0f121a] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Key rationale or logistics behind this scenario..."
          />
          {errors.description && (
            <p className="text-xs text-rose-400">{errors.description.message}</p>
          )}
        </div>

        {/* Cadence & WFO Days */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Batching Cadence
            </label>
            <select
              {...register('batchingCadence')}
              className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0f121a] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="WEEKLY">Weekly Commutes</option>
              <option value="BIWEEKLY">Bi-Weekly Batched (Every 2 Wks)</option>
              <option value="MONTHLY">Monthly Immersion (Once a Month)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              WFO Days / Week
            </label>
            <Input
              type="number"
              min={1}
              max={5}
              {...register('wfoDaysPerWeek', { valueAsNumber: true })}
            />
            {errors.wfoDaysPerWeek && (
              <p className="text-xs text-rose-400">{errors.wfoDaysPerWeek.message}</p>
            )}
          </div>
        </div>

        {/* Transport & Hotel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Transport Mode
            </label>
            <select
              {...register('transportPreference')}
              className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0f121a] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="OPTIMAL">AI Dynamic Optimal</option>
              <option value="FLIGHT">Direct Flight</option>
              <option value="TRAIN">Train / Express Rail</option>
              <option value="DRIVE">Car Drive / Rental</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hotel Tier
            </label>
            <select
              {...register('hotelTier')}
              className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0f121a] px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="STANDARD">Standard Business ($175/nt)</option>
              <option value="BUDGET">Budget / Extended Stay ($120/nt)</option>
              <option value="PREMIUM">Premium / Campus Proximity ($280/nt)</option>
            </select>
          </div>
        </div>
      </form>
    </Drawer>
  );
};
