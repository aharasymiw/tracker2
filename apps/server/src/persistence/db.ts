import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

/**
 * Build a Drizzle + postgres.js connection. Keep the pool small — we are
 * one Node process per Fly.io machine and Postgres is the bottleneck we
 * protect, not the bottleneck we saturate.
 */
export function createDb(url: string) {
  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
