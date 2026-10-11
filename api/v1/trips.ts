import { createApiHandler } from '@/server/utils/handler';
import { listUserTrips, createUserTrip, modifyUserTrip } from '@/server/services/tripExpenseService';
import { CreateTripSchema, UpdateTripSchema } from '@/server/schemas';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user, req, query, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      const status = typeof query.status === 'string' ? query.status : undefined;
      const startDate = typeof query.startDate === 'string' ? query.startDate : undefined;
      return listUserTrips(user.uid, { status, startDate });
    }

    if (method === 'POST') {
      const parsed = CreateTripSchema.parse(body);
      return createUserTrip(user.uid, parsed);
    }

    if (method === 'PATCH' || method === 'PUT') {
      const tripId = (query.id || body.id) as string;
      if (!tripId) throw new Error('Trip ID is required for updates');
      const parsed = UpdateTripSchema.parse(body);
      return modifyUserTrip(user.uid, tripId, parsed);
    }

    throw new Error('Unsupported method');
  }
);
