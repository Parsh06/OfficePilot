import * as admin from 'firebase-admin';
import { baseLogger } from '../utils/logger';

let adminApp: admin.app.App | null = null;

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Initializes or reuses the Firebase Admin SDK instance.
 */
export function getFirebaseAdminApp(): admin.app.App | null {
  if (adminApp) return adminApp;

  if (admin.apps.length > 0 && admin.apps[0]) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  if (!isFirebaseAdminConfigured()) {
    baseLogger.info('[FirebaseAdmin] No service account credentials detected in environment. Admin SDK running in offline/mock mode.');
    return null;
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    baseLogger.info('[FirebaseAdmin] Initialized Firebase Admin SDK successfully.');
    return adminApp;
  } catch (err) {
    baseLogger.error({ err }, '[FirebaseAdmin] Failed to initialize Firebase Admin SDK.');
    return null;
  }
}

export function getAdminAuth(): admin.auth.Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return admin.auth(app);
}

export function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return admin.firestore(app);
}

/**
 * Firestore Admin Connectivity Status for Health Check.
 */
export async function checkFirestoreAdminHealth(): Promise<{ status: 'CONNECTED' | 'UNCONFIGURED' | 'DISCONNECTED' }> {
  if (!isFirebaseAdminConfigured()) {
    return { status: 'UNCONFIGURED' };
  }
  try {
    const db = getAdminFirestore();
    if (!db) return { status: 'DISCONNECTED' };
    await db.listCollections();
    return { status: 'CONNECTED' };
  } catch (err) {
    baseLogger.warn({ err }, '[FirestoreAdmin:HealthCheck] Health check failed.');
    return { status: 'DISCONNECTED' };
  }
}
