import React from 'react';
import type { TripBlock } from '@/lib/travelEngine';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import { Button } from './button';
import { 
  MapPin, 
  Calendar, 
  Sparkles, 
  ArrowRight,
  TrendingDown,
  BedDouble,
  Building2,
  Train,
  Plane,
  Car,
  Footprints,
  Bus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripCardProps {
  trip: TripBlock | any;
  onView?: () => void;
  onOptimize?: () => void;
  className?: string;
}

export const TripCard: React.FC<TripCardProps> = ({
  trip,
  onView,
  onOptimize,
  className,
}) => {
  const workDaysCount = trip.workDays?.length || 1;
  const nightsCount = trip.nightsCount ?? (trip.accommodation?.nights || 0);
  const segments = trip.travelSegments || trip.segments || [];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'train':
      case 'metro':
        return <Train className="w-3.5 h-3.5 text-cyan-400" />;
      case 'flight':
        return <Plane className="w-3.5 h-3.5 text-emerald-400" />;
      case 'bus':
        return <Bus className="w-3.5 h-3.5 text-amber-400" />;
      case 'walking':
        return <Footprints className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <Car className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col justify-between p-5 rounded-2xl border border-slate-800/90 bg-[#121520] hover:border-slate-700/80 transition-all duration-300 shadow-md',
        className
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={trip.status} size="sm" />
              <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                <Sparkles className="w-3 h-3" />
                {trip.aiOptimizationScore || 90}% Optimized
              </span>
            </div>
            <h4 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors mt-1">
              {trip.title}
            </h4>
          </div>

          <div className="text-right shrink-0">
            <p className="text-base font-bold text-white">
              {formatCurrency(trip.actualCost || trip.plannedCost || trip.estimatedCost || 0)}
            </p>
            {trip.aiSavingsEstimate && trip.aiSavingsEstimate > 0 && (
              <p className="flex items-center justify-end gap-0.5 text-xs font-semibold text-emerald-400">
                <TrendingDown className="w-3 h-3" />
                Save {formatCurrency(trip.aiSavingsEstimate)}
              </p>
            )}
          </div>
        </div>

        {/* Route visualization */}
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#0b0e14] border border-slate-800/80 mb-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>{trip.origin}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{trip.destination}</span>
          </div>
        </div>

        {/* Badges row: WFO Days, Nights, Accommodation */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Building2 className="w-3 h-3 text-blue-400" />
            {workDaysCount} WFO {workDaysCount === 1 ? 'Day' : 'Days'}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <BedDouble className="w-3 h-3 text-indigo-400" />
            {nightsCount === 0 ? '0 Nights (Day Trip)' : `${nightsCount} ${nightsCount === 1 ? 'Night' : 'Nights'}`}
          </span>

          {trip.accommodation && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {trip.accommodation.type.toUpperCase()}
            </span>
          )}
        </div>

        {/* Multi-modal Segments Preview */}
        {segments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-3 scrollbar-none">
            {segments.slice(0, 5).map((seg: any, idx: number) => (
              <span
                key={seg.id || idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 shrink-0"
              >
                {getModeIcon(seg.mode || seg.type?.toLowerCase())}
                <span className="capitalize">{seg.mode || seg.type?.toLowerCase()}</span>
              </span>
            ))}
            {segments.length > 5 && (
              <span className="text-[10px] text-slate-500">+{segments.length - 5} more</span>
            )}
          </div>
        )}

        {/* Date and Office Location */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {formatShortDate(trip.startDate)} — {formatShortDate(trip.endDate)}
            </span>
          </div>
          <span className="text-slate-500 truncate max-w-[180px]">
            {trip.officeLocation}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/60 mt-2">
        {onOptimize && (trip.aiOptimizationScore || 90) < 95 && (
          <Button
            type="button"
            variant="ai"
            size="sm"
            onClick={onOptimize}
            className="text-xs gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Optimize
          </Button>
        )}
        {onView && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onView}
            className="text-xs"
          >
            View Details
          </Button>
        )}
      </div>
    </div>
  );
};
