import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase Client Configuration
 * Safe for client-side usage — only contains public identifiers.
 * No server secrets, service accounts or Admin credentials are exposed.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Checks whether valid non-dummy Firebase project configuration keys are set in environment.
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
};

// Initialize or reuse existing Firebase app
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth instance
export const auth: Auth = getAuth(app);

// Firestore instance
export const db: Firestore = getFirestore(app);

// Configured Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Optional Free Tier Add-ons (Analytics, Performance, Messaging)
 * Initialized only in browser environment and when supported.
 */
export async function initAnalytics() {
  if (typeof window === 'undefined') return null;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  } catch {
    // Graceful fallback if ad-blocker or offline
  }
  return null;
}

export async function initPerformance() {
  if (typeof window === 'undefined') return null;
  try {
    const { getPerformance } = await import('firebase/performance');
    return getPerformance(app);
  } catch {
    // Graceful fallback
  }
  return null;
}

export async function initMessaging() {
  if (typeof window === 'undefined') return null;
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

