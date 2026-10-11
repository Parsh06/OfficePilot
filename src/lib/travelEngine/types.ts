export type TravelSegmentMode =
  | 'walking'
  | 'bus'
  | 'train'
  | 'metro'
  | 'auto'
  | 'rapido'
  | 'uber'
  | 'cab'
  | 'flight'
  | 'fuel'
  | 'other';

export type RouteDirection = 'OUTBOUND' | 'RETURN' | 'LOCAL';

export type AccommodationType =
  | 'PG'
  | 'hotel'
  | 'guest house'
  | "friend's place"
  | 'own accommodation'
  | 'other';

export type TripStatus = 'PLANNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface RouteSegment {
  id: string;
  label: string;
  mode: TravelSegmentMode;
  origin: string;
  destination: string;
  estimatedCost: number;
  estimatedDurationMinutes?: number;
  sequence: number;
  direction: RouteDirection;
  active: boolean;
  provider?: string;
  bookingReference?: string;
  departureTime?: string;
  arrivalTime?: string;
  notes?: string;
}

export interface TravelProfile {
  id: string;
  userId: string;
  name: string;
  homeLocation: string;
  officeLocation: string;
  outboundSegments: RouteSegment[];
  returnSegments: RouteSegment[];
  localDailySegments?: RouteSegment[];
  isDefault?: boolean;
  currency?: string;
  uid?: string;
  seatPreference?: 'WINDOW' | 'AISLE' | 'ANY' | string;
  preferredAirlines?: string[];
  preferredTravelMode?: string;
  preferredHotelChains?: string[];
  outboundCostEstimate?: number;
  returnCostEstimate?: number;
  localTransportDailyCost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripAccommodation {
  id: string;
  type: AccommodationType;
  name?: string;
  location: string;
  nightlyCost: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  totalCost: number;
  notes?: string;
  bookingReference?: string;
}

export interface TripBlock {
  id: string;
  userId: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  origin: string;
  destination: string;
  officeLocation: string;
  purpose: string;
  workDays: string[]; // List of YYYY-MM-DD dates in this trip
  travelSegments: RouteSegment[];
  segments?: any[];
  accommodation?: TripAccommodation;
  nightsCount: number;
  plannedTravelCost: number;
  plannedStayCost: number;
  plannedCost: number;
  estimatedCost?: number;
  actualCost?: number;
  status: TripStatus;
  travelProfileId?: string;
  aiOptimizationScore: number;
  aiSavingsEstimate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostBreakdown {
  outboundTravelCost: number;
  returnTravelCost: number;
  localTravelCost: number;
  totalTravelCost: number;
  stayCost: number;
  totalPlannedCost: number;
}
