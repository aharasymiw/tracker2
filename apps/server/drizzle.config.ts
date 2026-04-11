import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/persistence/schema/index.ts',
  out: '../../ops/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://lod:lod@localhost:5432/lod',
  },
  strict: true,
  verbose: true,
});
