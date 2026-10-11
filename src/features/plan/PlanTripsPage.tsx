import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TripCard } from '@/components/ui/trip-card';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { AddTripDrawer } from './AddTripDrawer';
import { TripDetailsDrawer } from './TripDetailsDrawer';
import { TravelProfileDrawer } from './TravelProfileDrawer';
import { GenerateTripsDrawer } from './GenerateTripsDrawer';
import { useTripStore } from '@/stores/tripStore';
import { useAuth } from '@/features/auth/useAuth';
import type { TripStatus } from '@/lib/travelEngine';
import { 
  PlusCircle, 
  Briefcase, 
  Sparkles, 
  Compass, 
  Building2, 
  BedDouble, 
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export const PlanTripsPage: React.FC = () => {
  const { user } = useAuth();
  const trips = useTripStore((s) => s.trips);
  const filterStatus = useTripStore((s) => s.filterStatus);
  const setFilterStatus = useTripStore((s) => s.setFilterStatus);
  const optimizeTrip = useTripStore((s) => s.optimizeTrip);
  const fetchUserTripsAndProfiles = useTripStore((s) => s.fetchUserTripsAndProfiles);
  const activeProfile = useTripStore((s) => s.activeProfile);

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isGenerateDrawerOpen, setIsGenerateDrawerOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchUserTripsAndProfiles(user.uid);
    }
  }, [user?.uid, fetchUserTripsAndProfiles]);

  const filterOptions: { label: string; value: TripStatus | 'ALL'; count?: number }[] = [
    { label: 'All Trips', value: 'ALL', count: trips.length },
    { label: 'Planned', value: 'PLANNED', count: trips.filter((t) => t.status === 'PLANNED').length },
    { label: 'Confirmed', value: 'CONFIRMED', count: trips.filter((t) => t.status === 'CONFIRMED').length },
    { label: 'Completed', value: 'COMPLETED', count: trips.filter((t) => t.status === 'COMPLETED').length },
  ];

  const filteredTrips = trips.filter((t) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  const totalPlannedCost = trips.reduce((sum, t) => sum + (t.plannedCost || t.actualCost || 0), 0);
  const totalWfoDays = trips.reduce((sum, t) => sum + (t.workDays?.length || 1), 0);
  const totalNights = trips.reduce((sum, t) => sum + (t.nightsCount || 0), 0);

  const handleOptimize = (id: string) => {
    optimizeTrip(id);
    toast.success('AI Optimized: Applied smart flight grouping and lower rate alerts!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#121524] via-[#101320] to-[#0e111a] border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Active Trip Blocks</span>
            <p className="text-base font-bold text-white mt-0.5">{trips.length} Scheduled</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">In-Office Days</span>
            <p className="text-base font-bold text-blue-400 mt-0.5">{totalWfoDays} Days</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Overnight Stays</span>
            <p className="text-base font-bold text-indigo-400 mt-0.5">{totalNights} Nights</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-medium">Total Planned Cost</span>
            <p className="text-base font-bold text-emerald-400 mt-0.5">{formatCurrency(totalPlannedCost)}</p>
          </div>
        </div>
      </div>

      {/* Top action & filter bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <FilterBar
          options={filterOptions}
          selected={filterStatus}
          onChange={(val) => setFilterStatus(val)}
          onReset={() => setFilterStatus('ALL')}
          hasActiveFilters={filterStatus !== 'ALL'}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsProfileDrawerOpen(true)}
            className="gap-1.5 text-xs h-9 bg-slate-900 border-slate-700 hover:border-slate-600"
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Routes & Profiles ({activeProfile?.name || 'Standard'})</span>
          </Button>

          <Button
            type="button"
            variant="ai"
            onClick={() => setIsGenerateDrawerOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate from Schedule</span>
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={() => setIsAddDrawerOpen(true)}
            className="gap-1.5 text-xs h-9 shadow-md shadow-indigo-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Custom Trip</span>
          </Button>
        </div>
      </div>

      {/* Trips list */}
      {filteredTrips.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Trips Found"
          description={
            filterStatus !== 'ALL'
              ? `No trips matching the "${filterStatus}" status.`
              : 'You have not generated or planned any office travel trips yet.'
          }
          actionLabel="Generate from Schedule"
          onAction={() => setIsGenerateDrawerOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onView={() => setSelectedTripId(trip.id)}
              onOptimize={() => handleOptimize(trip.id)}
            />
          ))}
        </div>
      )}

      {/* Travel Profile & Segments Drawer */}
      <TravelProfileDrawer
        open={isProfileDrawerOpen}
        onOpenChange={setIsProfileDrawerOpen}
      />

      {/* Generate Trips from Schedule Drawer */}
      <GenerateTripsDrawer
        open={isGenerateDrawerOpen}
        onOpenChange={setIsGenerateDrawerOpen}
      />

      {/* Add Custom Trip Drawer */}
      <AddTripDrawer
        open={isAddDrawerOpen}
        onOpenChange={setIsAddDrawerOpen}
      />

      {/* View Trip Details Drawer */}
      <TripDetailsDrawer
        tripId={selectedTripId}
        open={!!selectedTripId}
        onOpenChange={(open) => !open && setSelectedTripId(null)}
      />
    </div>
  );
};
