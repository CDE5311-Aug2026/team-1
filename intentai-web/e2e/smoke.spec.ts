import { expect, test } from './test';
import { ROUTES, seed } from './routes';

test('every route renders without runtime errors or broken images', async ({ page }) => {
  test.setTimeout(180_000); // one page load per route; WebKit needs longer than Chromium
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  for (const route of ROUTES) {
    await seed(page, route);
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    expect(new URL(page.url()).pathname, `${route} redirected away`).toBe(route);
    // lazily loaded screens (Nearby) first show a busy placeholder <main>; wait for the screen itself
    await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
    // lazy images (Nearby place pictures) load now, so a missing file still counts as broken
    await page.locator('img[loading="lazy"]').evaluateAll((imgs) => imgs.forEach((img) => ((img as HTMLImageElement).loading = 'eager')));
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
  test.setTimeout(240_000); // every route at three widths
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

test('the hero opens the holiday detail, and the back link returns to Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Deepavali long weekend starts today', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Deepavali' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Today', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Good morning/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Deepavali long weekend starts today' })).toBeVisible();
});

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('asks for a test name first, then starts at Welcome, not Today', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Type your test name to start' })).toBeVisible();
    await page.getByLabel('Test name').fill('P01');
    await page.getByRole('button', { name: 'Start' }).click();
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
  expect(await iconColour('Home')).toBe('rgb(43, 41, 36)');
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
  expect(await labelColour('Home')).toBe('rgb(43, 41, 36)');
});

// v2: on a laptop every page uses Today's content column. Any wide block near the top of <main>
// (a page wrapper, header or body, outside cards) must start and end where Today's header does.
test('every route uses the same content column as Today at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const column = await page.locator('main > *').first().evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, width: box.width };
  });
  for (const route of ROUTES) {
    await seed(page, route);
    await page.goto(route);
    await expect(page.getByRole('main')).toBeVisible();
    // lazy pages first show a loading <main>; measure the page itself (flaky on a busy machine otherwise)
    await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
    const off = await page.evaluate(
      ({ left, width }) =>
        Array.from(document.querySelectorAll('main > *, main > * > *'))
          // Only blocks stacked down the page: items in a row (a header's title, a grid cell) may be narrower.
          .filter((el) => {
            const parent = getComputedStyle(el.parentElement!);
            return el.parentElement!.tagName === 'MAIN' || parent.display === 'block' || parent.flexDirection === 'column';
          })
          // A full-screen map and what floats over it (Nearby Explore) are marked data-allow-bleed on purpose.
          // Story pages (place + culture cards) set their own gutters and bleed the hero to the column edge.
          .filter(
            (el) =>
              !el.closest('section, article, [role="tabpanel"], ul, form, dialog, [data-allow-bleed], main[data-variant="story"]'),
          )
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > width / 2)
          .filter(({ box }) => Math.abs(box.left - left) > 3 || Math.abs(box.width - width) > 3)
          .map(({ el, box }) => `${el.className} at ${Math.round(box.left)}/${Math.round(box.width)}`),
      column,
    );
    expect(off, `${route} vs Today's ${column.left}/${column.width}`).toEqual([]);
  }
});
