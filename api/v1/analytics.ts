import { createApiHandler } from '@/server/utils/handler';
import { getUserAnalytics } from '@/server/services/auxiliaryServices';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET'],
    rateLimit: RATE_LIMIT_PRESETS.ANALYTICS,
  },
  async ({ user }) => {
    return getUserAnalytics(user.uid);
  }
);
