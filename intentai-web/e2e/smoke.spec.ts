import { expect, test } from './test';
import { ROUTES, seed } from './routes';

test('every route renders without runtime errors or broken images', async ({ page }) => {
  test.setTimeout(180_000); // one page load per route; WebKit needs longer than Chromium
  const errors: string[] = [];
  let at = '/';
  // WebKit reports the previous page's in-flight lazy chunks and CSS preloads as errors when a full page load cancels
  // them. Only those two messages, raised while goto is replacing the page, are set aside; any other error counts.
  let leaving = false;
  const cancelled = /^(TypeError: )?(Importing a module script failed\.|Unable to preload CSS for )/;
  page.on('pageerror', (e) => {
    if (leaving && cancelled.test(e.message)) return;
    errors.push(`${at}: ${e.message}`);
  });
  await page.goto('/');
  for (const route of ROUTES) {
    at = route;
    await seed(page, route);
    leaving = true;
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    leaving = false;
    await expect(page.getByRole('main')).toBeVisible();
    expect(new URL(page.url()).pathname, `${route} redirected away`).toBe(route);
    // lazily loaded screens (Nearby) first show a busy placeholder <main>; wait for the screen itself
    await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
    // lazy images (Nearby place pictures) load now, so a missing file still counts as broken
    await page.locator('img[loading="lazy"]').evaluateAll((imgs) => imgs.forEach((img) => ((img as HTMLImageElement).loading = 'eager')));
    await expect
      .poll(() => page.locator('img').evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).complete)))
      .toBe(true);
    const broken = await page
      .locator('img')
      .evaluateAll((imgs) => imgs.filter((img) => !((img as HTMLImageElement).naturalWidth > 0)).map((img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src));
    expect(broken, `broken image on ${route}`).toEqual([]);
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
  await page.getByRole('button', { name: /Deepavali long weekend/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Deepavali' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
  await expect(page.getByRole('button', { name: /Deepavali long weekend/ })).toBeVisible();
});

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('asks for a test name first, then starts at Welcome, not Today', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Type your test name to start' })).toBeVisible();
    await page.getByLabel('Test name').fill('P01');
    // the facilitator picks the study version; B is this app (A redirects to the frozen UI1)
    await page.getByRole('radiogroup', { name: 'Version' }).getByRole('radio', { name: 'B', exact: true }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
  });
});

// v2 tab bar (plan C6): Home · Hunt · Passport in a pill plus a round Search button. Only the active tab's icon takes
// the accent (--accent-ink #a8430c, AA on the pill); the others are --v2-muted. Moments left the tab bar (its route stays).
test('only the active tab icon is orange', async ({ page }) => {
  await page.goto('/hunt');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const tab = (name: string) => nav.getByRole('button', { name, exact: true });
  const iconColour = (name: string) => tab(name).locator('svg').first().evaluate((el) => getComputedStyle(el).color);
  await expect(tab('Hunt')).toHaveAttribute('aria-current', 'page');
  expect(await iconColour('Hunt')).toBe('rgb(168, 67, 12)');
  for (const name of ['Home', 'Passport']) {
    await expect(tab(name)).not.toHaveAttribute('aria-current', 'page');
    expect(await iconColour(name)).toBe('rgb(95, 91, 84)');
  }
  await expect(tab('Search')).not.toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Moments' })).toHaveCount(0);
  // Each tab draws its glyph (inline SVG): a missing one would leave an empty button.
  const marks = await nav
    .locator('button svg')
    .evaluateAll((els) => els.map((el) => el.querySelectorAll('path, circle, rect').length));
  expect(marks).toHaveLength(4);
  for (const n of marks) expect(n).toBeGreaterThan(0);
  const labelColour = (name: string) => nav.getByText(name, { exact: true }).evaluate((el) => getComputedStyle(el).color);
  expect(await labelColour('Hunt')).toBe('rgb(35, 33, 29)');
  expect(await labelColour('Home')).toBe('rgb(95, 91, 84)');
});

// v2: on a laptop every page uses Today's content column. Any wide block near the top of <main>
// (a page wrapper, header or body, outside cards) must start and end where Today's header does.
test('every route uses the same content column at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Home is a full-screen map since the Discovery redesign (31 Oct). v2: Moments left the tabs and opens on its full-width
  // desk, so Hunt (board 10, the field archive) sets the column now.
  await page.goto('/hunt');
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
          // a full-bleed surface (Moments' desk) is the page's ground, not a column; its children are checked
          .filter(({ box }) => !(box.left <= 0 && box.width >= innerWidth))
          .filter(({ box }) => Math.abs(box.left - left) > 3 || Math.abs(box.width - width) > 3)
          .map(({ el, box }) => `${el.className} at ${Math.round(box.left)}/${Math.round(box.width)}`),
      column,
    );
    expect(off, `${route} vs the column ${column.left}/${column.width}`).toEqual([]);
  }
});
