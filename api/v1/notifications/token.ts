import { createApiHandler } from '@/server/utils/handler';
import {
  registerUserFCMToken,
  removeUserFCMToken,
} from '@/server/services/notificationService';
import { z } from 'zod';

const TokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  deviceInfo: z.string().optional(),
});

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['POST', 'DELETE'],
  },
  async ({ user, req, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'POST') {
      const { token, deviceInfo } = TokenSchema.parse(body);
      const saved = await registerUserFCMToken(user.uid, token, deviceInfo);
      return { success: true, token: saved.token };
    }

    if (method === 'DELETE') {
      const { token } = TokenSchema.parse(body);
      const deleted = await removeUserFCMToken(user.uid, token);
      return { success: deleted };
    }

    return { success: false };
  }
);
