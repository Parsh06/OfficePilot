import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import { 
  getUserProfile, 
  syncUserProfileFromAuth, 
  updateUserProfile, 
  completeOnboarding 
} from '@/lib/firebase/services/userService';
import { 
  getUserPreferences, 
  updateUserPreferences, 
  getDefaultPreferences 
} from '@/lib/firebase/services/preferencesService';
import { 
  getWorkSchedule, 
  saveWorkSchedule 
} from '@/lib/firebase/services/workScheduleService';
import { 
  getTravelProfile, 
  saveTravelProfile,
  getAccommodationProfile,
  saveAccommodationProfile
} from '@/lib/firebase/services/travelProfileService';
import { 
  getNotificationPreferences, 
  saveNotificationPreferences 
} from '@/lib/firebase/services/notificationPrefService';

// Mock Firestore SDK
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(() => 'mock-col-ref'),
  getDocs: vi.fn().mockResolvedValue({
    empty: true,
    size: 0,
    docs: [],
    forEach: vi.fn(),
  }),
  doc: vi.fn((_db, ...pathSegments) => ({
    path: pathSegments.join('/'),
    id: pathSegments[pathSegments.length - 1],
  })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('Firestore Repositories & Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('userService', () => {
    it('returns null when user document does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      } as any);

      const profile = await getUserProfile('non-existent-uid');
      expect(profile).toBeNull();
    });

    it('returns user profile when document exists', async () => {
      const mockData = {
        uid: 'user-789',
        displayName: 'John Doe',
        email: 'john@example.com',
        homeCity: 'Austin, TX',
        officeCity: 'New York, NY',
        onboardingCompleted: true,
      };

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData,
      } as any);

      const profile = await getUserProfile('user-789');
      expect(profile).toEqual(mockData);
    });

    it('syncUserProfileFromAuth creates new profile if doc does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const fakeAuthUser: any = {
        uid: 'auth-uid-01',
        displayName: 'New Traveler',
        email: 'new@traveler.com',
        photoURL: 'https://example.com/pic.png',
      };

      const result = await syncUserProfileFromAuth(fakeAuthUser);
      expect(result.uid).toBe('auth-uid-01');
      expect(result.displayName).toBe('New Traveler');
      expect(result.onboardingCompleted).toBe(false);
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });

    it('updateUserProfile writes with merge and timestamp', async () => {
      await updateUserProfile('user-789', { homeCity: 'Seattle, WA' });
      expect(firestoreModule.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ homeCity: 'Seattle, WA' }),
        { merge: true }
      );
    });

    it('completeOnboarding sets onboardingCompleted to true', async () => {
      await completeOnboarding('user-789', { homeCity: 'Chicago, IL' });
      expect(firestoreModule.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          homeCity: 'Chicago, IL',
          onboardingCompleted: true,
        }),
        { merge: true }
      );
    });
  });

  describe('preferencesService', () => {
    it('returns default preferences if document does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const prefs = await getUserPreferences('user-pref-1');
      expect(prefs.optimizationMode).toBe('BALANCED');
      expect(prefs.aiEnabled).toBe(true);
    });

    it('updateUserPreferences merges data properly', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => getDefaultPreferences(),
      } as any);

      const updated = await updateUserPreferences('user-pref-1', {
        optimizationMode: 'COST',
        preferredTravelMode: 'FLIGHT',
      });

      expect(updated.optimizationMode).toBe('COST');
      expect(updated.preferredTravelMode).toBe('FLIGHT');
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });
  });

  describe('workScheduleService', () => {
    it('gets default work schedule when document does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const schedule = await getWorkSchedule('user-sched-1');
      expect(schedule.uid).toBe('user-sched-1');
      expect(schedule.wfoTargetDaysPerMonth).toBe(8);
    });

    it('saves work schedule with UID', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const schedule = await saveWorkSchedule('user-sched-1', {
        homeCity: 'Denver, CO',
        wfoTargetDaysPerMonth: 10,
      });

      expect(schedule.uid).toBe('user-sched-1');
      expect(schedule.homeCity).toBe('Denver, CO');
      expect(schedule.wfoTargetDaysPerMonth).toBe(10);
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });
  });

  describe('travelProfileService', () => {
    it('gets default travel profile when document does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const travel = await getTravelProfile('user-travel-1');
      expect(travel.uid).toBe('user-travel-1');
      expect(travel.seatPreference).toBe('AISLE');
    });

    it('gets default accommodation profile when document does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const acc = await getAccommodationProfile('user-travel-1');
      expect(acc.uid).toBe('user-travel-1');
      expect(acc.preferredTier).toBe('STANDARD');
    });

    it('saves travel and accommodation profiles', async () => {
      vi.mocked(firestoreModule.getDoc)
        .mockResolvedValueOnce({ exists: () => false } as any)
        .mockResolvedValueOnce({ exists: () => false } as any);

      const travel = await saveTravelProfile('user-travel-1', {
        seatPreference: 'WINDOW',
      });
      expect(travel.seatPreference).toBe('WINDOW');

      const acc = await saveAccommodationProfile('user-travel-1', {
        preferredTier: 'PREMIUM',
      });
      expect(acc.preferredTier).toBe('PREMIUM');
    });
  });

  describe('notificationPrefService', () => {
    it('gets default notification preferences when document does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const notifs = await getNotificationPreferences('user-notif-1');
      expect(notifs.uid).toBe('user-notif-1');
      expect(notifs.emailAlerts).toBe(true);
    });

    it('saves notification preferences', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const notifs = await saveNotificationPreferences('user-notif-1', {
        priceDropAlerts: true,
        emailAlerts: false,
      });

      expect(notifs.priceDropAlerts).toBe(true);
      expect(notifs.emailAlerts).toBe(false);
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });
  });
});
