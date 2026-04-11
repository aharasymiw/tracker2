import { z } from 'zod';

/**
 * Environment configuration, validated via Zod. The defaults are only safe for
 * local development — production deployments MUST override SESSION_SECRET,
 * PASSWORD_PEPPER, DATABASE_URL, and REDIS_URL via real env vars.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgres://lod:lod@localhost:5432/lod'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default('dev-dev-dev-dev-dev-dev-dev-dev-dev-'),
  PASSWORD_PEPPER: z.string().default('dev-pepper-change-in-production'),
  /**
   * Comma-separated list of origins allowed by the CORS policy. The default is
   * the Vite dev server so local `pnpm dev` works out of the box; production
   * must set this to the Cloudflare Pages origin (and any custom domain) via
   * `fly secrets set CORS_ORIGIN=...`.
   */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  TICK_RATE_HZ: z.coerce.number().default(10),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
