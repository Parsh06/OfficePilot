import React from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { TripCard } from '@/components/ui/trip-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useTripStore } from '@/stores/tripStore';
import { NavLink, useNavigate } from 'react-router-dom';
import { Briefcase, ArrowUpRight } from 'lucide-react';

export const UpcomingTripsWidget: React.FC = () => {
  const navigate = useNavigate();
  const trips = useTripStore((s) => s.trips);
  const optimizeTrip = useTripStore((s) => s.optimizeTrip);

  const upcomingTrips = trips.slice(0, 2);

  return (
    <SectionCard
      title="Upcoming Office Travel"
      description="Scheduled trips with AI price tracking and route optimization"
      action={
        <NavLink
          to="/plan/trips"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-medium transition-colors"
        >
          View All ({trips.length}) <ArrowUpRight className="w-3.5 h-3.5" />
        </NavLink>
      }
    >
      {upcomingTrips.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Upcoming Trips"
          description="You have no office trips planned. Use AI to optimize your travel schedule."
          actionLabel="Plan a Trip"
          onAction={() => navigate('/plan/trips')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onView={() => navigate('/plan/trips')}
              onOptimize={() => optimizeTrip(trip.id)}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
};
