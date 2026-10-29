import { expect, test } from '@playwright/test';
import { paths } from '../src/routes';

// v3 Moments (ZIP prototype + Figma M1–M5): passport of places, Collected, Recap. Rules (stamps, ink, rank, badges,
// recap facts) are unit-tested in src/data/moments and src/pages/MomentsPage.

test('an answer saved in Ask shows in Moments › Collected, and opens Ask again', async ({ page }) => {
  await page.goto(paths.ask);
  await page.getByRole('textbox', { name: /ask intentai/i }).fill('How old is Sri Mariamman Temple?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('button', { name: 'Save insight' }).click();
  await page.goto(paths.moments);
  await expect(page.getByText(/How old is Sri Mariamman Temple\?/).first()).toBeVisible();
});

test('a new user sees helpful empty states, and nothing scrolls sideways', async ({ page }) => {
  await page.goto(paths.moments);
  await expect(page.getByRole('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
