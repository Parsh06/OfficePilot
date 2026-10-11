import { createApiHandler } from '@/server/utils/handler';
import { getDashboardSummary } from '@/server/services/dashboardService';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user, query }) => {
    const referenceDate = typeof query.date === 'string' ? query.date : undefined;
    return getDashboardSummary(user.uid, referenceDate);
  }
);
