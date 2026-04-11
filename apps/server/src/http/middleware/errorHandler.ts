import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Centralized Fastify error handler. Hides stack traces and internal details
 * in production. Zod validation errors become 400s with a typed `code`.
 *
 * Never surface database errors, secret material, or full stack traces to
 * clients in production.
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (error instanceof ZodError) {
    reply.status(400).send({
      error: {
        code: 'validation_error',
        message: 'Request did not match schema',
        issues: error.issues,
      },
    });
    return;
  }

  // Fastify validation errors have `.validation` populated.
  if (error.validation !== undefined) {
    reply.status(400).send({
      error: {
        code: 'validation_error',
        message: error.message,
        issues: error.validation,
      },
    });
    return;
  }

  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    request.log.error(
      { err: error, url: request.url, method: request.method },
      'unhandled error',
    );
  }

  reply.status(statusCode).send({
    error: {
      code: error.code ?? 'internal_error',
      message:
        isProd && statusCode >= 500
          ? 'An internal error occurred'
          : error.message,
    },
  });
}
