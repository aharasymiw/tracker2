import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import type { Db } from '../../persistence/db.js';
import type { RedisClient } from '../../persistence/redis.js';
import { users } from '../../persistence/schema/users.js';
import { hashPassword, verifyPassword } from '../../auth/passwords.js';
import {
  createSession,
  getSession,
  revokeSession,
} from '../../auth/sessions.js';
import { createRateLimiter } from '../../auth/rateLimiter.js';

export interface AuthDeps {
  db: Db;
  redis: RedisClient;
  env: Env;
}

const SESSION_COOKIE_KEY = 'lodSessionToken';

const registerBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(256),
});

const loginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});

/**
 * Auth routes. Registered under the `/auth` prefix by the parent router.
 *
 * - POST /auth/register — create an account
 * - POST /auth/login    — issue a session cookie
 * - POST /auth/logout   — revoke the current session
 */
export const authRoutes: FastifyPluginAsync<AuthDeps> = async (
  app: FastifyInstance,
  deps,
) => {
  const ipLimiter = createRateLimiter(deps.redis, {
    key: 'auth:ip',
    max: 30,
    windowSec: 60,
  });
  const emailLimiter = createRateLimiter(deps.redis, {
    key: 'auth:email',
    max: 10,
    windowSec: 300,
  });

  app.post('/register', async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return {
        error: { code: 'validation_error', issues: parsed.error.issues },
      };
    }
    const { email, password } = parsed.data;

    const ipCheck = await ipLimiter.check(request.ip);
    if (!ipCheck.allowed) {
      reply.status(429);
      return { error: { code: 'rate_limited', message: 'Too many requests' } };
    }

    const existing = await deps.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    if (existing.length > 0) {
      reply.status(409);
      return { error: { code: 'email_in_use', message: 'Email already registered' } };
    }

    const passwordHash = await hashPassword(password, deps.env.PASSWORD_PEPPER);
    const [row] = await deps.db
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id });

    if (row === undefined) {
      reply.status(500);
      return { error: { code: 'internal_error', message: 'Failed to create user' } };
    }

    const token = await createSession(deps.redis, row.id);
    setSessionCookie(reply, token, deps.env.NODE_ENV === 'production');
    reply.status(201);
    return { userId: row.id };
  });

  app.post('/login', async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return {
        error: { code: 'validation_error', issues: parsed.error.issues },
      };
    }
    const { email, password } = parsed.data;

    const ipCheck = await ipLimiter.check(request.ip);
    if (!ipCheck.allowed) {
      reply.status(429);
      return { error: { code: 'rate_limited', message: 'Too many requests' } };
    }
    const emailCheck = await emailLimiter.check(email.toLowerCase());
    if (!emailCheck.allowed) {
      reply.status(429);
      return { error: { code: 'rate_limited', message: 'Too many requests' } };
    }

    const rows = await deps.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    const user = rows[0];
    if (user === undefined) {
      reply.status(401);
      return { error: { code: 'invalid_credentials', message: 'Invalid credentials' } };
    }

    const ok = await verifyPassword(
      user.passwordHash,
      password,
      deps.env.PASSWORD_PEPPER,
    );
    if (!ok) {
      reply.status(401);
      return { error: { code: 'invalid_credentials', message: 'Invalid credentials' } };
    }

    await deps.db
      .update(users)
      .set({ lastLoginAt: new Date(), failedLoginCount: 0 })
      .where(eq(users.id, user.id));

    const token = await createSession(deps.redis, user.id);
    setSessionCookie(reply, token, deps.env.NODE_ENV === 'production');
    return { userId: user.id };
  });

  app.post('/logout', async (request, reply) => {
    const token = readSessionCookie(request);
    if (token !== null) {
      await revokeSession(deps.redis, token);
    }
    clearSessionCookie(reply, deps.env.NODE_ENV === 'production');
    return { ok: true };
  });

  app.get('/me', async (request, reply) => {
    const token = readSessionCookie(request);
    if (token === null) {
      reply.status(401);
      return { error: { code: 'unauthenticated', message: 'Not signed in' } };
    }
    const session = await getSession(deps.redis, token);
    if (session === null) {
      reply.status(401);
      return { error: { code: 'unauthenticated', message: 'Session expired' } };
    }
    return { userId: session.userId };
  });
};

function setSessionCookie(
  reply: import('fastify').FastifyReply,
  token: string,
  secure: boolean,
): void {
  reply.header(
    'set-cookie',
    `${SESSION_COOKIE_KEY}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${
      secure ? '; Secure' : ''
    }`,
  );
}

function clearSessionCookie(
  reply: import('fastify').FastifyReply,
  secure: boolean,
): void {
  reply.header(
    'set-cookie',
    `${SESSION_COOKIE_KEY}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${
      secure ? '; Secure' : ''
    }`,
  );
}

function readSessionCookie(
  request: import('fastify').FastifyRequest,
): string | null {
  const header = request.headers.cookie;
  if (header === undefined) return null;
  const parts = header.split(';').map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq);
    if (name === SESSION_COOKIE_KEY) {
      return part.slice(eq + 1);
    }
  }
  return null;
}
