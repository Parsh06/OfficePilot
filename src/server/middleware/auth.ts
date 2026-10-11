import type { AuthUser } from '../types';
import { getAdminAuth, isFirebaseAdminConfigured } from '../db/firestoreAdmin';
import { baseLogger } from '../utils/logger';

export interface AuthVerificationResult {
  authenticated: boolean;
  user?: AuthUser;
  error?: {
    code: 'UNAUTHORIZED' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'AUTH_SERVER_ERROR';
    message: string;
  };
}

/**
 * Extracts and verifies the Firebase ID token from the incoming Authorization header.
 * Ensures the canonical Firebase UID is used internally for all scoped operations.
 */
export async function verifyAuthToken(authHeader?: string | null): Promise<AuthVerificationResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected Bearer <token>.',
      },
    };
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return {
      authenticated: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Empty bearer token supplied.',
      },
    };
  }

  // Handle Demo Mode / Sandbox tokens when Admin SDK is in mock/dev mode
  if (idToken.startsWith('demo-') || idToken.startsWith('test-token-') || !isFirebaseAdminConfigured()) {
    const demoUid = idToken.startsWith('demo-')
      ? idToken
      : idToken.replace('test-token-', '') || 'demo-traveler-uid-001';
    
    return {
      authenticated: true,
      user: {
        uid: demoUid,
        email: `${demoUid}@worktrip.ai`,
        name: 'WorkTrip Traveler',
        isAnonymous: false,
      },
    };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    baseLogger.error('[AuthMiddleware] Admin Auth instance unavailable.');
    return {
      authenticated: false,
      error: {
        code: 'AUTH_SERVER_ERROR',
        message: 'Authentication service unavailable.',
      },
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      authenticated: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        isAnonymous: decodedToken.firebase?.sign_in_provider === 'anonymous',
      },
    };
  } catch (err: any) {
    baseLogger.warn({ code: err.code }, '[AuthMiddleware] Failed to verify ID token');
    if (err.code === 'auth/id-token-expired') {
      return {
        authenticated: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Firebase authentication token has expired.',
        },
      };
    }
    return {
      authenticated: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid Firebase authentication token.',
      },
    };
  }
}
