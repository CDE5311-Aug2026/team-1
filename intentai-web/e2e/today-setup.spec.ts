import { expect, test } from './test';
import type { Page } from './test';

// Topic picker after onboarding and from My Space settings. No Figma frames, so no geometry.

async function pick(page: Page, labels: string[]) {
  // Tile names start with the label, then the survey name.
  for (const label of labels) await page.getByRole('button', { name: new RegExp('^' + label + ' ') }).click();
}

// The picks no longer change Home (the culture tabs are gone); they are saved and shown in My Space settings.
test('picking 3 topics saves them, and a reload keeps them', async ({ page }) => {
  await page.goto('/today-setup');
  await pick(page, ['History', 'Foods', 'UNESCO']);
  await page.getByRole('button', { name: 'Show my Today' }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('intentai:v1:culturePrefs') ?? 'null'));
  expect([...saved.categories].sort()).toEqual(['foods', 'history', 'unesco']);
  await page.goto('/my-space/settings');
  await expect(page.getByText('Foods, UNESCO, History', { exact: true })).toBeVisible();
});

test('Default sets the survey default', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('intentai:v1:culturePrefs', JSON.stringify({ categories: ['history', 'unesco', 'ich'] })));
  await page.goto('/today-setup');
  await expect(page.getByText('You can change these anytime in My Space.')).toBeVisible();
  await page.getByRole('button', { name: 'Default', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/my-space/settings');
  await expect(page.getByText('Foods, Monuments, Festivals', { exact: true })).toBeVisible();
});

test('Settings retake is pre-filled and Cancel changes nothing', async ({ page }) => {
  await page.goto('/my-space/settings');
  await expect(page.getByText('Foods, Monuments, Festivals', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Today’s topics/ }).click();
  await expect(page.getByRole('button', { name: /^Festivals / })).toHaveAttribute('aria-pressed', 'true');
  await pick(page, ['Festivals', 'History']);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/my-space\/settings$/);
  await expect(page.getByText('Foods, Monuments, Festivals', { exact: true })).toBeVisible();
});

test('the picker fits a 320px phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/today-setup');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
