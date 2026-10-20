import { expect, test, type Page } from '@playwright/test';
import { paths } from '../src/routes';

// Nearby Explorer journeys (PRD §17). The map is drawn from the bundled EARTH ONLINE ground image: no
// third-party map or place service may be contacted from these screens.

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

function watchRequests(page: Page) {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') external.push(u.hostname);
  });
  return external;
}

test('principal journey: area → food centre → story and tip → save → visited, persisted after reload', async ({ page }) => {
  const external = watchRequests(page);
  await open(page, paths.nearby);
  await expect(page.getByRole('button', { name: /Exploring Singapore/ })).toBeVisible();
  await page.getByRole('button', { name: /Change area or location/ }).click();
  await page.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }).click();
  await expect(page).toHaveURL(/area=sg-chinatown/);
  await page.getByRole('button', { name: 'Food', exact: true }).click();
  await page.getByRole('link', { name: 'View details: Maxwell Food Centre' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Maxwell Food Centre' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fun facts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Maxwell Road Food Centre' }).first()).toHaveAttribute('href', /roots\.gov\.sg/);
  await expect(page.getByRole('heading', { name: 'What you might hear here' })).toBeVisible();
  const directions = page.getByRole('link', { name: /Directions/ });
  await expect(directions).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=1\.28/);
  expect(await directions.getAttribute('href')).not.toContain('origin');
  await page.getByRole('button', { name: '☆ Save' }).click();
  await page.getByRole('button', { name: 'Mark visited' }).click();
  await expect(page.getByText(/Visited on \d{4}-\d{2}-\d{2} \(self-reported\)/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '★ Saved' })).toBeVisible();
  await expect(page.getByRole('button', { name: '✓ Visited' })).toBeVisible();
  await open(page, paths.collections);
  await expect(page.getByText('1 of 100 visited')).toBeVisible();
  // Back restores the earlier exploration state.
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/area=sg-chinatown.*category=food|category=food.*area=sg-chinatown/);
  expect(external).toEqual([]);
});

test('panning does not search; "Show places in this area" commits one local search with a radius', async ({ page }) => {
  const external = watchRequests(page);
  await open(page, `${paths.nearby}?area=sg-marina-bay`);
  const map = page.getByRole('application', { name: /Map of Singapore places/ });
  const before = page.url();
  await map.scrollIntoViewIfNeeded();
  const b = (await map.boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + 70);
  await page.mouse.down();
  await page.mouse.move(b.x + 190, b.y + 150, { steps: 8 });
  await page.mouse.up();
  expect(page.url()).toBe(before);
  const commit = page.getByRole('button', { name: 'Show places in this area' });
  await expect(commit).toBeVisible();
  await commit.click();
  await expect(page.getByRole('button', { name: /Map area/ })).toBeVisible();
  await expect(page.getByText(/2 km around the map centre/)).toBeVisible();
  expect(external).toEqual([]);
});

test('clusters expand on click, and every pin is a keyboard-reachable button', async ({ page }) => {
  await open(page, paths.nearby);
  const map = page.getByRole('application', { name: /Map of Singapore places/ });
  const scale = Number(await map.getAttribute('data-scale'));
  const cluster = page.getByRole('button', { name: /places here\. Zoom in/ }).first();
  await cluster.click();
  await expect.poll(async () => Number(await map.getAttribute('data-scale'))).toBeGreaterThan(scale);
  await map.focus();
  await page.keyboard.press('+');
  await page.keyboard.press('ArrowLeft');
  const pin = page.locator('[data-pin]').first();
  await pin.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/sel=curated/);
  await expect(page.getByRole('region', { name: 'Selected place' })).toBeVisible();
});

test('deep links reload, invalid ids get a not-found page, and the 3D view link is bundled', async ({ page }) => {
  for (const path of [paths.nearbyPlace('curated:sg-merlion-park'), paths.collection('sg-100'), `${paths.saved}?tab=visited`]) {
    await open(page, path);
    await expect(page.getByRole('main')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
  }
  await open(page, paths.nearbyPlace('curated:sg-nowhere'));
  await expect(page.getByRole('heading', { name: 'Place not found' })).toBeVisible();
  await open(page, paths.nearbyPlace('curated:sg-merlion-park'));
  const href = await page.getByRole('link', { name: /View in 3D/ }).getAttribute('href');
  expect(href).toBe('/earth-online/sg/index.html?card=merlion');
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/html');
  expect(await res.text()).toContain('IntentAI → EARTH ONLINE bridge');
});

test('another tab sees saved changes', async ({ page, context }) => {
  await open(page, paths.saved);
  const other = await context.newPage();
  await other.goto(paths.nearbyPlace('curated:sg-merlion-park'));
  await other.getByRole('button', { name: '☆ Save' }).click();
  await expect(page.getByRole('link', { name: 'View details: Merlion Park' })).toBeVisible();
});

test('unavailable storage keeps the feature working and says so', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key.includes('explore-personal')) throw new DOMException('quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await open(page, paths.nearbyPlace('curated:sg-merlion-park'));
  await page.getByRole('button', { name: '☆ Save' }).click();
  await expect(page.getByRole('button', { name: '★ Saved' })).toBeVisible();
  await expect(page.getByText('Changes will not be saved on this device.')).toBeVisible();
});

test('Explore works at 320 px and on wide screens without horizontal overflow', async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, paths.nearby);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: `test-results/explore-${width}.png` });
  }
});
