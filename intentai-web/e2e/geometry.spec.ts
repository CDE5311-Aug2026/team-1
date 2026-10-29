import { expect, test } from './test';
import type { Page } from './test';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frame 1:2 (Home), 390×844. Values from Figma via v0 reference.css.
// v3: Home's content (greeting, hero, Nearby map + carousel) follows the Design canvas, not Figma; only the
// tab bar and home indicator keep their Figma frames.
const HOME: Record<string, Box> = {
  '1:317': [20, 758, 350, 58], // Tab bar
  '1:338': [128, 830, 134, 5], // Home indicator (only Home draws one)
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

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('intentai:v1:progress'));
  await page.reload();
  await page.evaluate(() => document.fonts.ready.then(() => true));
});

test('Home matches Figma frame geometry at 390x844', async ({ page }) => {
  await expectFrames(page, HOME);
});

function expectBox(name: string, box: { x: number; y: number; width: number; height: number } | null, want: Box) {
  expect(box, `${name} not rendered`).not.toBeNull();
  const [x, y, width, height] = want;
  const got = { x, y, width, height };
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(box![key] - got[key]), `${name}.${key}: got ${box![key]}, want ${got[key]}`).toBeLessThanOrEqual(TOL);
  }
}

// The default header (mascot + greeting) is no longer on Home; the place not-found page still draws it.
test('header mascot (34:21) and greeting match Figma at 390x844', async ({ page }) => {
  await page.goto('/place/unknown-place');
  await page.evaluate(() => document.fonts.ready.then(() => true));
  expectBox('mascot', await page.locator('header img').first().boundingBox(), [8, 47, 58, 58]); // Home 34:19
  const greeting = (await page.getByText('Good Morning, W').boundingBox())!;
  expect(Math.abs(greeting.x - 64), `greeting x: got ${greeting.x}`).toBeLessThanOrEqual(TOL);
});

// Design canvas (Home): logo left, streak chip + bell right-aligned, the date + greeting block under the header.
test('Home header: logo left, streak and bell right-aligned, greeting block below', async ({ page }) => {
  // Measure the settled layout, not the entrance animation.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const header = (await page.locator('header').first().boundingBox())!;
  const logo = (await page.locator('header img').first().boundingBox())!;
  const streak = (await page.getByRole('link', { name: /day streak/ }).boundingBox())!;
  const bell = (await page.getByRole('link', { name: /^Notifications/ }).boundingBox())!;
  const greeting = (await page.getByRole('heading', { level: 1, name: /^Good morning/ }).boundingBox())!;
  const date = (await page.getByText('Sat 7 Nov', { exact: true }).boundingBox())!;

  expect(Math.abs(logo.x - header.x), `logo x: got ${logo.x}, header ${header.x}`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(logo.width - 44), `logo width: got ${logo.width}`).toBeLessThanOrEqual(TOL);
  // Streak chip and bell are 44px tall tap targets.
  expect(Math.abs(streak.height - 44)).toBeLessThanOrEqual(TOL);
  expect(Math.abs(bell.width - 44)).toBeLessThanOrEqual(TOL);
  const headerRight = header.x + header.width;
  expect(Math.abs(bell.x + bell.width - headerRight), `bell right: got ${bell.x + bell.width}, header ${headerRight}`).toBeLessThanOrEqual(TOL);
  expect(streak.x + streak.width, 'streak chip sits left of the bell').toBeLessThanOrEqual(bell.x);
  // Streak and bell share the header row, well right of the logo.
  expect(Math.abs(streak.y + streak.height / 2 - (bell.y + bell.height / 2))).toBeLessThanOrEqual(TOL);
  expect(streak.x).toBeGreaterThan(header.x + header.width / 2);
  // The date and greeting sit under the header, aligned with its left edge.
  expect(date.y).toBeGreaterThanOrEqual(header.y + header.height - TOL);
  expect(greeting.y).toBeGreaterThan(date.y);
  expect(Math.abs(date.x - header.x), `date x: got ${date.x}`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(greeting.x - header.x), `greeting x: got ${greeting.x}`).toBeLessThanOrEqual(TOL);
});
