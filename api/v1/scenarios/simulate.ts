import { createApiHandler } from '@/server/utils/handler';
import { simulateScenario } from '@/server/services/optimizerService';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['POST'],
  },
  async ({ user, body }) => {
    return simulateScenario(user.uid, body);
  }
);
