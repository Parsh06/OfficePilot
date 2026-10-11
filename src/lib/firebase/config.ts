import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Public client-side Firebase configuration interface.
 * Safe for client-side bundles — contains only public identifiers.
 */
export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const rawProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
const rawApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
const rawAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
const rawStorageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
const rawMessagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
const rawAppId = (import.meta.env.VITE_FIREBASE_APP_ID || '').trim();
const rawMeasurementId = (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim();

/**
 * Firebase Client Configuration.
 * Automatically derives standard authDomain and storageBucket if not explicitly provided.
 */
export const firebaseConfig: FirebaseClientConfig = {
  apiKey: rawApiKey,
  authDomain: rawAuthDomain || (rawProjectId ? `${rawProjectId}.firebaseapp.com` : ''),
  projectId: rawProjectId,
  storageBucket: rawStorageBucket || (rawProjectId ? `${rawProjectId}.firebasestorage.app` : ''),
  messagingSenderId: rawMessagingSenderId,
  appId: rawAppId,
  measurementId: rawMeasurementId,
};

/**
 * Checks whether valid, non-placeholder Firebase credentials are set in environment.
 */
export const isFirebaseConfigured = (): boolean => {
  if (!rawApiKey || !rawProjectId) {
    return false;
  }
  // Exclude dummy templates or placeholders
  const isDummyKey = rawApiKey.includes('your-') || rawApiKey === 'placeholder' || rawApiKey === 'test';
  const isDummyProject = rawProjectId.includes('your-') || rawProjectId === 'placeholder' || rawProjectId === 'test';

  return !isDummyKey && !isDummyProject;
};

/**
 * Diagnostic helper to inspect Firebase configuration status safely.
 */
export const getFirebaseConfigStatus = () => {
  const configured = isFirebaseConfigured();
  const missingKeys: string[] = [];

  if (!rawApiKey) missingKeys.push('VITE_FIREBASE_API_KEY');
  if (!rawProjectId) missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  if (!rawAppId) missingKeys.push('VITE_FIREBASE_APP_ID');

  return {
    isConfigured: configured,
    projectId: rawProjectId || null,
    authDomain: firebaseConfig.authDomain || null,
    hasAnalytics: Boolean(rawMeasurementId),
    missingKeys,
  };
};

/**
 * Initialize or retrieve the active Firebase App instance safely.
 * Provides fallback mock parameters in test/offline environments to prevent app crash on import.
 */
function createFirebaseApp(): FirebaseApp {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }

  const effectiveConfig: FirebaseClientConfig = isFirebaseConfigured()
    ? firebaseConfig
    : {
        apiKey: rawApiKey || 'AIzaSy_demo_fallback_key_officepilot',
        authDomain: firebaseConfig.authDomain || 'officepilot-f8d80.firebaseapp.com',
        projectId: rawProjectId || 'officepilot-f8d80',
        storageBucket: firebaseConfig.storageBucket || 'officepilot-f8d80.firebasestorage.app',
        messagingSenderId: rawMessagingSenderId || '564491729541',
        appId: rawAppId || '1:564491729541:web:a09ffc6b2d94e52e7e47ec',
        measurementId: rawMeasurementId || '',
      };

  try {
    return initializeApp(effectiveConfig);
  } catch (err) {
    console.warn('[Firebase] Warning during app initialization:', err);
    return getApps()[0] || initializeApp(effectiveConfig, 'officepilot-fallback');
  }
}

// Active Firebase App instance
export const app: FirebaseApp = createFirebaseApp();

// Firebase Auth instance
export const auth: Auth = getAuth(app);

// Firestore instance
export const db: Firestore = getFirestore(app);

// Pre-configured Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Optional Google Analytics Initializer
 * Only runs in browser environment when measurementId is configured.
 */
export async function initAnalytics() {
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;
  if (!rawMeasurementId) return null;

  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  } catch {
    // Graceful fallback if offline or blocked by ad-blocker
  }
  return null;
}

/**
 * Optional Firebase Performance Monitoring Initializer
 */
export async function initPerformance() {
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;

  try {
    const { getPerformance } = await import('firebase/performance');
    return getPerformance(app);
  } catch {
    // Graceful fallback
  }
  return null;
}

/**
 * Optional Firebase Cloud Messaging Initializer
 */
export async function initMessaging() {
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;

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
