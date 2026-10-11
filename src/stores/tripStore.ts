import { create } from 'zustand';
import type {
  TripBlock,
  TravelProfile,
  TripStatus,
  RouteSegment,
  AccommodationType,
} from '@/lib/travelEngine';
import {
  generateTripPlan,
  createDefaultTravelProfile,
  calculateTripCostBreakdown,
} from '@/lib/travelEngine';
import {
  getTrips,
  saveTrip as persistTrip,
  deleteTrip as persistDeleteTrip,
  batchSaveTrips,
} from '@/lib/firebase/services/tripService';
import {
  getTravelProfiles,
  saveTravelProfile as persistTravelProfile,
} from '@/lib/firebase/services/travelProfileService';
import type { NormalSchedule, ScheduleException } from '@/lib/scheduleEngine';

interface TripState {
  userId: string;
  trips: TripBlock[];
  travelProfiles: TravelProfile[];
  activeProfile: TravelProfile | null;
  selectedTripId: string | null;
  filterStatus: TripStatus | 'ALL';
  isLoading: boolean;

  // Selection & UI Filters
  setSelectedTripId: (id: string | null) => void;
  setFilterStatus: (status: TripStatus | 'ALL') => void;
  setActiveProfile: (profile: TravelProfile) => void;

  // Data Loading & Sync
  fetchUserTripsAndProfiles: (userId: string) => Promise<void>;

  // Trip Management
  addTrip: (tripData: any) => TripBlock;
  updateTrip: (id: string, updates: Partial<TripBlock>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  optimizeTrip: (id: string) => void;
  getTrip: (id: string) => TripBlock | undefined;

  // Profile Management
  saveTravelProfile: (profile: Partial<TravelProfile>) => Promise<TravelProfile>;
  addSegmentToProfile: (profileId: string, segment: Omit<RouteSegment, 'id'>) => Promise<void>;
  removeSegmentFromProfile: (profileId: string, segmentId: string) => Promise<void>;

  // Schedule to Trip Generation
  generateTripsFromSchedule: (options: {
    startDate: string;
    endDate: string;
    normalSchedule: NormalSchedule;
    exceptions?: ScheduleException[];
    preferredAccommodationType?: AccommodationType;
    nightlyRate?: number;
    autoSave?: boolean;
  }) => Promise<TripBlock[]>;
}

const defaultUserId = 'demo-traveler-uid-001';
const defaultInitialProfile = createDefaultTravelProfile(defaultUserId, 'Pune Office Commute', 'Mumbai', 'Pune');

const initialMockTrips: TripBlock[] = [
  {
    id: 'trip_demo_101',
    userId: defaultUserId,
    title: '3-Day Pune Architecture Sprint',
    startDate: '2026-10-13',
    endDate: '2026-10-15',
    origin: 'Mumbai',
    destination: 'Pune HQ',
    officeLocation: 'Pune HQ',
    purpose: 'Core Platform Engineering Offsite',
    workDays: ['2026-10-13', '2026-10-14', '2026-10-15'],
    nightsCount: 2,
    travelSegments: [
      {
        id: 'seg_1',
        label: 'Mumbai Home to Dadar Station',
        mode: 'cab',
        origin: 'Mumbai Home',
        destination: 'Dadar Station',
        estimatedCost: 350,
        estimatedDurationMinutes: 35,
        sequence: 1,
        direction: 'OUTBOUND',
        active: true,
      },
      {
        id: 'seg_2',
        label: 'Vande Bharat Express to Pune',
        mode: 'train',
        origin: 'Dadar Station',
        destination: 'Pune Junction',
        estimatedCost: 850,
        estimatedDurationMinutes: 180,
        sequence: 2,
        direction: 'OUTBOUND',
        active: true,
        provider: 'Indian Railways (Vande Bharat)',
      },
      {
        id: 'seg_3',
        label: 'Pune Station to Tech Park',
        mode: 'auto',
        origin: 'Pune Junction',
        destination: 'Pune HQ',
        estimatedCost: 200,
        estimatedDurationMinutes: 25,
        sequence: 3,
        direction: 'OUTBOUND',
        active: true,
      },
      {
        id: 'seg_4',
        label: 'Pune HQ to Pune Station',
        mode: 'auto',
        origin: 'Pune HQ',
        destination: 'Pune Junction',
        estimatedCost: 200,
        estimatedDurationMinutes: 25,
        sequence: 1,
        direction: 'RETURN',
        active: true,
      },
      {
        id: 'seg_5',
        label: 'Return Express to Mumbai',
        mode: 'train',
        origin: 'Pune Junction',
        destination: 'Dadar Station',
        estimatedCost: 850,
        estimatedDurationMinutes: 180,
        sequence: 2,
        direction: 'RETURN',
        active: true,
        provider: 'Indian Railways (Vande Bharat)',
      },
      {
        id: 'seg_6',
        label: 'Station to Mumbai Home',
        mode: 'cab',
        origin: 'Dadar Station',
        destination: 'Mumbai Home',
        estimatedCost: 350,
        estimatedDurationMinutes: 35,
        sequence: 3,
        direction: 'RETURN',
        active: true,
      },
    ],
    accommodation: {
      id: 'acc_demo_1',
      type: 'hotel',
      name: 'The Ritz Executive Suites Pune',
      location: 'Pune Hinjawadi Phase 1',
      nightlyCost: 3800,
      checkIn: '2026-10-13',
      checkOut: '2026-10-15',
      nights: 2,
      totalCost: 7600,
      notes: 'Reserved near client office hub',
    },
    plannedTravelCost: 2800,
    plannedStayCost: 7600,
    plannedCost: 10400,
    status: 'CONFIRMED',
    aiOptimizationScore: 94,
    aiSavingsEstimate: 1450,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

export const useTripStore = create<TripState>((set, get) => ({
  userId: defaultUserId,
  trips: initialMockTrips,
  travelProfiles: [defaultInitialProfile],
  activeProfile: defaultInitialProfile,
  selectedTripId: null,
  filterStatus: 'ALL',
  isLoading: false,

  setSelectedTripId: (id) => set({ selectedTripId: id }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setActiveProfile: (profile) => set({ activeProfile: profile }),

  fetchUserTripsAndProfiles: async (userId: string) => {
    if (!userId) return;
    set({ isLoading: true, userId });
    try {
      const [profiles, tripsList] = await Promise.all([
        getTravelProfiles(userId),
        getTrips(userId),
      ]);

      const active = profiles.find((p) => p.isDefault) || profiles[0] || defaultInitialProfile;

      set({
        travelProfiles: profiles.length > 0 ? profiles : [defaultInitialProfile],
        activeProfile: active,
        trips: tripsList.length > 0 ? tripsList : get().trips,
        isLoading: false,
      });
    } catch (err) {
      console.warn('[tripStore] Fetch error:', err);
      set({ isLoading: false });
    }
  },

  addTrip: (tripData: any) => {
    const { userId, trips } = get();
    const costBreakdown = calculateTripCostBreakdown(
      tripData.travelSegments || [],
      tripData.accommodation,
      tripData.workDays?.length || 1
    );

    const fullTrip: TripBlock = {
      ...tripData,
      id: tripData.id || `trip_${Date.now()}`,
      userId,
      destination: tripData.destination || tripData.officeLocation,
      workDays: tripData.workDays || [tripData.startDate],
      nightsCount: tripData.nightsCount ?? (tripData.accommodation?.nights || 0),
      plannedTravelCost: tripData.plannedTravelCost ?? costBreakdown.totalTravelCost,
      plannedStayCost: tripData.plannedStayCost ?? costBreakdown.stayCost,
      plannedCost: tripData.plannedCost ?? costBreakdown.totalPlannedCost,
      status: tripData.status || 'PLANNED',
      aiOptimizationScore: tripData.aiOptimizationScore ?? 92,
      aiSavingsEstimate: tripData.aiSavingsEstimate ?? 350,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ trips: [fullTrip, ...trips.filter((t) => t.id !== fullTrip.id)] });
    persistTrip(userId, fullTrip).catch((err) => console.warn('[tripStore] Persist error:', err));
    return fullTrip as any;
  },

  updateTrip: async (id, updates) => {
    const { userId, trips } = get();
    const existing = trips.find((t) => t.id === id);
    if (!existing) return;

    const merged: TripBlock = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recompute costs if segments or accommodation changed
    if (updates.travelSegments || updates.accommodation || updates.workDays) {
      const breakdown = calculateTripCostBreakdown(
        merged.travelSegments,
        merged.accommodation,
        merged.workDays.length
      );
      merged.plannedTravelCost = breakdown.totalTravelCost;
      merged.plannedStayCost = breakdown.stayCost;
      merged.plannedCost = breakdown.totalPlannedCost;
    }

    await persistTrip(userId, merged);
    set({
      trips: trips.map((t) => (t.id === id ? merged : t)),
    });
  },

  deleteTrip: async (id) => {
    const { userId, trips, selectedTripId } = get();
    await persistDeleteTrip(userId, id);
    set({
      trips: trips.filter((t) => t.id !== id),
      selectedTripId: selectedTripId === id ? null : selectedTripId,
    });
  },

  optimizeTrip: (id) => {
    const { trips } = get();
    const trip = trips.find((t) => t.id === id);
    if (!trip) return;

    const updated: TripBlock = {
      ...trip,
      aiOptimizationScore: Math.min(99, trip.aiOptimizationScore + 6),
      aiSavingsEstimate: (trip.aiSavingsEstimate || 200) + 180,
      notes: `${trip.notes ? trip.notes + ' • ' : ''}AI optimization applied: batched off-peak transit lock.`,
      updatedAt: new Date().toISOString(),
    };

    get().updateTrip(id, updated);
  },

  getTrip: (id) => {
    return get().trips.find((t) => t.id === id);
  },

  saveTravelProfile: async (profileData) => {
    const { userId, travelProfiles } = get();
    const saved = await persistTravelProfile(userId, {
      ...profileData,
      userId,
    });

    const filtered = travelProfiles.filter((p) => p.id !== saved.id);
    set({
      travelProfiles: [...filtered, saved],
      activeProfile: saved.isDefault ? saved : get().activeProfile || saved,
    });
    return saved;
  },

  addSegmentToProfile: async (profileId, segment) => {
    const { travelProfiles } = get();
    const profile = travelProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    const newSeg: RouteSegment = {
      ...segment,
      id: `seg_${Date.now().toString(36)}`,
    };

    const isOut = segment.direction === 'OUTBOUND';
    const updatedProfile: TravelProfile = {
      ...profile,
      outboundSegments: isOut ? [...profile.outboundSegments, newSeg] : profile.outboundSegments,
      returnSegments: !isOut ? [...profile.returnSegments, newSeg] : profile.returnSegments,
      updatedAt: new Date().toISOString(),
    };

    await get().saveTravelProfile(updatedProfile);
  },

  removeSegmentFromProfile: async (profileId, segmentId) => {
    const { travelProfiles } = get();
    const profile = travelProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    const updatedProfile: TravelProfile = {
      ...profile,
      outboundSegments: profile.outboundSegments.filter((s) => s.id !== segmentId),
      returnSegments: profile.returnSegments.filter((s) => s.id !== segmentId),
      updatedAt: new Date().toISOString(),
    };

    await get().saveTravelProfile(updatedProfile);
  },

  generateTripsFromSchedule: async (options) => {
    const { userId, activeProfile, travelProfiles } = get();
    const profile = activeProfile || travelProfiles[0] || createDefaultTravelProfile(userId);

    const generated = generateTripPlan({
      startDate: options.startDate,
      endDate: options.endDate,
      userId,
      travelProfile: profile,
      normalSchedule: options.normalSchedule,
      exceptions: options.exceptions || [],
      preferredAccommodationType: options.preferredAccommodationType || 'hotel',
      nightlyRateEstimate: options.nightlyRate || 3200,
    });

    if (options.autoSave && generated.length > 0) {
      await batchSaveTrips(userId, generated);
      const existing = get().trips.filter((t) => !generated.some((g) => g.id === t.id));
      set({ trips: [...generated, ...existing] });
    }

    return generated;
  },
}));
