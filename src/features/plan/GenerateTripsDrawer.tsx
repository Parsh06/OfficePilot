import React, { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useTripStore } from '@/stores/tripStore';
import type { AccommodationType, TripBlock } from '@/lib/travelEngine';
import { generateTripPlan } from '@/lib/travelEngine';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Sparkles, 
  Calendar, 
  BedDouble, 
  Building2, 
  ArrowRight,
  CheckCircle,
  Hotel
} from 'lucide-react';
import { toast } from 'sonner';

interface GenerateTripsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'PG', label: 'PG / Co-living' },
  { value: 'guest house', label: 'Guest House' },
  { value: "friend's place", label: "Friend's / Family Place (Free)" },
  { value: 'own accommodation', label: 'Own Second Flat' },
  { value: 'other', label: 'Other' },
];

export const GenerateTripsDrawer: React.FC<GenerateTripsDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const normalSchedule = useScheduleStore((s) => s.normalSchedule);
  const exceptions = useScheduleStore((s) => s.exceptions);
  const activeProfile = useTripStore((s) => s.activeProfile);
  const travelProfiles = useTripStore((s) => s.travelProfiles);
  const generateTripsFromSchedule = useTripStore((s) => s.generateTripsFromSchedule);
  const userId = useTripStore((s) => s.userId);

  const profile = activeProfile || travelProfiles[0];

  // Default to current month window
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('hotel');
  const [nightlyRate, setNightlyRate] = useState<number>(3200);
  const [isGenerating, setIsGenerating] = useState(false);

  // Compute live preview of trip blocks
  const previewTrips: TripBlock[] = React.useMemo(() => {
    if (!startDate || !endDate || !profile) return [];
    try {
      return generateTripPlan({
        startDate,
        endDate,
        userId,
        travelProfile: profile,
        normalSchedule,
        exceptions,
        preferredAccommodationType: accommodationType,
        nightlyRateEstimate: nightlyRate,
      });
    } catch {
      return [];
    }
  }, [startDate, endDate, profile, normalSchedule, exceptions, accommodationType, nightlyRate, userId]);

  const totalCost = previewTrips.reduce((sum, t) => sum + t.plannedCost, 0);
  const totalWfoDays = previewTrips.reduce((sum, t) => sum + (t.workDays?.length || 1), 0);
  const totalNights = previewTrips.reduce((sum, t) => sum + t.nightsCount, 0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateTripsFromSchedule({
        startDate,
        endDate,
        normalSchedule,
        exceptions,
        preferredAccommodationType: accommodationType,
        nightlyRate,
        autoSave: true,
      });

      toast.success(`Generated and saved ${generated.length} trip blocks for your schedule!`);
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to generate trips');
      console.error(err);
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
          <span>Generate Trip Blocks from Schedule</span>
        </div>
      }
      description="Automatically converts your resolved in-office work days into realistic multi-segment itineraries and stays"
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
            disabled={previewTrips.length === 0 || isGenerating}
            className="gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <CheckCircle className="w-4 h-4" />
            {isGenerating ? 'Generating...' : `Save ${previewTrips.length} Generated Trips`}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Date Range & Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0e111a] border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9 bg-slate-900 border-slate-700"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9 bg-slate-900 border-slate-700"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <Hotel className="w-3.5 h-3.5 text-purple-400" />
              Accommodation Type
            </label>
            <select
              value={accommodationType}
              onChange={(e) => setAccommodationType(e.target.value as AccommodationType)}
              className="w-full h-9 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2"
            >
              {ACCOMMODATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-cyan-400" />
              Nightly Rate Estimate (₹)
            </label>
            <Input
              type="number"
              value={nightlyRate}
              onChange={(e) => setNightlyRate(Number(e.target.value))}
              disabled={accommodationType === "friend's place" || accommodationType === 'own accommodation'}
              className="text-xs h-9 bg-slate-900 border-slate-700 font-mono"
            />
          </div>
        </div>

        {/* Live Generation Metrics Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30 border border-purple-500/20 text-center">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Trip Blocks</span>
            <p className="text-xl font-bold text-white mt-0.5">{previewTrips.length}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Total WFO / Stay</span>
            <p className="text-xl font-bold text-blue-400 mt-0.5">
              {totalWfoDays} Days • {totalNights} Nights
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Est. Total Cost</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{formatCurrency(totalCost)}</p>
          </div>
        </div>

        {/* Generated Blocks Preview List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Preview Identified Trip Blocks ({previewTrips.length})
          </h4>

          {previewTrips.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No in-office work days found in selected date range. Check your schedule or add WFO overrides in the Calendar.
            </div>
          ) : (
            <div className="space-y-3">
              {previewTrips.map((trip, idx) => (
                <div
                  key={trip.id || idx}
                  className="p-4 rounded-xl bg-[#111420] border border-slate-800 text-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-semibold text-slate-200 text-sm">{trip.title}</h5>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {formatDate(trip.startDate)} ➔ {formatDate(trip.endDate)}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-400 text-sm">
                      {formatCurrency(trip.plannedCost)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px]">
                      <Building2 className="w-3 h-3 inline mr-1" />
                      {trip.workDays.length} WFO Days ({trip.workDays.join(', ')})
                    </span>

                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px]">
                      <BedDouble className="w-3 h-3 inline mr-1" />
                      {trip.nightsCount === 0 ? 'Same Day Return (0 Nights)' : `${trip.nightsCount} Night(s) Stay`}
                    </span>
                  </div>

                  {trip.accommodation && (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">
                        Stay: {trip.accommodation.type.toUpperCase()} ({trip.accommodation.nights} nights @ {formatCurrency(trip.accommodation.nightlyCost)}/nt)
                      </span>
                      <span className="font-semibold text-purple-300">
                        {formatCurrency(trip.accommodation.totalCost)}
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {trip.travelSegments.filter((s) => s.direction === 'OUTBOUND').length} Outbound Segments •{' '}
                      {trip.travelSegments.filter((s) => s.direction === 'RETURN').length} Return Segments
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
