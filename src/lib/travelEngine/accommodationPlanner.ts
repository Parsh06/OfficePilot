import type { AccommodationType, TripAccommodation } from './types';
import { calculateAccommodationCost } from './costEngine';

export interface OvernightPlanningOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  location: string;
  preferredType?: AccommodationType;
  nightlyRate?: number;
  name?: string;
  notes?: string;
  forceAccommodation?: boolean;
}

/**
 * Deterministically determines whether a trip plan requires overnight stays
 * and computes the exact checkIn/checkOut calendar dates and nights count.
 */
export function determineOvernightStay(
  startDate: string,
  endDate: string,
  forceAccommodation = false
): { required: boolean; nights: number; checkIn: string; checkOut: string } {
  if (!startDate || !endDate) {
    return { required: false, nights: 0, checkIn: startDate, checkOut: endDate };
  }

  const inDate = new Date(`${startDate}T00:00:00`);
  const outDate = new Date(`${endDate}T00:00:00`);

  const diffMs = outDate.getTime() - inDate.getTime();
  const rawNights = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (rawNights === 0 && !forceAccommodation) {
    // Single-day trip: 0 nights
    return {
      required: false,
      nights: 0,
      checkIn: startDate,
      checkOut: endDate,
    };
  }

  const nights = rawNights === 0 && forceAccommodation ? 1 : rawNights;

  return {
    required: nights > 0,
    nights,
    checkIn: startDate,
    checkOut: endDate,
  };
}

/**
 * Builds a deterministic TripAccommodation record for a trip block.
 */
export function buildTripAccommodation(
  options: OvernightPlanningOptions
): TripAccommodation | undefined {
  const { startDate, endDate, location, preferredType = 'hotel', nightlyRate = 3500, name, notes, forceAccommodation } = options;

  const overnight = determineOvernightStay(startDate, endDate, forceAccommodation);
  if (!overnight.required && !forceAccommodation) {
    return undefined;
  }

  // Cost calculation for friend's place or own accommodation is 0 unless specified
  const effectiveNightlyCost = preferredType === "friend's place" || preferredType === 'own accommodation' ? 0 : nightlyRate;
  const { totalCost } = calculateAccommodationCost(
    effectiveNightlyCost,
    overnight.checkIn,
    overnight.checkOut
  );

  return {
    id: `acc_${startDate}_${Date.now().toString(36)}`,
    type: preferredType,
    name: name || `${preferredType.toUpperCase()} near ${location}`,
    location,
    nightlyCost: effectiveNightlyCost,
    checkIn: overnight.checkIn,
    checkOut: overnight.checkOut,
    nights: overnight.nights,
    totalCost,
    notes: notes || `Auto-planned stay for ${overnight.nights} night(s) in ${location}`,
  };
}
