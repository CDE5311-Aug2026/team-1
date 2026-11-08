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
