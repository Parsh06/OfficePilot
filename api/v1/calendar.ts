import { createApiHandler } from '@/server/utils/handler';
import { getCalendarRange, setCalendarDayMode } from '@/server/services/scheduleService';
import { UpdateDayScheduleSchema, DateRangeQuerySchema } from '@/server/schemas';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'POST', 'PUT'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
    querySchema: DateRangeQuerySchema as any,
  },
  async ({ user, req, query, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      const today = new Date();
      const firstDay = query.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = query.endDate || new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0];
      return getCalendarRange(user.uid, firstDay, lastDay);
    }

    if (method === 'POST' || method === 'PUT') {
      const parsed = UpdateDayScheduleSchema.parse(body);
      return setCalendarDayMode(user.uid, parsed);
    }

    throw new Error('Unsupported method');
  }
);
