import pino from 'pino';

// Masking configuration for sensitive parameters
const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'apiKey',
  'api_key',
  'secret',
  'privateKey',
  'private_key',
  'credentials',
  'connectionString',
  'uri',
];

export const baseLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: SENSITIVE_KEYS.flatMap((key) => [
      key,
      `*.${key}`,
      `*.*.${key}`,
      `headers.authorization`,
      `headers.cookie`,
    ]),
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface LogContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export function createScopedLogger(context: LogContext) {
  return baseLogger.child(context);
}
