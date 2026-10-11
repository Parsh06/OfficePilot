import { createApiHandler } from '@/server/utils/handler';
import { getAdminTravelProfile } from '@/server/repositories/firestoreAdminRepository';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user }) => {
    const profile = await getAdminTravelProfile(user.uid);
    return (
      profile || {
        uid: user.uid,
        preferredAirlines: ['Delta', 'United', 'Alaska Airlines'],
        seatPreference: 'AISLE',
        preferredHotelChains: ['Marriott Bonvoy', 'Hyatt'],
        maxFlightDurationHours: 6,
        budgetLimitPerTrip: 1200,
        updatedAt: new Date().toISOString(),
      }
    );
  }
);
