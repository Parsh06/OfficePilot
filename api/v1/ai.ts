import { createApiHandler } from '@/server/utils/handler';
import { getAIConversationHistory } from '@/server/services/auxiliaryServices';
import { runAIChatOrchestrator } from '@/lib/ai/orchestrator';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'POST'],
    rateLimit: RATE_LIMIT_PRESETS.AI,
  },
  async ({ user, req, query, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      const conversationId = (query.conversationId as string) || 'default';
      return getAIConversationHistory(user.uid, conversationId);
    }

    if (method === 'POST') {
      const message = typeof body?.content === 'string' ? body.content : (body?.message || '');
      const mode = body?.mode || 'ASK';
      return runAIChatOrchestrator(user.uid, {
        message,
        mode,
        history: body?.history,
      });
    }

    throw new Error('Unsupported method');
  }
);
