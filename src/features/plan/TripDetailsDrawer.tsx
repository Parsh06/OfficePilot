import React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { useTripStore } from '@/stores/tripStore';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Plane, 
  Hotel, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Trash2,
  Building2,
  Train,
  Car,
  Footprints,
  Bus,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface TripDetailsDrawerProps {
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TripDetailsDrawer: React.FC<TripDetailsDrawerProps> = ({
  tripId,
  open,
  onOpenChange,
}) => {
  const getTrip = useTripStore((s) => s.getTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const optimizeTrip = useTripStore((s) => s.optimizeTrip);

  if (!tripId) return null;
  const trip = getTrip(tripId);
  if (!trip) return null;

  const handleDelete = async () => {
    await deleteTrip(trip.id);
    toast.success('Trip deleted');
    onOpenChange(false);
  };

  const handleOptimize = () => {
    optimizeTrip(trip.id);
    toast.success('Applied AI optimization: route re-calculated and batch savings locked!');
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'train':
      case 'metro':
        return Train;
      case 'flight':
        return Plane;
      case 'bus':
        return Bus;
      case 'walking':
        return Footprints;
      case 'hotel':
      case 'pg':
      case 'stay':
        return Hotel;
      default:
        return Car;
    }
  };

  // Build timeline items from segments and accommodation
  const timelineItems: TimelineItem[] = [];

  // 1. Outbound segments
  const outboundSegments = (trip.travelSegments || []).filter((s) => s.direction === 'OUTBOUND');
  outboundSegments.forEach((seg) => {
    const Icon = getModeIcon(seg.mode);
    timelineItems.push({
      id: seg.id,
      title: `${seg.label} (${seg.origin} ➔ ${seg.destination})`,
      subtitle: `${seg.mode.toUpperCase()} • ${seg.estimatedDurationMinutes || 30} mins • ${seg.provider || 'Scheduled Transit'}`,
      time: seg.departureTime || 'Outbound Transit',
      icon: Icon,
      status: 'active',
      badge: (
        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          {formatCurrency(seg.estimatedCost)}
        </span>
      ),
    });
  });

  // 2. Accommodation stay block (if nights > 0)
  if (trip.accommodation && trip.nightsCount > 0) {
    timelineItems.push({
      id: trip.accommodation.id,
      title: `${trip.accommodation.name || trip.accommodation.type.toUpperCase()} Stay (${trip.nightsCount} Nights)`,
      subtitle: `Check-in: ${formatDate(trip.accommodation.checkIn)} • Check-out: ${formatDate(trip.accommodation.checkOut)} • ${trip.accommodation.location}`,
      time: 'Accommodation Stay',
      icon: Hotel,
      status: 'active',
      badge: (
        <span className="text-xs font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
          {formatCurrency(trip.accommodation.totalCost)}
        </span>
      ),
    });
  }

  // 3. Return segments
  const returnSegments = (trip.travelSegments || []).filter((s) => s.direction === 'RETURN');
  returnSegments.forEach((seg) => {
    const Icon = getModeIcon(seg.mode);
    timelineItems.push({
      id: seg.id,
      title: `${seg.label} (${seg.origin} ➔ ${seg.destination})`,
      subtitle: `${seg.mode.toUpperCase()} • ${seg.estimatedDurationMinutes || 30} mins • ${seg.provider || 'Return Transit'}`,
      time: seg.departureTime || 'Return Transit',
      icon: Icon,
      status: 'active',
      badge: (
        <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
          {formatCurrency(seg.estimatedCost)}
        </span>
      ),
    });
  });

  const outboundTotal = outboundSegments.reduce((sum, s) => sum + s.estimatedCost, 0);
  const returnTotal = returnSegments.reduce((sum, s) => sum + s.estimatedCost, 0);
  const stayTotal = trip.accommodation?.totalCost || 0;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <span>{trip.title}</span>
          <StatusBadge status={trip.status} size="sm" />
        </div>
      }
      description={`Trip Block: ${trip.id} • ${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}`}
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
            Delete Trip
          </Button>

          <div className="flex items-center gap-2">
            {trip.aiOptimizationScore < 95 && (
              <Button
                type="button"
                variant="ai"
                size="sm"
                onClick={handleOptimize}
                className="gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Re-Optimize Itinerary
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Cost & AI Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-[#141829] to-[#12141f]">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase">
              Total Planned Cost
            </span>
            <p className="text-xl font-bold text-white mt-0.5">
              {formatCurrency(trip.actualCost || trip.plannedCost || trip.estimatedCost || 0)}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase">
              AI Optimization Score
            </span>
            <p className="text-xl font-bold text-purple-400 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-4 h-4" />
              {trip.aiOptimizationScore}/100
            </p>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase">
              Est. Batch Savings
            </span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">
              {formatCurrency(trip.aiSavingsEstimate || 0)}
            </p>
          </div>
        </div>

        {/* Detailed Cost Breakdown */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0e111a] space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Deterministic Cost Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[11px]">Outbound Route</span>
              <p className="font-semibold text-emerald-400 mt-0.5">{formatCurrency(outboundTotal)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[11px]">Return Route</span>
              <p className="font-semibold text-cyan-400 mt-0.5">{formatCurrency(returnTotal)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[11px]">Accommodation</span>
              <p className="font-semibold text-purple-400 mt-0.5">{formatCurrency(stayTotal)}</p>
            </div>
          </div>
        </div>

        {/* Work Days & Location */}
        <div className="space-y-3 p-4 rounded-xl border border-slate-800 bg-[#0e111a]">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              {trip.origin} ➔ {trip.destination}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Scheduled Office Days:</span>
            <div className="flex flex-wrap gap-1.5">
              {(trip.workDays || [trip.startDate]).map((day: string) => (
                <span
                  key={day}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-mono"
                >
                  <Building2 className="w-3 h-3 inline mr-1 text-blue-400" />
                  {day}
                </span>
              ))}
            </div>
          </div>

          {trip.purpose && (
            <p className="text-xs text-slate-300 pt-1">
              <span className="text-slate-500 font-medium">Purpose: </span>
              {trip.purpose}
            </p>
          )}

          {trip.notes && (
            <p className="text-xs text-slate-400 italic">
              "{trip.notes}"
            </p>
          )}
        </div>

        {/* Segments Itinerary Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Full Route Timeline & Stays ({timelineItems.length} Segments)
          </h4>
          {timelineItems.length > 0 ? (
            <Timeline items={timelineItems} className="pt-2" />
          ) : (
            <p className="text-xs text-slate-500">No booking segments added yet.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
};
