import { expect, test } from '@playwright/test';

// v3 onboarding (Intent v3 Figma O1–O8): the Treasure Hunt welcome, six questions with a passport that fills in, and
// the stamped passport. Detailed rules are unit-tested in src/pages/OnboardingPage/Onboarding.test.tsx; this walks the
// real first run in a browser and checks nothing scrolls sideways.
test.describe('first run', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('test name → Treasure Hunt → six questions → stamped passport → Home', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Test name').fill('P01');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Treasure Hunt/ })).toBeVisible();
    await page.getByRole('button', { name: /Start the hunt/ }).click();
    const next = () => page.getByRole('button', { name: /^Continue/ }).click();
    await page.getByRole('button', { name: /India/ }).click();
    await next();
    await page.getByRole('button', { name: /Less than 3 months/ }).click();
    await next();
    await page.getByRole('button', { name: /Student intern/ }).click();
    await next();
    await page.getByRole('button', { name: /^English/ }).click();
    await next();
    await page.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }).click();
    await next();
    await page.getByRole('button', { name: 'Food' }).click();
    await page.getByRole('button', { name: /Stamp my passport/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your passport is ready' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole('button', { name: /Start exploring/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });
});
