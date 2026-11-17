import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// v3 Moments (ZIP prototype + Figma M1–M5): passport of places (Collected and Recap removed 9 Nov 2026). Rules (stamps, ink, rank, badges,
// recap facts) are unit-tested in src/data/moments and src/pages/MomentsPage.


test('a new user sees helpful empty states, and nothing scrolls sideways', async ({ page }) => {
  await page.goto(paths.moments);
  await expect(page.getByRole('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
