import { expect, test } from './test';
import type { Page } from '@playwright/test';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frame 1:2 (Home), 390×844. Values from Figma via v0 reference.css.
// v2: the progress card (1:87), expression cards (1:120, 1:185, 1:252) and the lesson (1:340) are replaced by the
// holiday card, culture tabs and holiday page, which have no Figma frame; Near you (18:1949) moved down with them.
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

test('header mascot (34:21) and greeting match Figma at 390x844', async ({ page }) => {
  expectBox('mascot', await page.locator('header img').first().boundingBox(), [8, 47, 58, 58]); // Home 34:19
  const greeting = (await page.getByText('Good Morning, W').boundingBox())!;
  expect(Math.abs(greeting.x - 64), `greeting x: got ${greeting.x}`).toBeLessThanOrEqual(TOL);
});

test('Near-you live dot keeps its Figma colour (18:1952)', async ({ page }) => {
  const dot = page.locator('[data-part="live-dot"]');
  expect(await dot.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(34, 164, 93)');
});
