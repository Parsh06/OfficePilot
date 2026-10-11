import { createApiHandler } from '@/server/utils/handler';
import { getHealthStatus } from '@/server/services/healthService';

export default createApiHandler(
  {
    requireAuth: false,
    methods: ['GET'],
  },
  async () => {
    return getHealthStatus();
  }
);
