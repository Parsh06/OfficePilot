import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TripSchema, TripFormData } from '@/schemas';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useTripStore } from '@/stores/tripStore';
import { toast } from 'sonner';

interface AddTripDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTripDrawer: React.FC<AddTripDrawerProps> = ({ open, onOpenChange }) => {
  const addTrip = useTripStore((s) => s.addTrip);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripFormData>({
    resolver: zodResolver(TripSchema),
    defaultValues: {
      title: '',
      origin: 'San Francisco (SFO)',
      destination: 'Seattle (SEA)',
      officeLocation: 'Seattle HQ — Lake Union Campus',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      estimatedCost: 950,
      notes: '',
    },
  });

  const estimatedCost = watch('estimatedCost');

  const onSubmit = async (data: TripFormData) => {
    await addTrip({
      title: data.title,
      origin: data.origin,
      destination: data.destination,
      officeLocation: data.officeLocation,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'PLANNED',
      purpose: 'Custom Planned Trip',
      workDays: [data.startDate, data.endDate],
      travelSegments: [],
      nightsCount: 0,
      plannedTravelCost: data.estimatedCost,
      plannedStayCost: 0,
      plannedCost: data.estimatedCost,
      estimatedCost: data.estimatedCost,
      notes: data.notes,
    } as any);

    toast.success(`Trip "${data.title}" successfully created and added to your itinerary!`);
    reset();
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Plan New Office Trip"
      description="Create a work travel itinerary with AI flight and hotel optimizations."
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
            Create Trip
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Trip Title / Purpose
          </label>
          <Input
            {...register('title')}
            placeholder="e.g. Q4 Sprint Planning & Team Summit"
          />
          {errors.title && (
            <p className="text-xs text-rose-400">{errors.title.message}</p>
          )}
        </div>

        {/* Origin & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Origin City / Airport
            </label>
            <Input
              {...register('origin')}
              placeholder="e.g. San Francisco (SFO)"
            />
            {errors.origin && (
              <p className="text-xs text-rose-400">{errors.origin.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Destination City / Airport
            </label>
            <Input
              {...register('destination')}
              placeholder="e.g. Seattle (SEA)"
            />
            {errors.destination && (
              <p className="text-xs text-rose-400">{errors.destination.message}</p>
            )}
          </div>
        </div>

        {/* Office Location */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Target Office Campus
          </label>
          <Input
            {...register('officeLocation')}
            placeholder="e.g. Seattle HQ — Lake Union Campus"
          />
          {errors.officeLocation && (
            <p className="text-xs text-rose-400">{errors.officeLocation.message}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Start Date
            </label>
            <Input type="date" {...register('startDate')} />
            {errors.startDate && (
              <p className="text-xs text-rose-400">{errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              End Date
            </label>
            <Input type="date" {...register('endDate')} />
            {errors.endDate && (
              <p className="text-xs text-rose-400">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Estimated Budget / Total Cost ($)
          </label>
          <CurrencyInput
            value={estimatedCost}
            onChange={(val) => setValue('estimatedCost', val)}
          />
          {errors.estimatedCost && (
            <p className="text-xs text-rose-400">{errors.estimatedCost.message}</p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Notes / Objectives
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="flex w-full rounded-xl border border-slate-800 bg-[#0f121a] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Add any specific context or flight constraints..."
          />
        </div>
      </form>
    </Drawer>
  );
};
