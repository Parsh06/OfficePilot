import { createApiHandler } from '@/server/utils/handler';
import { runAIChatOrchestrator } from '@/lib/ai/orchestrator';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';
import { z } from 'zod';

const AIChatRequestSchema = z.object({
  message: z.string().optional().default(''),
  mode: z.enum(['ASK', 'ANALYZE', 'PLAN']).optional().default('ASK'),
  autonomySetting: z.enum(['SUGGEST_ONLY', 'BALANCED', 'MORE_AUTONOMOUS']).optional(),
  confirmedActionId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  dateRange: z
    .object({
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
});

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['POST'],
    rateLimit: RATE_LIMIT_PRESETS.AI,
  },
  async ({ user, body }) => {
    // Authenticated user.uid is the strict security boundary
    const parsed = AIChatRequestSchema.parse(body);
    const result = await runAIChatOrchestrator(user.uid, parsed);
    return result;
  }
);
