import { expect, test } from '@playwright/test';
import { ROUTES, seed } from './routes';

test('every route renders without runtime errors or broken images', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const route of ROUTES) {
    await seed(page, route);
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    expect(new URL(page.url()).pathname, `${route} redirected away`).toBe(route);
    await expect
      .poll(() => page.locator('img').evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).complete)))
      .toBe(true);
    const imagesOk = await page
      .locator('img')
      .evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0));
    expect(imagesOk, `broken image on ${route}`).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('no horizontal overflow at 320, 390 and 1440', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const route of ROUTES) {
      await seed(page, route);
      await page.goto(route);
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflows, `${route} overflows at ${width}px`).toBe(false);
      // Page-level scroll can't see an element that ends exactly at the viewport edge, so check the
      // visible part of every element (clipped by overflow ancestors) against the 16px side gutter.
      const outside = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main *'))
          .filter((el) => {
            // Figma places some art (the header mascot) deliberately in the gutter.
            if (el.closest('[data-allow-bleed]')) return false;
            const box = el.getBoundingClientRect();
            if (box.width === 0) return false;
            let left = box.left;
            let right = box.right;
            for (let p = el.parentElement; p; p = p.parentElement) {
              if (getComputedStyle(p).overflowX !== 'visible') {
                const clip = p.getBoundingClientRect();
                left = Math.max(left, clip.left);
                right = Math.min(right, clip.right);
              }
            }
            return right > left && (left < 16 || right > window.innerWidth - 16);
          })
          .map((el) => el.getAttribute('data-node-id') ?? el.tagName),
      );
      expect(outside, `${route} breaks the side gutter at ${width}px`).toEqual([]);
    }
  }
});

test('learned progress survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('intentai:v1:progress'));
  await page.reload();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByText('3 of 3 learned today')).toBeVisible();
  await page.reload();
  await expect(page.getByText('3 of 3 learned today')).toBeVisible();
});

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('starts at Welcome, not Today', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
  });
});

test('only the active tab icon is orange', async ({ page }) => {
  await page.goto('/moments');
  const iconColour = (name: string) =>
    page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('button', { name, exact: true })
      .locator('span')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await iconColour('Moments')).toBe('rgb(228, 103, 31)');
  expect(await iconColour('Today')).toBe('rgb(44, 44, 46)');
  // The glyph comes from a CSS mask; an invalid url() silently drops it and shows a solid square.
  const masks = await page
    .getByRole('navigation', { name: 'Primary' })
    .locator('button > span:first-child')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage));
  expect(masks).toHaveLength(5);
  for (const mask of masks) expect(mask).toMatch(/^url\(/);
  const labelColour = (name: string) =>
    page
      .getByRole('navigation', { name: 'Primary' })
      .getByText(name, { exact: true })
      .evaluate((el) => getComputedStyle(el).color);
  expect(await labelColour('Moments')).toBe('rgb(228, 103, 31)');
  expect(await labelColour('Today')).toBe('rgb(44, 44, 46)');
});
