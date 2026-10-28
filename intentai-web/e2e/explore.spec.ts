import { expect, test } from './test';
import type { Page } from './test';
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

test('principal journey: area → editor pick → food centre → details in the sheet → save → check in, persisted after reload', async ({ page }) => {
  const external = watchRequests(page);
  await open(page, paths.nearby);
  await expect(page.getByRole('button', { name: /All of Singapore/ })).toBeVisible();
  await page.getByRole('button', { name: /Change area or location/ }).click();
  await page.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }).click();
  await expect(page).toHaveURL(/area=sg-chinatown/);
  // Editor's picks (the list button) → a pick shows only its places, as a checklist
  await page.getByRole('button', { name: "Editor's picks" }).click();
  await page.getByRole('dialog', { name: "Editor's picks" }).getByRole('button', { name: /Hawker centres to know/ }).click();
  await expect(page).toHaveURL(/list=sg-hawker-centres/);
  // a row selects the place on the map; View details unfolds the place in the sheet, under its card (Explore stays)
  await page.getByRole('button', { name: 'Maxwell Food Centre', exact: true }).click();
  const details = page.getByRole('button', { name: 'View details: Maxwell Food Centre' });
  await details.click();
  await expect(page).toHaveURL(/info=1/);
  await expect(page.getByRole('button', { name: 'Hide details: Maxwell Food Centre' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('application', { name: /Map of Singapore places/ })).toBeVisible();
  // culture & language cards: a phrase on top; swipe it away for a fact, whose sources fold inside the card
  await expect(page.getByRole('heading', { name: 'Culture & language' })).toBeVisible();
  const cards = page.getByRole('group', { name: 'Culture and language cards for Maxwell Food Centre' });
  await cards.scrollIntoViewIfNeeded();
  await expect(cards.locator('[data-top]')).toContainText('Chope');
  const top = (await cards.locator('[data-top]').boundingBox())!;
  await page.mouse.move(top.x + top.width / 2, top.y + 30);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(top.x + top.width / 2 - i * 25, top.y + 32);
  await page.mouse.up();
  await expect(cards.locator('[data-top]')).toContainText('Culture');
  await expect(page.getByRole('link', { name: 'Maxwell Road Food Centre' })).toHaveCount(0);
  await cards.locator('[data-top] summary').click();
  await expect(page.getByRole('link', { name: 'Maxwell Road Food Centre' }).first()).toHaveAttribute('href', /roots\.gov\.sg/);
  // practical details, like a maps app
  await expect(page.getByRole('region', { name: 'Details' }).getByRole('link', { name: /Open in Apple Maps/ })).toHaveAttribute('href', /^https:\/\/maps\.apple\.com\//);
  const directions = page.getByRole('link', { name: /Directions/ });
  await expect(directions).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=1\.28/);
  expect(await directions.getAttribute('href')).not.toContain('origin');
  await page.getByRole('button', { name: 'Save Maxwell Food Centre' }).first().click();
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page.getByText(/Checked in on \d{1,2} [A-Z][a-z]{2}( \d{4})?/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Saved Maxwell Food Centre' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Checked in', exact: true })).toBeVisible();
  // the full page is still one tap away
  await page.getByRole('link', { name: 'Open as a page' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Maxwell Food Centre' })).toBeVisible();
  await page.goBack();
  // Back folds the details again
  await page.goBack();
  await expect(page.getByRole('button', { name: 'View details: Maxwell Food Centre' })).toHaveAttribute('aria-expanded', 'false');
  await open(page, paths.collections);
  await expect(page.getByText('1 of 100 checked in')).toBeVisible();
  // Back restores the earlier exploration state.
  await page.goBack();
  await expect(page).toHaveURL(/area=sg-chinatown.*list=sg-hawker-centres|list=sg-hawker-centres.*area=sg-chinatown/);
  expect(external).toEqual([]);
});

test('dragging the sheet up by its header moves only the sheet: the map stays and offers no area search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, `${paths.nearby}?area=sg-marina-bay`);
  const sheet = page.getByRole('region', { name: 'Places' });
  const map = page.getByRole('application', { name: /Map of Singapore places/ });
  await expect(sheet).toHaveAttribute('data-detent', 'peek');
  const scale = await map.getAttribute('data-scale');
  const url = page.url();
  const title = (await sheet.getByRole('heading', { level: 1, name: 'Nearby' }).boundingBox())!;
  await page.mouse.move(title.x + 20, title.y + title.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(title.x + 20, title.y + title.height / 2 - i * 30);
  await page.mouse.up();
  await expect(sheet).toHaveAttribute('data-detent', 'half');
  await page.waitForTimeout(800); // longer than the map's settle time
  expect(await map.getAttribute('data-scale')).toBe(scale);
  expect(page.url()).toBe(url);
  await expect(page.getByRole('button', { name: 'Show places in this area' })).toHaveCount(0);
});

test('panning does not search; "Show places in this area" commits one local search with a radius', async ({ page }) => {
  const external = watchRequests(page);
  await open(page, `${paths.nearby}?area=sg-marina-bay`);
  const map = page.getByRole('application', { name: /Map of Singapore places/ });
  const before = page.url();
  await map.scrollIntoViewIfNeeded();
  const b = (await map.boundingBox())!;
  // the full-screen map: drag in its open middle (the search bar floats on top, the sheet at the bottom)
  await page.mouse.move(b.x + b.width / 2 - 80, b.y + b.height * 0.42);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 70, b.y + b.height * 0.42 + 80, { steps: 8 });
  await page.mouse.up();
  expect(page.url()).toBe(before);
  const commit = page.getByRole('button', { name: 'Show places in this area' });
  await expect(commit).toBeVisible();
  await commit.click();
  await expect(page.getByRole('button', { name: /Map area/ })).toBeVisible();
  await expect(page.getByText(/places within 2 km/)).toBeVisible();
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

test('deep links reload, invalid ids get a not-found page, and the 3D page is bundled', async ({ page }) => {
  for (const path of [paths.nearbyPlace('curated:sg-merlion-park'), paths.collection('sg-100'), `${paths.saved}?tab=visited`]) {
    await open(page, path);
    await expect(page.getByRole('main')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
  }
  await open(page, paths.nearbyPlace('curated:sg-nowhere'));
  await expect(page.getByRole('heading', { name: 'Place not found' })).toBeVisible();
  for (const [path, type, marker] of [
    ['/earth-online/sg/lite.html', 'text/html', 'IntentAI Nearby lite'],
    ['/earth-online/sg/vendor/three-r128.min.js', 'javascript', 'Three.js Authors'],
  ]) {
    const res = await page.request.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain(type);
    expect(await res.text()).toContain(marker);
  }
});

test('another tab sees saved changes', async ({ page, context }) => {
  await open(page, paths.saved);
  const other = await context.newPage();
  await other.goto(paths.nearbyPlace('curated:sg-merlion-park'));
  await other.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Merlion Park' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
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

test('the Back button leaves Explore at once, however many map steps were taken (3D on and off, a list, details)', async ({ page }) => {
  await open(page, paths.today);
  await page.getByRole('button', { name: /places to explore$/ }).click();
  await expect(page).toHaveURL(/\/nearby/);
  await page.getByRole('button', { name: '3D' }).click();
  await expect(page).toHaveURL(/view=3d/);
  await page.getByRole('button', { name: '2D' }).click();
  await expect(page).not.toHaveURL(/view=3d/);
  await page.getByRole('button', { name: "Editor's picks" }).click();
  await page.getByRole('dialog', { name: "Editor's picks" }).getByRole('button', { name: /Hawker centres to know/ }).click();
  await expect(page).toHaveURL(/list=sg-hawker-centres/);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe('on a real phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('no drawn status bar: the device shows its own; the map controls move up into the space', async ({ page }) => {
    await open(page, paths.nearby);
    const search = (await page.getByRole('search').boundingBox())!;
    expect(search.y).toBeLessThan(30);
    await expect(page.getByText('9:00')).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  });
});
