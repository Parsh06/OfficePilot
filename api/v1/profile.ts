import { createApiHandler } from '@/server/utils/handler';
import {
  getUserProfileData,
  updateUserProfileData,
  updateUserPreferencesData,
  exportFullUserData,
  deleteFullUserAccount,
} from '@/server/services/profileService';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user, req, query, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      if (query.action === 'export') {
        return exportFullUserData(user.uid);
      }
      return getUserProfileData(user.uid);
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (body?.profile) {
        await updateUserProfileData(user.uid, body.profile);
      }
      if (body?.preferences) {
        await updateUserPreferencesData(user.uid, body.preferences);
      }
      return getUserProfileData(user.uid);
    }

    if (method === 'DELETE') {
      return deleteFullUserAccount(user.uid);
    }

    throw new Error('Unsupported method');
  }
);

