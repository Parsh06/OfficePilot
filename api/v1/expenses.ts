import { createApiHandler } from '@/server/utils/handler';
import {
  listUserExpenses,
  createUserExpense,
  modifyUserExpense,
  removeUserExpense,
} from '@/server/services/tripExpenseService';
import { batchInsertExpenses } from '@/server/repositories/expenseRepository';
import { RATE_LIMIT_PRESETS } from '@/server/middleware/rateLimiter';

export default createApiHandler(
  {
    requireAuth: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    rateLimit: RATE_LIMIT_PRESETS.STANDARD,
  },
  async ({ user, req, query, body }) => {
    const method = req.method?.toUpperCase();

    if (method === 'GET') {
      const category = typeof query.category === 'string' ? query.category : undefined;
      const tripId = typeof query.tripId === 'string' ? query.tripId : undefined;
      const status = typeof query.status === 'string' ? query.status : undefined;
      const from = typeof query.from === 'string' ? query.from : typeof query.startDate === 'string' ? query.startDate : undefined;
      const to = typeof query.to === 'string' ? query.to : typeof query.endDate === 'string' ? query.endDate : undefined;
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 50;

      return listUserExpenses(user.uid, {
        category,
        tripId,
        status,
        from,
        to,
        page,
        limit,
      });
    }

    if (method === 'POST') {
      if (Array.isArray(body)) {
        // Batch insert generated expenses
        return batchInsertExpenses(user.uid, body);
      }
      return createUserExpense(user.uid, body);
    }

    if (method === 'PATCH' || method === 'PUT') {
      const expenseId = (query.id || body.id || body._id) as string;
      if (!expenseId) throw new Error('Expense ID is required for updating');
      return modifyUserExpense(user.uid, expenseId, body);
    }

    if (method === 'DELETE') {
      const expenseId = (query.id || body.id) as string;
      if (!expenseId) throw new Error('Expense ID is required for deletion');
      return removeUserExpense(user.uid, expenseId);
    }

    throw new Error('Unsupported method');
  }
);
