import type { NormalSchedule, ScheduleException, ResolvedDaySchedule } from '@/lib/scheduleEngine';
import { resolveDateRange } from '@/lib/scheduleEngine';
import type {
  TravelProfile,
  TripBlock,
  RouteSegment,
  AccommodationType,
} from './types';
import { calculateTripCostBreakdown } from './costEngine';
import { buildTripAccommodation, determineOvernightStay } from './accommodationPlanner';

export interface GenerateTripPlanOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  userId: string;
  travelProfile: TravelProfile;
  normalSchedule: NormalSchedule;
  exceptions?: ScheduleException[];
  preferredAccommodationType?: AccommodationType;
  nightlyRateEstimate?: number;
}

/**
 * Creates default route segments for common inter-city travel (e.g., Mumbai <-> Pune).
 */
export function createDefaultRouteSegments(
  homeCity = 'Mumbai',
  officeCity = 'Pune'
): { outbound: RouteSegment[]; returnSegs: RouteSegment[] } {
  const outbound: RouteSegment[] = [
    {
      id: 'seg_out_1',
      label: 'Home to Transit Station',
      mode: 'cab',
      origin: `Home (${homeCity})`,
      destination: `${homeCity} Central Station`,
      estimatedCost: 350,
      estimatedDurationMinutes: 35,
      sequence: 1,
      direction: 'OUTBOUND',
      active: true,
    },
    {
      id: 'seg_out_2',
      label: 'Intercity Express Transit',
      mode: 'train',
      origin: `${homeCity} Central Station`,
      destination: `${officeCity} Junction`,
      estimatedCost: 850,
      estimatedDurationMinutes: 180,
      sequence: 2,
      direction: 'OUTBOUND',
      active: true,
      provider: 'Vande Bharat / Express',
    },
    {
      id: 'seg_out_3',
      label: 'Station to Office Hub',
      mode: 'auto',
      origin: `${officeCity} Junction`,
      destination: `${officeCity} Tech Park`,
      estimatedCost: 200,
      estimatedDurationMinutes: 25,
      sequence: 3,
      direction: 'OUTBOUND',
      active: true,
    },
  ];

  const returnSegs: RouteSegment[] = [
    {
      id: 'seg_ret_1',
      label: 'Office to Station',
      mode: 'auto',
      origin: `${officeCity} Tech Park`,
      destination: `${officeCity} Junction`,
      estimatedCost: 200,
      estimatedDurationMinutes: 25,
      sequence: 1,
      direction: 'RETURN',
      active: true,
    },
    {
      id: 'seg_ret_2',
      label: 'Intercity Return Transit',
      mode: 'train',
      origin: `${officeCity} Junction`,
      destination: `${homeCity} Central Station`,
      estimatedCost: 850,
      estimatedDurationMinutes: 180,
      sequence: 2,
      direction: 'RETURN',
      active: true,
      provider: 'Vande Bharat / Express',
    },
    {
      id: 'seg_ret_3',
      label: 'Station to Home',
      mode: 'cab',
      origin: `${homeCity} Central Station`,
      destination: `Home (${homeCity})`,
      estimatedCost: 350,
      estimatedDurationMinutes: 35,
      sequence: 3,
      direction: 'RETURN',
      active: true,
    },
  ];

  return { outbound, returnSegs };
}

/**
 * Creates a default travel profile for a user.
 */
export function createDefaultTravelProfile(
  userId: string,
  name = 'Standard Office Commute',
  homeLocation = 'Mumbai',
  officeLocation = 'Pune'
): TravelProfile {
  const { outbound, returnSegs } = createDefaultRouteSegments(homeLocation, officeLocation);
  const now = new Date().toISOString();

  return {
    id: `tp_${userId}_main`,
    userId,
    name,
    homeLocation,
    officeLocation,
    outboundSegments: outbound,
    returnSegments: returnSegs,
    localDailySegments: [
      {
        id: 'seg_loc_1',
        label: 'Local Commute to Office',
        mode: 'metro',
        origin: 'Stay Location',
        destination: `${officeLocation} Office`,
        estimatedCost: 100,
        estimatedDurationMinutes: 15,
        sequence: 1,
        direction: 'LOCAL',
        active: true,
      },
    ],
    isDefault: true,
    currency: 'INR',
    uid: userId,
    seatPreference: 'AISLE',
    preferredAirlines: ['IndiGo', 'Air India', 'Vistara'],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper to identify consecutive day blocks from resolved schedule days.
 */
export function groupConsecutiveOfficeDays(resolvedDays: ResolvedDaySchedule[]): ResolvedDaySchedule[][] {
  const officeDays = resolvedDays.filter((d) => d.resolvedMode === 'WFO');
  if (officeDays.length === 0) return [];

  const groups: ResolvedDaySchedule[][] = [];
  let currentGroup: ResolvedDaySchedule[] = [];

  for (let i = 0; i < officeDays.length; i++) {
    const current = officeDays[i];

    if (currentGroup.length === 0) {
      currentGroup.push(current);
    } else {
      const prev = currentGroup[currentGroup.length - 1];
      const prevDate = new Date(`${prev.date}T00:00:00`);
      const currDate = new Date(`${current.date}T00:00:00`);

      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      // If consecutive calendar day, keep in same group
      if (diffDays === 1) {
        currentGroup.push(current);
      } else {
        groups.push(currentGroup);
        currentGroup = [current];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Deterministically generates a realistic list of planned Trip Blocks from a resolved schedule.
 */
export function generateTripPlan(options: GenerateTripPlanOptions): TripBlock[] {
  const {
    startDate,
    endDate,
    userId,
    travelProfile,
    normalSchedule,
    exceptions = [],
    preferredAccommodationType = 'hotel',
    nightlyRateEstimate = 3200,
  } = options;

  // 1. Resolve every day in the requested date range
  const resolvedDays = resolveDateRange(startDate, endDate, normalSchedule, exceptions);

  // 2. Identify office days & group into contiguous blocks
  const officeGroups = groupConsecutiveOfficeDays(resolvedDays);
  if (officeGroups.length === 0) return [];

  const now = new Date().toISOString();
  const trips: TripBlock[] = [];

  // 3. Convert each contiguous block into a TripBlock
  officeGroups.forEach((group, index) => {
    const blockStartDate = group[0].date;
    const blockEndDate = group[group.length - 1].date;
    const workDays = group.map((d) => d.date);

    // Build segments for this trip
    const tripSegments: RouteSegment[] = [];

    // Outbound segments
    (travelProfile.outboundSegments || []).forEach((seg) => {
      if (seg.active) {
        tripSegments.push({
          ...seg,
          id: `trip_seg_out_${blockStartDate}_${seg.sequence}`,
          departureTime: seg.departureTime || '07:30 AM',
        });
      }
    });

    // Return segments
    (travelProfile.returnSegments || []).forEach((seg) => {
      if (seg.active) {
        tripSegments.push({
          ...seg,
          id: `trip_seg_ret_${blockEndDate}_${seg.sequence}`,
          departureTime: seg.departureTime || '06:30 PM',
        });
      }
    });

    // Local segments for intermediate days
    if (group.length > 1 && travelProfile.localDailySegments) {
      travelProfile.localDailySegments.forEach((seg) => {
        if (seg.active) {
          tripSegments.push({
            ...seg,
            id: `trip_seg_loc_${blockStartDate}_${seg.sequence}`,
          });
        }
      });
    }

    // Determine overnight stays & accommodation
    const overnight = determineOvernightStay(blockStartDate, blockEndDate);
    const accommodation = overnight.required
      ? buildTripAccommodation({
          startDate: blockStartDate,
          endDate: blockEndDate,
          location: travelProfile.officeLocation,
          preferredType: preferredAccommodationType,
          nightlyRate: nightlyRateEstimate,
          name: `${travelProfile.officeLocation} Corporate Stay`,
        })
      : undefined;

    // Calculate deterministic costs
    const costBreakdown = calculateTripCostBreakdown(tripSegments, accommodation, group.length);

    // AI score calculation (deterministic based on batching & duration efficiency)
    let score = 85;
    if (group.length >= 2) score += 5; // Multi-day batch efficiency
    if (group.length >= 3) score += 5;
    if (accommodation?.type === 'PG' || accommodation?.type === "friend's place") score += 3;
    score = Math.min(99, score);

    const title =
      group.length === 1
        ? `${travelProfile.officeLocation} Day Office Trip`
        : `${group.length}-Day ${travelProfile.officeLocation} Work Trip`;

    const trip: TripBlock = {
      id: `trip_${userId}_${blockStartDate}_${index + 1}`,
      userId,
      title,
      startDate: blockStartDate,
      endDate: blockEndDate,
      origin: travelProfile.homeLocation,
      destination: travelProfile.officeLocation,
      officeLocation: travelProfile.officeLocation,
      purpose: `${group.length} day(s) in-office sprint & collaboration`,
      workDays,
      travelSegments: tripSegments,
      accommodation,
      nightsCount: overnight.nights,
      plannedTravelCost: costBreakdown.totalTravelCost,
      plannedStayCost: costBreakdown.stayCost,
      plannedCost: costBreakdown.totalPlannedCost,
      status: 'PLANNED',
      travelProfileId: travelProfile.id,
      aiOptimizationScore: score,
      aiSavingsEstimate: group.length > 1 ? group.length * 450 : 0,
      createdAt: now,
      updatedAt: now,
    };

    trips.push(trip);
  });

  return trips;
}
