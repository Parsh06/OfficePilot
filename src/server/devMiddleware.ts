import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';

/**
 * Vite Dev Server API Plugin.
 * Intercepts `/api/*` in local development and routes directly to the serverless
 * handlers in `api/`, ensuring full API, AI, and database parity in `npm run dev`.
 */
export function viteDevApiPlugin(): Plugin {
  return {
    name: 'vite-dev-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const pathname = urlObj.pathname; // e.g. /api/v1/ai/chat

          // Determine target file in api directory
          const relativeSubpath = pathname.replace(/^\/api\//, '');
          const projectRoot = server.config.root || process.cwd();
          
          let targetFile = path.resolve(projectRoot, 'api', `${relativeSubpath}.ts`);
          if (!fs.existsSync(targetFile)) {
            const indexFile = path.resolve(projectRoot, 'api', relativeSubpath, 'index.ts');
            if (fs.existsSync(indexFile)) {
              targetFile = indexFile;
            } else {
              // Try without directory nesting if flat
              return next();
            }
          }

          // Buffer request body for POST/PUT/PATCH
          let rawBody = '';
          if (req.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())) {
            for await (const chunk of req) {
              rawBody += chunk;
            }
          }

          let parsedBody: any = undefined;
          if (rawBody.trim()) {
            try {
              parsedBody = JSON.parse(rawBody);
            } catch {
              parsedBody = rawBody;
            }
          }

          // Polyfill query parameters
          const query: Record<string, string> = {};
          urlObj.searchParams.forEach((val, key) => {
            query[key] = val;
          });

          // Polyfill Vercel/Express helper methods on req and res
          const vReq = req as any;
          vReq.query = query;
          vReq.body = parsedBody;

          const vRes = res as any;
          if (typeof vRes.status !== 'function') {
            vRes.status = function (statusCode: number) {
              res.statusCode = statusCode;
              return vRes;
            };
          }

          if (typeof vRes.json !== 'function') {
            vRes.json = function (data: any) {
              if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
              }
              res.end(JSON.stringify(data));
              return vRes;
            };
          }

          if (typeof vRes.send !== 'function') {
            vRes.send = function (data: any) {
              if (typeof data === 'object') {
                if (!res.headersSent) {
                  res.setHeader('Content-Type', 'application/json');
                }
                res.end(JSON.stringify(data));
              } else {
                res.end(String(data ?? ''));
              }
              return vRes;
            };
          }

          // Load handler module dynamically via Vite SSR module loader
          const mod = await server.ssrLoadModule(targetFile);
          const handler = mod?.default || mod?.handler;

          if (typeof handler === 'function') {
            await handler(vReq, vRes);
            return;
          }

          next();
        } catch (err: any) {
          console.error('[viteDevApiPlugin] Error handling API request:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: {
                  code: 'DEV_SERVER_ERROR',
                  message: err?.message || 'Error executing dev API endpoint',
                },
              })
            );
          }
        }
      });
    },
  };
}
