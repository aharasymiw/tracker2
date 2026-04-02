import { expect, test } from '@playwright/test';

test('password onboarding, logging, backup export, and offline reopen', async ({
  page,
  context,
}) => {
  await page.goto('/');

  await expect(page.getByText('Private support that starts with one honest entry')).toBeVisible();

  await page.getByPlaceholder('Use a long memorable phrase').fill('correct horse battery staple');
  await page.getByPlaceholder('Repeat it once').fill('correct horse battery staple');

  await page.getByRole('button', { name: 'Create local vault' }).click();

  await expect(page.getByText('New entry')).toBeVisible();

  await page.getByLabel('Optional note').fill('Evening walk before bed');
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByText('Entry saved.')).toBeVisible();

  await page.getByRole('button', { name: 'Insights' }).click();
  await expect(page.getByText('Patterns, not judgment')).toBeVisible();

  await page.getByRole('button', { name: 'Goals' }).click();
  await page.getByLabel('Weekly hit target').fill('10');
  await page.getByRole('button', { name: 'Save goals' }).click({ force: true });

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'dark' }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export encrypted backup' }).click(),
  ]);

  expect(await download.suggestedFilename()).toContain('kindred-backup');

  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText('Welcome back')).toBeVisible();
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Unlock with password' }).click();
  await expect(page.getByText('New entry')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Insights' }).click();
  await expect(page.getByText('Sessions per day')).toBeVisible();
});
