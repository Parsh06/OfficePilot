import { createApiHandler } from '@/server/utils/handler';
import { undoAIAction } from '@/lib/ai/actions/undoEngine';
import { z } from 'zod';

const UndoActionSchema = z.object({
  actionId: z.string().optional(),
});

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['POST'],
  },
  async ({ user, body }) => {
    const { actionId } = UndoActionSchema.parse(body || {});
    const result = await undoAIAction(user.uid, actionId);
    return result;
  }
);
