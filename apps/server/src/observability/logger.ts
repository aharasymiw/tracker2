import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';
import type { Env } from '../config/env.js';

/**
 * Pino logger factory.
 *
 * - In production: raw JSON, structured, no transport.
 * - In development: `pino-pretty` transport for human-friendly output.
 *
 * NEVER log decrypted vault contents, raw key material, plaintext passwords,
 * session secrets, or PRNG seeds. `game-rng` seeds in particular must stay
 * sealed inside the combat session row.
 */
export function createLogger(env: Env): PinoLogger {
  const base: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: {
      service: 'lod-server',
      env: env.NODE_ENV,
    },
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'password',
        'passwordHash',
        'sessionToken',
        'sessionSecret',
        'pepper',
        'seed',
      ],
      censor: '[REDACTED]',
    },
  };

  if (env.NODE_ENV === 'development') {
    return pino({
      ...base,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(base);
}

export type ServerLogger = PinoLogger;
