import type { RouteSegment, TripAccommodation, CostBreakdown } from './types';

/**
 * Deterministically calculates outbound travel cost by summing active outbound segments.
 */
export function calculateOutboundCost(segments: RouteSegment[]): number {
  if (!segments || segments.length === 0) return 0;
  return segments
    .filter((s) => s.active && s.direction === 'OUTBOUND')
    .reduce((sum, s) => sum + (Number(s.estimatedCost) || 0), 0);
}

/**
 * Deterministically calculates return travel cost by summing active return segments.
 */
export function calculateReturnCost(segments: RouteSegment[]): number {
  if (!segments || segments.length === 0) return 0;
  return segments
    .filter((s) => s.active && s.direction === 'RETURN')
    .reduce((sum, s) => sum + (Number(s.estimatedCost) || 0), 0);
}

/**
 * Deterministically calculates local travel cost per day or over a given number of days.
 */
export function calculateLocalTravelCost(segments: RouteSegment[], daysCount = 1): number {
  if (!segments || segments.length === 0 || daysCount <= 0) return 0;
  const singleDayLocalCost = segments
    .filter((s) => s.active && s.direction === 'LOCAL')
    .reduce((sum, s) => sum + (Number(s.estimatedCost) || 0), 0);
  return singleDayLocalCost * daysCount;
}

/**
 * Deterministically calculates total travel cost across outbound, return, and local segments.
 */
export function calculateTripTravelCost(segments: RouteSegment[], localDaysCount = 1): number {
  const outbound = calculateOutboundCost(segments);
  const returnCost = calculateReturnCost(segments);
  const local = calculateLocalTravelCost(segments, localDaysCount);
  return outbound + returnCost + local;
}

/**
 * Deterministically calculates accommodation cost based on check-in and check-out dates.
 */
export function calculateAccommodationCost(
  nightlyCost: number,
  checkIn: string,
  checkOut: string
): { nights: number; totalCost: number } {
  if (!checkIn || !checkOut) {
    return { nights: 0, totalCost: 0 };
  }

  const inDate = new Date(`${checkIn}T00:00:00`);
  const outDate = new Date(`${checkOut}T00:00:00`);

  const diffMs = outDate.getTime() - inDate.getTime();
  const nights = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const totalCost = nights * Math.max(0, nightlyCost);

  return { nights, totalCost };
}

/**
 * Generates an exhaustive deterministic cost breakdown for a trip block.
 */
export function calculateTripCostBreakdown(
  segments: RouteSegment[],
  accommodation?: TripAccommodation,
  workDaysCount = 1
): CostBreakdown {
  const outboundTravelCost = calculateOutboundCost(segments);
  const returnTravelCost = calculateReturnCost(segments);
  const localTravelCost = calculateLocalTravelCost(segments, Math.max(1, workDaysCount));
  const totalTravelCost = outboundTravelCost + returnTravelCost + localTravelCost;
  const stayCost = accommodation ? Number(accommodation.totalCost) || 0 : 0;
  const totalPlannedCost = totalTravelCost + stayCost;

  return {
    outboundTravelCost,
    returnTravelCost,
    localTravelCost,
    totalTravelCost,
    stayCost,
    totalPlannedCost,
  };
}
