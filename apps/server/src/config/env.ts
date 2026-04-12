import { z } from 'zod';

/**
 * Environment configuration, validated via Zod. The defaults are only safe for
 * local development — production deployments MUST override SESSION_SECRET,
 * PASSWORD_PEPPER, DATABASE_URL, and REDIS_URL via real env vars. The
 * `.superRefine` below is the guardrail: if NODE_ENV=production and any of
 * those secrets are still the dev defaults, the process refuses to boot.
 */
const DEV_SESSION_SECRET = 'dev-dev-dev-dev-dev-dev-dev-dev-dev-';
const DEV_PASSWORD_PEPPER = 'dev-pepper-change-in-production';
const DEV_DATABASE_URL = 'postgres://lod:lod@localhost:5432/lod';
const DEV_REDIS_URL = 'redis://localhost:6379';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().default(4000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().url().default(DEV_DATABASE_URL),
    REDIS_URL: z.string().default(DEV_REDIS_URL),
    SESSION_SECRET: z.string().min(32).default(DEV_SESSION_SECRET),
    PASSWORD_PEPPER: z.string().min(16).default(DEV_PASSWORD_PEPPER),
    /**
     * Comma-separated list of origins allowed by the CORS policy. The default
     * is the Vite dev server so local `pnpm dev` works out of the box;
     * production must set this to the Cloudflare Pages origin (and any custom
     * domain) via `fly secrets set CORS_ORIGIN=...`.
     */
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .default('info'),
    TICK_RATE_HZ: z.coerce.number().default(10),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;
    const forbidden: Array<[keyof typeof value, string]> = [
      ['SESSION_SECRET', DEV_SESSION_SECRET],
      ['PASSWORD_PEPPER', DEV_PASSWORD_PEPPER],
      ['DATABASE_URL', DEV_DATABASE_URL],
      ['REDIS_URL', DEV_REDIS_URL],
    ];
    for (const [key, devDefault] of forbidden) {
      if (value[key] === devDefault) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is still set to its development default; refuse to boot in production`,
        });
      }
    }
  });

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
