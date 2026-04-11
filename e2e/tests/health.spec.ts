import { test, expect, request } from '@playwright/test';

test('server health endpoint returns ok', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get('http://127.0.0.1:4000/health');
  expect(res.status()).toBe(200);
  const body = (await res.json()) as unknown;
  expect(body).toMatchObject({ status: expect.any(String) });
  await ctx.dispose();
});
