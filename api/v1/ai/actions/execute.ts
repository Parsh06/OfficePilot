import { createApiHandler } from '@/server/utils/handler';
import { runAIChatOrchestrator } from '@/lib/ai/orchestrator';
import { z } from 'zod';

const ExecuteActionSchema = z.object({
  actionId: z.string().min(1, 'actionId is required'),
});

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['POST'],
  },
  async ({ user, body }) => {
    const { actionId } = ExecuteActionSchema.parse(body);
    const result = await runAIChatOrchestrator(user.uid, {
      message: 'Applying confirmed action',
      confirmedActionId: actionId,
    });
    return result;
  }
);
