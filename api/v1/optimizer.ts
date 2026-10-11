import { createApiHandler } from '@/server/utils/handler';
import { runScheduleOptimizer } from '@/server/services/optimizerService';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'POST'],
    rateLimit: RATE_LIMIT_PRESETS.OPTIMIZER,
  },
  async ({ user, body, query }) => {
    const mode = (body?.mode || query?.mode || 'BALANCED') as any;
    const startDate = (body?.startDate || query?.startDate) as string | undefined;
    const endDate = (body?.endDate || query?.endDate) as string | undefined;

    return runScheduleOptimizer(user.uid, {
      mode,
      startDate,
      endDate,
    });
  }
);
