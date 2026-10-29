import { expect, test } from './test';
import type { Page } from './test';

// Topic picker after onboarding and from My Space. No Figma frames, so no geometry.

async function pick(page: Page, labels: string[]) {
  // Tile names start with the label, then the survey name.
  for (const label of labels) await page.getByRole('button', { name: new RegExp('^' + label + ' ') }).click();
}

// The picks no longer change Home (the culture tabs are gone); they are saved and shown in My Space.
test('picking 3 topics saves them, and a reload keeps them', async ({ page }) => {
  await page.goto('/today-setup');
  await pick(page, ['History', 'Foods', 'UNESCO']);
  await page.getByRole('button', { name: 'Show my Today' }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('intentai:v1:culturePrefs') ?? 'null'));
  expect([...saved.categories].sort()).toEqual(['foods', 'history', 'unesco']);
});

test('Default sets the survey default', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('intentai:v1:culturePrefs', JSON.stringify({ categories: ['history', 'unesco', 'ich'] })));
  await page.goto('/today-setup');
  await expect(page.getByText('You can change these anytime in My Space.')).toBeVisible();
  await page.getByRole('button', { name: 'Default', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('intentai:v1:culturePrefs') ?? 'null'));
  expect(saved.categories).toEqual(['foods', 'monuments', 'holidays']);
});

// v3: My Space edits the topics in its own ranked-photo editor (Figma S1 tile); covered by MySpacePage.test.tsx.

test('the picker fits a 320px phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/today-setup');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
