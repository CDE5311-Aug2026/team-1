import { expect, test, type Page } from '@playwright/test';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frames 11:1414 (Nearby — Heads up) and 11:1571 (Nearby — Where are you?), 390×844, from get_design_context.
// Intentional change (Nearby Explorer PR): the heads-up screen moved to /nearby/phrases and always shows
// "Manual place" — it no longer pretends to know a position ("Location on · 120 m"), so its chip is 8 px wider
// than the Figma "Location on" chip and starts 8 px further left; everything else is unchanged.
const NEARBY: Record<string, Box> = {
  '11:1730': [254, 62, 116, 32], // Location chip ("Manual place")
  '11:1733': [20, 112, 350, 160], // Map illustration
  '11:1781': [291, 121, 68, 28], // Change
  '11:1783': [20, 288, 350, 248], // Heads-up card
  '11:1851': [34.5, 482.5, 153, 36], // Got it
  '11:1853': [199.5, 482.5, 153, 36], // Ask IntentAI
  '11:1858': [20, 582, 350, 58], // Also heard: Tapau
  '11:1867': [20, 648, 350, 58], // Also heard: Kosong
  '11:1550': [20, 758, 350, 58], // Tab bar
};
const PLACES: Record<string, Box> = {
  '11:1876': [20, 62, 32, 32], // Back
  '11:1880': [20, 140, 350, 56], // Use my location row
  '11:1889': [320, 157, 36, 22], // Switch
  '11:1895': [20, 242, 110, 106], // Hawker centre tile
  '11:1938': [260, 474, 110, 106], // Mall tile
  '11:1943': [20, 600, 350, 48], // Show phrases
  '11:1707': [20, 758, 350, 58], // Tab bar
};

async function expectFrames(page: Page, frames: Record<string, Box>) {
  for (const [nodeId, [x, y, width, height]] of Object.entries(frames)) {
    const box = await page.locator(`[data-node-id="${nodeId}"]`).boundingBox();
    expect(box, `${nodeId} not rendered`).not.toBeNull();
    const actual = { x: box!.x, y: box!.y, width: box!.width, height: box!.height };
    const want = { x, y, width, height };
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(actual[key] - want[key]), `${nodeId}.${key}: got ${actual[key]}, want ${want[key]}`).toBeLessThanOrEqual(TOL);
    }
  }
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

test('heads-up phrase screen matches Figma frame geometry at 390x844', async ({ page }) => {
  await open(page, paths.phrases);
  await expectFrames(page, NEARBY);
  await expect(page.getByText(/\d+ m$/)).toHaveCount(0);
  await page.screenshot({ path: 'test-results/nearby-phrases-390.png' });
});

test('Place list matches Figma frame geometry at 390x844', async ({ page }) => {
  await open(page, paths.places);
  await expectFrames(page, PLACES);
  await page.screenshot({ path: 'test-results/nearby-places-390.png' });
});

// Port of v0 "Nearby manual place selection" — now reached from Explore → "Phrases for a setting".
test('Nearby manual phrase-setting selection works', async ({ page }) => {
  await open(page, paths.today);
  await page.getByRole('button', { name: /nearby/i }).click();
  await expect(page).toHaveURL(/\/nearby$/); // Explore opens even with location off
  await page.getByRole('link', { name: /Phrases for a setting/ }).click();
  await expect(page).toHaveURL(/\/nearby\/places$/);
  await expect(page.getByRole('switch', { name: 'Use my location' })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: /^Office/ }).click();
  await page.getByRole('button', { name: 'Show 4 phrases for Office' }).click();
  await expect(page).toHaveURL(/\/nearby\/phrases$/);
  await expect(page.locator('[data-node-id="11:1733"]')).toContainText('Office');
  await expect(page.getByRole('heading', { level: 2, name: 'Can or not?' })).toBeVisible();

  await page.getByRole('button', { name: 'Change' }).click();
  await expect(page.getByRole('button', { name: /^Office/ })).toHaveAttribute('aria-pressed', 'true');
});

test('Got it saves the phrase to Moments; Ask IntentAI opens Ask', async ({ page }) => {
  await open(page, paths.phrases);
  await page.getByRole('button', { name: 'Got it' }).click();
  // The seed lookups already include chope.
  await expect(page.getByRole('status')).toHaveText('Chope is already in Moments');
  await page.getByRole('button', { name: 'Ask IntentAI' }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByRole('article', { name: /IntentAI answer: What does chope mean\?/ })).toBeVisible();
});

test.describe('with geolocation permission', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 1.2803, longitude: 103.8447, accuracy: 20 } });

  test('Use my location explains first, then sorts by distance from you; the position is not stored', async ({ page }) => {
    await open(page, paths.nearby);
    await page.getByRole('button', { name: /My location/ }).click();
    await expect(page.getByRole('dialog', { name: 'Use your location?' })).toContainText('not sent to any server');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: /Near you/ })).toBeVisible();
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(page.getByText(/Approx\. .* from you$/).first()).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).not.toContain('103.844');
    expect(page.url()).not.toContain('103.844');
  });
});
