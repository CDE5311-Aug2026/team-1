import { expect, test } from './test';
import { paths } from '../src/routes';

// Location for "near you". The v1 Nearby explorer (/nearby, with its own "My location") is retired (owner,
// 8 Nov 2026): Settings › Privacy & data › Location now opens Home's Near you, which asks for location the same way
// the map's Locate key does. The position stays on this phone: never stored, never in the address.

test.describe('with geolocation permission', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 1.2803, longitude: 103.8447, accuracy: 20 } });

  test('Privacy › Location opens Home’s Near you from your position; the position is not stored', async ({ page }) => {
    await page.goto(paths.mySpacePrivacy);
    const tile = page.getByRole('button', { name: /Location Near you and check-ins/ });
    await expect(tile).toBeVisible();
    await tile.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    await expect(page.getByText(/^(Near you · 2 km|Nearest to you)$/).first()).toBeVisible({ timeout: 15_000 });
    // the one-off ask leaves the address, so a reload or a shared link never asks again
    expect(new URL(page.url()).searchParams.get('locate')).toBeNull();
    expect(page.url()).not.toContain('103.844');
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).not.toContain('103.844');
  });
});

test('old links to the explorer and its location page land on Home', async ({ page }) => {
  for (const old of [paths.nearby, paths.nearbyLocation]) {
    await page.goto(old);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeAttached();
  }
});

// The kept Nearby pages (place, collection, Saved), moved here from the retired explorer's explore.spec.ts.
test('deep links reload, invalid ids get a not-found page, and the 3D page is bundled', async ({ page }) => {
  for (const path of [paths.nearbyPlace('curated:sg-merlion-park'), paths.collection('sg-100'), `${paths.saved}?tab=visited`]) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
  }
  await page.goto(paths.nearbyPlace('curated:sg-nowhere'));
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
  await page.goto(paths.saved);
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
  await page.goto(paths.nearbyPlace('curated:sg-merlion-park'));
  // v2 place page (boards 08/12): Save is one toggle button whose pressed state says it is saved.
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Changes will not be saved on this device.')).toBeVisible();
});

