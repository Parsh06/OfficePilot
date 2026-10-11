import { createApiHandler } from '@/server/utils/handler';
import { getUserScenarios, createScenario } from '@/server/services/auxiliaryServices';
import { CreateScenarioSchema } from '@/server/schemas';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'POST'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user, req, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      return getUserScenarios(user.uid);
    }

    if (method === 'POST') {
      const parsed = CreateScenarioSchema.parse(body);
      return createScenario(user.uid, parsed);
    }

    throw new Error('Unsupported method');
  }
);
