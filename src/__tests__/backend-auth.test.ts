import { describe, it, expect } from 'vitest';
import { verifyAuthToken } from '@/server/middleware/auth';
import { createApiHandler } from '@/server/utils/handler';

describe('Backend Authentication & Middleware', () => {
  it('rejects requests with missing authorization header', async () => {
    const result = await verifyAuthToken(undefined);
    expect(result.authenticated).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with non-bearer authorization header', async () => {
    const result = await verifyAuthToken('Basic user:pass');
    expect(result.authenticated).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('extracts canonical UID from valid bearer tokens', async () => {
    const result = await verifyAuthToken('Bearer demo-traveler-user-99');
    expect(result.authenticated).toBe(true);
    expect(result.user?.uid).toBe('demo-traveler-user-99');
  });

  it('blocks unauthenticated requests on protected serverless handlers', async () => {
    const handler = createApiHandler(
      { requireAuth: true },
      async () => ({ message: 'secret data' })
    );

    let statusCode = 200;
    let jsonResult: any = null;

    const mockReq: any = {
      method: 'GET',
      url: '/api/v1/profile',
      headers: {},
    };

    const mockRes: any = {
      setHeader: () => mockRes,
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        jsonResult = data;
      },
      send: () => {},
    };

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(401);
    expect(jsonResult.success).toBe(false);
    expect(jsonResult.error.code).toBe('UNAUTHORIZED');
  });

  it('allows unauthenticated requests on public endpoints like health check', async () => {
    const handler = createApiHandler(
      { requireAuth: false, methods: ['GET'] },
      async () => ({ status: 'UP' })
    );

    let statusCode = 200;
    let jsonResult: any = null;

    const mockReq: any = {
      method: 'GET',
      url: '/api/v1/health',
      headers: {},
    };

    const mockRes: any = {
      setHeader: () => mockRes,
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        jsonResult = data;
      },
      send: () => {},
    };

    await handler(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonResult.success).toBe(true);
    expect(jsonResult.data.status).toBe('UP');
  });
});
