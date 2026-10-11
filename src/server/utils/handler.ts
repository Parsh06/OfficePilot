import type { IncomingMessage, ServerResponse } from 'http';
import { ZodError, type ZodSchema } from 'zod';
import { verifyAuthToken } from '../middleware/auth';
import { checkRateLimit, type RateLimitConfig } from '../middleware/rateLimiter';
import { createScopedLogger } from './logger';
import type { AuthUser, ApiResponse } from '../types';

export interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  body: any;
  cookies?: Record<string, string>;
  url: string;
  method?: string;
}

export interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
}

export interface HandlerOptions<TBody = any, TQuery = any> {
  requireAuth?: boolean;
  rateLimit?: RateLimitConfig;
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  methods?: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>;
}

export interface HandlerContext<TBody = any, TQuery = any> {
  req: VercelRequest;
  res: VercelResponse;
  user: AuthUser;
  body: TBody;
  query: TQuery;
  requestId: string;
}

/**
 * Higher-order serverless wrapper for Vercel API functions.
 * Provides unified authentication, validation, error handling, correlation IDs, and logging.
 */
export function createApiHandler<TResult, TBody = any, TQuery = any>(
  options: HandlerOptions<TBody, TQuery>,
  handler: (ctx: HandlerContext<TBody, TQuery>) => Promise<TResult>
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const startTime = Date.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const method = (req.method || 'GET').toUpperCase() as any;
    const path = req.url || '';

    const logger = createScopedLogger({ requestId, method, path });

    // 1. CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Cron-Secret');
    res.setHeader('X-Request-ID', requestId);

    if (method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // 2. HTTP Method verification
    if (options.methods && !options.methods.includes(method)) {
      res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `HTTP ${method} method not supported on this endpoint.`,
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      } satisfies ApiResponse<never>);
      return;
    }

    // 3. Authentication check
    let authenticatedUser: AuthUser = { uid: 'anonymous' };
    if (options.requireAuth !== false) {
      const authHeader = req.headers.authorization;
      const authResult = await verifyAuthToken(authHeader);

      if (!authResult.authenticated || !authResult.user) {
        logger.warn({ code: authResult.error?.code }, '[Handler] Unauthorized request blocked');
        res.status(401).json({
          success: false,
          error: {
            code: authResult.error?.code || 'UNAUTHORIZED',
            message: authResult.error?.message || 'Authentication required.',
          },
          meta: { requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse<never>);
        return;
      }
      authenticatedUser = authResult.user;
    }

    // 4. Rate Limiting check
    if (options.rateLimit) {
      const clientKey = authenticatedUser.uid !== 'anonymous'
        ? authenticatedUser.uid
        : (req.headers['x-forwarded-for'] as string) || 'client_ip';

      const rateCheck = checkRateLimit(clientKey, options.rateLimit);
      res.setHeader('X-RateLimit-Limit', options.rateLimit.maxRequests);
      res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
      res.setHeader('X-RateLimit-Reset', rateCheck.resetTime);

      if (!rateCheck.allowed) {
        res.setHeader('Retry-After', rateCheck.retryAfterSec);
        logger.warn({ clientKey, retryAfter: rateCheck.retryAfterSec }, '[Handler] Rate limit exceeded');
        res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: `Rate limit exceeded. Try again in ${rateCheck.retryAfterSec} seconds.`,
          },
          meta: { requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse<never>);
        return;
      }
    }

    // 4. Request validation
    let parsedBody: TBody = req.body;
    let parsedQuery: TQuery = req.query as any;

    try {
      if (options.bodySchema && req.body) {
        parsedBody = options.bodySchema.parse(req.body);
      }
      if (options.querySchema && req.query) {
        parsedQuery = options.querySchema.parse(req.query);
      }
    } catch (valErr) {
      if (valErr instanceof ZodError) {
        logger.warn({ issues: valErr.issues }, '[Handler] Validation failed');
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request payload or query parameters.',
            details: valErr.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
          meta: { requestId, timestamp: new Date().toISOString() },
        } satisfies ApiResponse<never>);
        return;
      }
    }

    // 5. Execute Business Logic
    try {
      const result = await handler({
        req,
        res,
        user: authenticatedUser,
        body: parsedBody,
        query: parsedQuery,
        requestId,
      });

      const durationMs = Date.now() - startTime;
      logger.info({ durationMs, userId: authenticatedUser.uid, status: 200 }, '[Handler] Request completed successfully');

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          durationMs,
        },
      } satisfies ApiResponse<TResult>);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const statusCode = err.statusCode || 500;
      const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
      const errorMessage = statusCode >= 500 ? 'An unexpected server error occurred.' : (err.message || 'Error processing request');

      logger.error({ err, statusCode, errorCode, durationMs }, '[Handler] Error processing request');

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      } satisfies ApiResponse<never>);
    }
  };
}
