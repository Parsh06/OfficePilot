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

  // Wipe any legacy demo session on mount so unauthenticated users land on /login
  useEffect(() => {
    try {
      localStorage.removeItem('worktrip_demo_user');
      localStorage.removeItem('officepilot_demo_user');
    } catch {
      // Ignore
    }
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
    if (!isFirebaseConfigured()) {
      setUser(null);
      setFirebaseUser(null);
      setPreferences(null);
      setIsLoading(false);
      return;
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
        setUser(null);
        setPreferences(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserData]);

  // Google OAuth Login
  const signInWithGoogle = async (): Promise<UserDocument | undefined> => {
    setIsLoading(true);
    setError(null);

    if (!isFirebaseConfigured()) {
      const msg = 'Firebase is not yet configured with valid credentials in .env';
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
      return undefined;
    }

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const fbUser = userCredential.user;
      setFirebaseUser(fbUser);

      const profile = await syncUserProfileFromAuth(fbUser);
      const prefs = await getUserPreferences(fbUser.uid);
      setUser(profile);
      setPreferences(prefs);
      toast.success(`Welcome to Office Pilot, ${profile.displayName || 'Traveler'}!`);
      return profile;
    } catch (err: any) {
      let friendlyMessage = 'Failed to sign in with Google. Please try again.';

      if (err.code === 'auth/popup-blocked') {
        friendlyMessage = 'Popup was blocked by your browser. Please allow popups for this site.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        friendlyMessage = 'Sign-in window was closed before completing.';
      } else if (err.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error during authentication. Please check your connection.';
      } else if (err.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'Authentication domain not authorized in Firebase console.';
      }

      setError(friendlyMessage);
      toast.error(friendlyMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Demo fallback strictly for test suites that mock useAuth
  const signInWithDemoUser = async (completedOnboarding: boolean = true): Promise<UserDocument> => {
    setIsLoading(true);
    setError(null);
    const demoProfile: UserDocument = {
      uid: 'demo-user-test',
      displayName: 'Office Pilot User',
      email: 'user@officepilot.app',
      homeCity: 'Mumbai, Maharashtra',
      officeCity: 'Pune Technology Center',
      organization: 'Enterprise Corp',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      onboardingCompleted: completedOnboarding,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUser(demoProfile);
    setPreferences(getDefaultPreferences());
    setIsLoading(false);
    return demoProfile;
  };

  // Sign out
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      localStorage.removeItem('worktrip_demo_user');
      localStorage.removeItem('officepilot_demo_user');
      await fbSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setPreferences(null);
      toast.info('Signed out successfully');
    } catch (err) {
      console.warn('[AuthContext] Sign-out warning:', err);
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
    try {
      await updateUserProfileService(user.uid, data);
      setUser((prev) => (prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null));
      toast.success('Profile updated');
    } catch (err) {
      console.error('[AuthContext] Update profile error:', err);
      toast.error('Failed to update profile');
      throw err;
    }
  };

  // Update preferences
  const updatePreferences = async (data: Partial<PreferencesDocument>): Promise<void> => {
    if (!user?.uid) return;
    try {
      await updateUserPreferencesService(user.uid, data);
      setPreferences((prev) => (prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null));
      toast.success('Preferences updated');
    } catch (err) {
      console.error('[AuthContext] Update preferences error:', err);
      toast.error('Failed to update preferences');
      throw err;
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
