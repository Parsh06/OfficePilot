import { createApiHandler } from '@/server/utils/handler';
import { getUserSchedule, updateUserSchedule } from '@/server/services/scheduleService';
import { UpdateScheduleSchema } from '@/server/schemas';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'PUT', 'PATCH'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
    bodySchema: UpdateScheduleSchema.optional() as any,
  },
  async ({ user, req, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      return getUserSchedule(user.uid);
    }

    if (method === 'PUT' || method === 'PATCH') {
      await updateUserSchedule(user.uid, body);
      return getUserSchedule(user.uid);
    }

    throw new Error('Unsupported method');
  }
);
