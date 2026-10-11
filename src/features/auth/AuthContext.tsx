import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase/config';
import { 
  syncUserProfileFromAuth, 
  getUserProfile, 
  updateUserProfile as updateUserProfileService 
} from '@/lib/firebase/services/userService';
import { 
  getUserPreferences, 
  updateUserPreferences as updateUserPreferencesService, 
  getDefaultPreferences 
} from '@/lib/firebase/services/preferencesService';
import type { UserDocument, PreferencesDocument } from '@/types/firestore';
import { toast } from 'sonner';

export interface AuthContextType {
  user: UserDocument | null;
  firebaseUser: FirebaseUser | null;
  preferences: PreferencesDocument | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<UserDocument | undefined>;
  signInWithDemoUser: (completedOnboarding?: boolean) => Promise<UserDocument>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserDocument>) => Promise<void>;
  updatePreferences: (data: Partial<PreferencesDocument>) => Promise<void>;
  clearError: () => void;
}

const DEMO_USER_UID = 'demo-traveler-uid-001';

export const DEMO_USER_PROFILE: UserDocument = {
  uid: DEMO_USER_UID,
  displayName: 'Parsh Jain',
  email: 'parsh@worktrip.ai',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  homeCity: 'San Francisco, CA',
  officeCity: 'Seattle HQ',
  organization: 'Acme Enterprise',
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserDocument | null>(null);
  const [preferences, setPreferences] = useState<PreferencesDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper to load user profile & preferences from Firestore
  const loadUserData = useCallback(async (uid: string, fbUser?: FirebaseUser) => {
    try {
      let profile = await getUserProfile(uid);
      if (!profile && fbUser) {
        profile = await syncUserProfileFromAuth(fbUser);
      }
      const prefs = await getUserPreferences(uid);
      
      setUser(profile);
      setPreferences(prefs);
    } catch (err) {
      console.warn('[AuthContext] Failed to load user profile data:', err);
    }
  }, []);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    // Check if we have a demo session persisted in localStorage
    const savedDemoUser = localStorage.getItem('worktrip_demo_user');
    if (savedDemoUser) {
      try {
        const parsed = JSON.parse(savedDemoUser) as UserDocument;
        setUser(parsed);
        setPreferences(getDefaultPreferences());
        setIsLoading(false);
        return;
      } catch {
        localStorage.removeItem('worktrip_demo_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      setFirebaseUser(currentFirebaseUser);
      if (currentFirebaseUser) {
        try {
          const profile = await syncUserProfileFromAuth(currentFirebaseUser);
          const prefs = await getUserPreferences(currentFirebaseUser.uid);
          setUser(profile);
          setPreferences(prefs);
        } catch (err) {
          console.error('[AuthContext] Error syncing user on auth change:', err);
        }
      } else {
        // If not in demo mode and no firebase user, clear state
        const demoStored = localStorage.getItem('worktrip_demo_user');
        if (!demoStored) {
          setUser(null);
          setPreferences(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserData]);

  // Google OAuth Login
  const signInWithGoogle = async (): Promise<UserDocument | undefined> => {
    setIsLoading(true);
    setError(null);

    // If Firebase isn't configured with real credentials yet, seamlessly provide demo login with prompt
    if (!isFirebaseConfigured()) {
      try {
        return await signInWithDemoUser(true);
      } finally {
        setIsLoading(false);
      }
    }

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const fbUser = userCredential.user;
      setFirebaseUser(fbUser);
      localStorage.removeItem('worktrip_demo_user');

      const profile = await syncUserProfileFromAuth(fbUser);
      const prefs = await getUserPreferences(fbUser.uid);
      setUser(profile);
      setPreferences(prefs);
      toast.success(`Welcome to WorkTrip AI, ${profile.displayName || 'Traveler'}!`);
      return profile;
    } catch (err: any) {
      let friendlyMessage = 'Failed to sign in with Google. Please try again.';

      if (err.code === 'auth/popup-blocked') {
        friendlyMessage = 'Popup was blocked by your browser. Please allow popups or use Demo Sign-in.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        friendlyMessage = 'Sign-in window was closed before completing.';
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error during authentication. Please check your connection.';
      } else if (err.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'Authentication domain not configured in Firebase. Falling back to Demo Mode.';
        // Auto fallback to demo user
        return await signInWithDemoUser(true);
      }

      setError(friendlyMessage);
      toast.error(friendlyMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Demo user sign-in (for rapid preview, testing, or unconfigured local environments)
  const signInWithDemoUser = async (completedOnboarding: boolean = true): Promise<UserDocument> => {
    setIsLoading(true);
    setError(null);
    const demoProfile: UserDocument = {
      ...DEMO_USER_PROFILE,
      onboardingCompleted: completedOnboarding,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('worktrip_demo_user', JSON.stringify(demoProfile));
    setUser(demoProfile);
    setPreferences(getDefaultPreferences());
    setIsLoading(false);
    toast.success('Signed in as Demo Traveler');
    return demoProfile;
  };

  // Sign out
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      localStorage.removeItem('worktrip_demo_user');
      await fbSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setPreferences(null);
      toast.info('Signed out successfully');
    } catch (err) {
      console.warn('[AuthContext] Sign-out warning:', err);
      // Ensure local state is wiped even if remote signout fails
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh profile
  const refreshUserProfile = async (): Promise<void> => {
    if (user?.uid) {
      await loadUserData(user.uid, firebaseUser || undefined);
    }
  };

  // Update profile
  const updateProfile = async (data: Partial<UserDocument>): Promise<void> => {
    if (!user?.uid) return;
    const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
    setUser(updated);

    if (user.uid === DEMO_USER_UID) {
      localStorage.setItem('worktrip_demo_user', JSON.stringify(updated));
    } else {
      await updateUserProfileService(user.uid, data);
    }
  };

  // Update preferences
  const updatePreferences = async (data: Partial<PreferencesDocument>): Promise<void> => {
    if (!user?.uid) return;
    const updated = { ...(preferences || getDefaultPreferences()), ...data, updatedAt: new Date().toISOString() };
    setPreferences(updated);

    if (user.uid !== DEMO_USER_UID) {
      await updateUserPreferencesService(user.uid, data);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    preferences,
    isLoading,
    isAuthenticated: Boolean(user),
    error,
    signInWithGoogle,
    signInWithDemoUser,
    logout,
    refreshUserProfile,
    updateProfile,
    updatePreferences,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
