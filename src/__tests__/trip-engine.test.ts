import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NormalSchedule, ScheduleException } from '@/lib/scheduleEngine';
import type { RouteSegment, TravelProfile } from '@/lib/travelEngine';
import {
  calculateOutboundCost,
  calculateReturnCost,
  calculateLocalTravelCost,
  calculateTripTravelCost,
  determineOvernightStay,
  buildTripAccommodation,
  createDefaultTravelProfile,
  generateTripPlan,
} from '@/lib/travelEngine';
import {
  getTravelProfiles,
  saveTravelProfile,
  deleteTravelProfile,
} from '@/lib/firebase/services/travelProfileService';
import {
  saveTrip,
  deleteTrip,
  batchSaveTrips,
} from '@/lib/firebase/services/tripService';

// Mock Firebase Firestore SDK
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(() => 'mock-collection-ref'),
    doc: vi.fn((_db, ...pathSegments) => ({
      path: pathSegments.join('/'),
      id: pathSegments[pathSegments.length - 1] || 'mock-auto-id',
    })),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        id: 'tp-101',
        userId: 'user_trip_tester',
        name: 'Mumbai to Pune Commute',
        homeLocation: 'Mumbai',
        officeLocation: 'Pune',
        outboundSegments: [],
        returnSegments: [],
      }),
    }),
    getDocs: vi.fn().mockImplementation(() => {
      const mockDocs = [
        {
          id: 'tp-101',
          data: () => ({
            userId: 'user_trip_tester',
            name: 'Mumbai to Pune Commute',
            homeLocation: 'Mumbai',
            officeLocation: 'Pune',
            outboundSegments: [
              {
                id: 's1',
                label: 'Cab to Dadar',
                mode: 'cab',
                origin: 'Home',
                destination: 'Dadar',
                estimatedCost: 350,
                sequence: 1,
                direction: 'OUTBOUND',
                active: true,
              },
            ],
            returnSegments: [
              {
                id: 's2',
                label: 'Dadar to Home',
                mode: 'cab',
                origin: 'Dadar',
                destination: 'Home',
                estimatedCost: 350,
                sequence: 1,
                direction: 'RETURN',
                active: true,
              },
            ],
            isDefault: true,
          }),
        },
      ];
      return Promise.resolve({
        empty: false,
        size: mockDocs.length,
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback),
      });
    }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  };
});

describe('Phase 6 - Travel Profiles, Route Segments, Trip Blocks & Accommodation Engine', () => {
  const normalWeeklySchedule: NormalSchedule = {
    userId: 'user_trip_tester',
    timezone: 'Asia/Kolkata',
    effectiveFrom: '2026-01-01',
    monday: 'WFH',
    tuesday: 'WFO',
    wednesday: 'WFO',
    thursday: 'WFO',
    friday: 'WFH',
    saturday: 'OFF',
    sunday: 'OFF',
    homeCity: 'Mumbai',
    officeCity: 'Pune',
    wfoTargetDaysPerMonth: 12,
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const sampleTravelProfile: TravelProfile = createDefaultTravelProfile(
    'user_trip_tester',
    'Pune Office Commute',
    'Mumbai',
    'Pune'
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Deterministic Travel Cost Calculations', () => {
    const multiModalSegments: RouteSegment[] = [
      {
        id: 'seg_1',
        label: 'Home to Station Cab',
        mode: 'cab',
        origin: 'Home',
        destination: 'Dadar Station',
        estimatedCost: 350,
        sequence: 1,
        direction: 'OUTBOUND',
        active: true,
      },
      {
        id: 'seg_2',
        label: 'Vande Bharat Express',
        mode: 'train',
        origin: 'Dadar Station',
        destination: 'Pune Station',
        estimatedCost: 850,
        sequence: 2,
        direction: 'OUTBOUND',
        active: true,
      },
      {
        id: 'seg_3',
        label: 'Station to Office Auto',
        mode: 'auto',
        origin: 'Pune Station',
        destination: 'Office Hub',
        estimatedCost: 200,
        sequence: 3,
        direction: 'OUTBOUND',
        active: true,
      },
      {
        id: 'seg_4',
        label: 'Inactive Segment',
        mode: 'flight',
        origin: 'BOM',
        destination: 'PNQ',
        estimatedCost: 4500,
        sequence: 4,
        direction: 'OUTBOUND',
        active: false, // Inactive, must not be counted
      },
      {
        id: 'seg_ret_1',
        label: 'Office to Station Auto',
        mode: 'auto',
        origin: 'Office Hub',
        destination: 'Pune Station',
        estimatedCost: 200,
        sequence: 1,
        direction: 'RETURN',
        active: true,
      },
      {
        id: 'seg_ret_2',
        label: 'Return Train',
        mode: 'train',
        origin: 'Pune Station',
        destination: 'Dadar Station',
        estimatedCost: 850,
        sequence: 2,
        direction: 'RETURN',
        active: true,
      },
      {
        id: 'seg_ret_3',
        label: 'Dadar to Home Cab',
        mode: 'cab',
        origin: 'Dadar Station',
        destination: 'Home',
        estimatedCost: 350,
        sequence: 3,
        direction: 'RETURN',
        active: true,
      },
      {
        id: 'seg_loc_1',
        label: 'Daily Metro Commute',
        mode: 'metro',
        origin: 'Hotel',
        destination: 'Office Hub',
        estimatedCost: 80,
        sequence: 1,
        direction: 'LOCAL',
        active: true,
      },
    ];

    it('calculates outbound cost correctly ignoring inactive segments', () => {
      const outboundCost = calculateOutboundCost(multiModalSegments);
      // 350 + 850 + 200 = 1400 (ignoring inactive 4500)
      expect(outboundCost).toBe(1400);
    });

    it('calculates return cost correctly', () => {
      const returnCost = calculateReturnCost(multiModalSegments);
      // 200 + 850 + 350 = 1400
      expect(returnCost).toBe(1400);
    });

    it('calculates local daily travel cost scaled across work days', () => {
      const singleDayLocal = calculateLocalTravelCost(multiModalSegments, 1);
      expect(singleDayLocal).toBe(80);

      const threeDaysLocal = calculateLocalTravelCost(multiModalSegments, 3);
      expect(threeDaysLocal).toBe(240);
    });

    it('calculates total trip travel cost combining outbound, return, and local segments', () => {
      const totalCost = calculateTripTravelCost(multiModalSegments, 2);
      // 1400 (out) + 1400 (ret) + (80 * 2) (local) = 2960
      expect(totalCost).toBe(2960);
    });

    it('handles outbound-only travel scenarios', () => {
      const outboundOnly = multiModalSegments.filter((s) => s.direction === 'OUTBOUND');
      expect(calculateOutboundCost(outboundOnly)).toBe(1400);
      expect(calculateReturnCost(outboundOnly)).toBe(0);
      expect(calculateTripTravelCost(outboundOnly, 0)).toBe(1400);
    });

    it('handles return-only travel scenarios', () => {
      const returnOnly = multiModalSegments.filter((s) => s.direction === 'RETURN');
      expect(calculateOutboundCost(returnOnly)).toBe(0);
      expect(calculateReturnCost(returnOnly)).toBe(1400);
      expect(calculateTripTravelCost(returnOnly, 0)).toBe(1400);
    });
  });

  describe('2. Deterministic Overnight & Accommodation Logic', () => {
    it('determines 0 nights for single-day trip (same-day return)', () => {
      const stay = determineOvernightStay('2026-10-13', '2026-10-13');
      expect(stay.required).toBe(false);
      expect(stay.nights).toBe(0);
      expect(stay.checkIn).toBe('2026-10-13');
      expect(stay.checkOut).toBe('2026-10-13');

      const accommodation = buildTripAccommodation({
        startDate: '2026-10-13',
        endDate: '2026-10-13',
        location: 'Pune',
      });
      expect(accommodation).toBeUndefined();
    });

    it('determines 1 night for two-day contiguous trip', () => {
      const stay = determineOvernightStay('2026-10-13', '2026-10-14');
      expect(stay.required).toBe(true);
      expect(stay.nights).toBe(1);
      expect(stay.checkIn).toBe('2026-10-13');
      expect(stay.checkOut).toBe('2026-10-14');

      const accommodation = buildTripAccommodation({
        startDate: '2026-10-13',
        endDate: '2026-10-14',
        location: 'Pune',
        preferredType: 'hotel',
        nightlyRate: 3500,
      });

      expect(accommodation).toBeDefined();
      expect(accommodation?.nights).toBe(1);
      expect(accommodation?.nightlyCost).toBe(3500);
      expect(accommodation?.totalCost).toBe(3500);
      expect(accommodation?.type).toBe('hotel');
    });

    it('determines multi-night stays (2 nights for 3-day sprint)', () => {
      const stay = determineOvernightStay('2026-10-13', '2026-10-15');
      expect(stay.required).toBe(true);
      expect(stay.nights).toBe(2);

      const accommodation = buildTripAccommodation({
        startDate: '2026-10-13',
        endDate: '2026-10-15',
        location: 'Pune',
        preferredType: 'PG',
        nightlyRate: 1200,
      });

      expect(accommodation?.nights).toBe(2);
      expect(accommodation?.totalCost).toBe(2400);
      expect(accommodation?.type).toBe('PG');
    });

    it('calculates zero cost for stay at friends place or own accommodation', () => {
      const stay = buildTripAccommodation({
        startDate: '2026-10-13',
        endDate: '2026-10-15',
        location: 'Pune',
        preferredType: "friend's place",
        nightlyRate: 4000,
      });

      expect(stay?.nights).toBe(2);
      expect(stay?.nightlyCost).toBe(0);
      expect(stay?.totalCost).toBe(0);
      expect(stay?.type).toBe("friend's place");
    });
  });

  describe('3. Schedule to Trip Generation (generateTripPlan)', () => {
    it('generates a single 3-day trip block for standard Tue-Wed-Thu in-office schedule', () => {
      // 2026-10-12 (Mon) is WFH
      // 2026-10-13 (Tue), 2026-10-14 (Wed), 2026-10-15 (Thu) are WFO
      // 2026-10-16 (Fri) is WFH
      const trips = generateTripPlan({
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        userId: 'user_trip_tester',
        travelProfile: sampleTravelProfile,
        normalSchedule: normalWeeklySchedule,
        preferredAccommodationType: 'hotel',
        nightlyRateEstimate: 3000,
      });

      expect(trips.length).toBe(1);
      const trip = trips[0];

      expect(trip.startDate).toBe('2026-10-13');
      expect(trip.endDate).toBe('2026-10-15');
      expect(trip.workDays).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);
      expect(trip.origin).toBe('Mumbai');
      expect(trip.destination).toBe('Pune');
      expect(trip.nightsCount).toBe(2);
      expect(trip.accommodation).toBeDefined();
      expect(trip.accommodation?.nights).toBe(2);
      expect(trip.accommodation?.totalCost).toBe(6000); // 2 * 3000

      // Outbound (1400) + Return (1400) + Local (100 * 3 = 300) = 3100 travel cost
      // Total planned = 3100 + 6000 = 9100
      expect(trip.plannedTravelCost).toBe(3100);
      expect(trip.plannedStayCost).toBe(6000);
      expect(trip.plannedCost).toBe(9100);
      expect(trip.status).toBe('PLANNED');
    });

    it('generates a single 1-day trip (0 nights) for single isolated WFO day', () => {
      // Create a schedule with only Tuesday as WFO
      const singleDayWfoSchedule: NormalSchedule = {
        ...normalWeeklySchedule,
        wednesday: 'WFH',
        thursday: 'WFH',
      };

      const trips = generateTripPlan({
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        userId: 'user_trip_tester',
        travelProfile: sampleTravelProfile,
        normalSchedule: singleDayWfoSchedule,
      });

      expect(trips.length).toBe(1);
      const trip = trips[0];
      expect(trip.startDate).toBe('2026-10-13');
      expect(trip.endDate).toBe('2026-10-13');
      expect(trip.workDays).toEqual(['2026-10-13']);
      expect(trip.nightsCount).toBe(0);
      expect(trip.accommodation).toBeUndefined();
      expect(trip.plannedStayCost).toBe(0);
      expect(trip.plannedCost).toBe(2800); // 1400 out + 1400 ret
    });

    it('handles holiday interruption: split into separate discrete trip blocks when Wednesday is a Holiday', () => {
      // Tuesday (WFO), Wednesday (Holiday), Thursday (WFO)
      const holidayException: ScheduleException = {
        id: 'ex_hol_wed',
        userId: 'user_trip_tester',
        date: '2026-10-14',
        type: 'HOLIDAY',
        resolvedMode: 'HOLIDAY',
        holidayName: 'State Day',
        createdAt: '2026-01-01',
      };

      const trips = generateTripPlan({
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        userId: 'user_trip_tester',
        travelProfile: sampleTravelProfile,
        normalSchedule: normalWeeklySchedule,
        exceptions: [holidayException],
      });

      // Because Wednesday is a non-working holiday, the user has 2 separate 1-day office blocks:
      // Trip 1: Tuesday 2026-10-13
      // Trip 2: Thursday 2026-10-15
      expect(trips.length).toBe(2);

      expect(trips[0].startDate).toBe('2026-10-13');
      expect(trips[0].endDate).toBe('2026-10-13');
      expect(trips[0].nightsCount).toBe(0);

      expect(trips[1].startDate).toBe('2026-10-15');
      expect(trips[1].endDate).toBe('2026-10-15');
      expect(trips[1].nightsCount).toBe(0);
    });

    it('handles 2-day contiguous block: Monday WFO override + Tuesday WFO', () => {
      const wfoOverride: ScheduleException = {
        id: 'ex_ovr_mon',
        userId: 'user_trip_tester',
        date: '2026-10-12', // Monday normally WFH
        type: 'EXPLICIT_WFO_OVERRIDE',
        resolvedMode: 'WFO',
        reason: 'Customer Kickoff',
        createdAt: '2026-01-01',
      };

      const customSchedule: NormalSchedule = {
        ...normalWeeklySchedule,
        wednesday: 'WFH',
        thursday: 'WFH',
      };

      const trips = generateTripPlan({
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        userId: 'user_trip_tester',
        travelProfile: sampleTravelProfile,
        normalSchedule: customSchedule,
        exceptions: [wfoOverride],
        nightlyRateEstimate: 4000,
      });

      expect(trips.length).toBe(1);
      const trip = trips[0];
      expect(trip.startDate).toBe('2026-10-12');
      expect(trip.endDate).toBe('2026-10-13');
      expect(trip.workDays).toEqual(['2026-10-12', '2026-10-13']);
      expect(trip.nightsCount).toBe(1);
      expect(trip.plannedStayCost).toBe(4000);
    });
  });

  describe('4. Firestore Repositories for Travel Profiles & Trips', () => {
    it('fetches travel profiles for user', async () => {
      const profiles = await getTravelProfiles('user_trip_tester');
      expect(profiles.length).toBe(1);
      expect(profiles[0].id).toBe('tp-101');
      expect(profiles[0].homeLocation).toBe('Mumbai');
      expect(profiles[0].officeLocation).toBe('Pune');
    });

    it('saves a travel profile with multi-modal segments', async () => {
      const saved = await saveTravelProfile('user_trip_tester', {
        name: 'Bengaluru Flight Corridor',
        homeLocation: 'Bengaluru',
        officeLocation: 'Mumbai HQ',
        outboundSegments: [],
        returnSegments: [],
      });

      expect(saved.userId).toBe('user_trip_tester');
      expect(saved.name).toBe('Bengaluru Flight Corridor');
      expect(saved.id).toBeDefined();
    });

    it('deletes a travel profile by ID', async () => {
      await expect(deleteTravelProfile('user_trip_tester', 'tp-101')).resolves.toBe(true);
    });

    it('saves and batch saves trips in Firestore', async () => {
      const newTrip = await saveTrip('user_trip_tester', {
        title: 'Q4 Product Offsite',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        origin: 'Mumbai',
        destination: 'Pune',
        officeLocation: 'Pune HQ',
        purpose: 'Sprint Planning',
        workDays: ['2026-11-10', '2026-11-11', '2026-11-12'],
        travelSegments: [],
        nightsCount: 2,
        plannedTravelCost: 2800,
        plannedStayCost: 6000,
        plannedCost: 8800,
        status: 'PLANNED',
        aiOptimizationScore: 94,
      });

      expect(newTrip.id).toBeDefined();
      expect(newTrip.plannedCost).toBe(8800);

      const batchResult = await batchSaveTrips('user_trip_tester', [newTrip]);
      expect(batchResult.length).toBe(1);
      expect(batchResult[0].title).toBe('Q4 Product Offsite');
    });

    it('deletes a trip by ID', async () => {
      await expect(deleteTrip('user_trip_tester', 'trip_101')).resolves.toBe(true);
    });
  });
});
