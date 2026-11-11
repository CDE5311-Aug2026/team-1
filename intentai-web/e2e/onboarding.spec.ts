import { expect, test } from '@playwright/test';

// v2 onboarding (boards 01–04, plan D2 = Welcome B, A1, A8, B3): the Treasure Hunt welcome, rank the four Tourism 2040
// categories, hunt together or solo in a region, the review, then "Stamp my passport" goes Home. Detailed rules are
// unit-tested in src/pages/OnboardingPage/Onboarding.test.tsx; this walks the real first run in a browser and checks
// nothing scrolls sideways.
test.describe('first run', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Treasure Hunt → name → rank categories → hunt mode + region → review → stamped passport → Home', async ({ page }) => {
    const noSideways = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Treasure Hunt/ })).toBeVisible();
    await noSideways();
    await page.getByRole('button', { name: /Start the hunt/ }).click();

    // 1 of 4: the name on the passport (a bad one is caught first)
    await expect(page.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Step 1 of 4');
    await page.getByLabel('Name on your passport').fill('123');
    await page.getByRole('button', { name: /^Continue/ }).click();
    await expect(page.getByRole('alert')).toHaveText('Use at least one letter.');
    await page.getByLabel('Name on your passport').fill('Serin');
    await noSideways();
    await page.getByRole('button', { name: /^Continue/ }).click();

    // 2 of 4: rank the categories (tap order is the rank)
    await expect(page.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Step 2 of 4');
    await expect(page.getByRole('button', { name: /^Pick at least one category/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Attractions', exact: true }).click();
    await page.getByRole('button', { name: 'Wellness', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Attractions, ranked 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wellness, ranked 2' })).toBeVisible();
    await noSideways();
    await page.getByRole('button', { name: /^Continue/ }).click();

    // 3 of 4: together or solo, and a region
    await expect(page.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Step 3 of 4');
    await page.getByRole('radio', { name: /Yes, hunt together/ }).click();
    await page.getByRole('group', { name: 'Regions' }).getByRole('button', { name: /^Central,/ }).click();
    await noSideways();
    await page.getByRole('button', { name: /^Continue/ }).click();

    // 4 of 4: review, then stamp
    await expect(page.getByRole('progressbar', { name: 'Questions' })).toHaveAttribute('aria-valuetext', 'Step 4 of 4');
    await expect(page.getByRole('button', { name: 'Name: Serin. Change' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explore: Attractions, Wellness. Change' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hunt: Central, hunting together. Change' })).toBeVisible();
    await noSideways();
    await page.getByRole('button', { name: /Stamp my passport/ }).click();
    await expect(page.getByRole('img', { name: /^Stamped, / })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
  });
});
