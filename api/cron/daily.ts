import { createApiHandler } from '@/server/utils/handler';
import { runDailyScheduler } from '@/server/services/cronDispatcherService';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: false, // Protected via CRON_SECRET header
    methods: ['GET', 'POST'],
    rateLimit: RATE_LIMIT_PRESETS.CRON,
  },
  async ({ req, query }) => {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      const secretHeader = req.headers['x-cron-secret'];
      const querySecret = query?.secret;

      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        secretHeader === cronSecret ||
        querySecret === cronSecret;

      if (!isAuthorized) {
        const error: any = new Error('Unauthorized: Invalid or missing CRON_SECRET');
        error.statusCode = 401;
        error.code = 'UNAUTHORIZED';
        throw error;
      }
    }

    const force = query?.force === 'true';
    return runDailyScheduler({ force });
  }
);
