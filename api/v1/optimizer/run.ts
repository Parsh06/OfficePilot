import { createApiHandler } from '@/server/utils/handler';
import { runScheduleOptimizer } from '@/server/services/optimizerService';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['POST', 'GET'],
  },
  async ({ user, body, query }) => {
    const mode = (body?.mode || query?.mode || 'BALANCED') as any;
    const startDate = (body?.startDate || query?.startDate) as string | undefined;
    const endDate = (body?.endDate || query?.endDate) as string | undefined;
    const constraints = body?.constraints;

    return runScheduleOptimizer(user.uid, {
      mode,
      startDate,
      endDate,
      constraints,
    });
  }
);
