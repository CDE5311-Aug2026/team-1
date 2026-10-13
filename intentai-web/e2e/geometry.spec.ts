import { expect, test, type Page } from '@playwright/test';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frame 1:2 (Home) and 1:340 (Lesson), 390×844. Values from Figma via v0 reference.css.
const HOME: Record<string, Box> = {
  '1:87': [20, 116, 350, 144], // Progress card (contains title 1:86)
  '18:1949': [20, 270, 350, 52], // Near you card
  '1:120': [20, 332, 350, 143], // Expression card 1
  '1:185': [20, 485, 350, 144], // Expression card 2
  '1:252': [20, 638, 350, 143], // Expression card 3
  '1:317': [20, 758, 350, 58], // Tab bar
  '1:338': [128, 830, 134, 5], // Home indicator (only Home draws one)
};
const LESSON: Record<string, Box> = {
  '1:425': [20, 192, 350, 68], // Compact progress card
  '1:478': [20, 275, 350, 425], // Expanded expression card
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

test('Lesson matches Figma frame geometry at 390x844', async ({ page }) => {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expectFrames(page, LESSON);
});

test("title keeps Figma's two-line wrap at 390, and at 320 stays inside the card without overlapping Start", async ({ page }) => {
  const title = page.locator('[data-node-id="1:87"] h1');
  expect((await title.boundingBox())!.height).toBeLessThanOrEqual(64 + TOL);
  for (const zoom of ['100%', '125%']) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.evaluate((z) => {
      document.documentElement.style.fontSize = z;
    }, zoom);
    const card = (await page.locator('[data-node-id="1:87"]').boundingBox())!;
    const t = (await title.boundingBox())!;
    const start = (await page.getByRole('button', { name: 'Start', exact: true }).boundingBox())!;
    expect(t.x, `title left @${zoom}`).toBeGreaterThanOrEqual(card.x);
    expect(t.x + t.width, `title right @${zoom}`).toBeLessThanOrEqual(card.x + card.width);
    expect(t.y + t.height, `title bottom @${zoom}`).toBeLessThanOrEqual(card.y + card.height);
    const overlaps = t.x < start.x + start.width && start.x < t.x + t.width && t.y < start.y + start.height && start.y < t.y + t.height;
    expect(overlaps, `title overlaps Start @${zoom}`).toBe(false);
  }
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

test('lesson step bars (1:517–1:519) are short and centred like Figma', async ({ page }) => {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const bars = page.getByRole('progressbar', { name: 'Lesson step' }).locator('span');
  await expect(bars).toHaveCount(3);
  const want: Box[] = [
    [120, 731, 48, 3],
    [172, 731, 48, 3],
    [224, 731, 48, 3],
  ];
  for (let i = 0; i < 3; i += 1) expectBox(`step bar ${i + 1}`, await bars.nth(i).boundingBox(), want[i]);
});

/** Text boxes differ in width between browsers and Figma, so check the left edge and vertical centre. */
async function expectTextAt(name: string, locator: import('@playwright/test').Locator, x: number, centreY: number) {
  const box = (await locator.boundingBox())!;
  expect(box, `${name} not rendered`).not.toBeNull();
  expect(Math.abs(box.x - x), `${name}.x: got ${box.x}, want ${x}`).toBeLessThanOrEqual(TOL);
  const cy = box.y + box.height / 2;
  expect(Math.abs(cy - centreY), `${name} centre y: got ${cy}, want ${centreY}`).toBeLessThanOrEqual(TOL);
}

test('Home card, progress and Near-you internals match Figma (1:120, 1:87, 18:1949)', async ({ page }) => {
  const card = page.locator('[data-node-id="1:120"]');
  expectBox('tile 1:121', await card.locator('[data-part="tile"]').boundingBox(), [36, 348, 60, 60]);
  expectBox('chip 1:150', await card.locator('[data-part="chip"]').boundingBox(), [110, 348, 147, 22]);
  expectBox('play 1:177', await card.getByRole('button', { name: /play audio/i }).boundingBox(), [322, 344, 32, 32]);
  expectBox('detail 1:183', await card.getByRole('button', { name: 'Detail' }).boundingBox(), [288, 416, 66, 30]);
  await expectTextAt('number 1:149', card.getByText('01', { exact: true }), 36 + 30 - 7, 442.5);
  await expectTextAt('title 1:180', card.getByRole('heading', { name: 'Chope' }), 110, 388);
  await expectTextAt('description 1:182', card.getByText(/^Save a seat/), 110, 424);
  expectBox('start 1:118', await page.getByRole('button', { name: 'Start', exact: true }).boundingBox(), [284, 212, 74, 32]);
  await expectTextAt('progress label 1:114', page.getByText('0 of 3 learned today'), 88, 219.5);
  const dot = page.locator('[data-part="live-dot"]');
  expectBox('live dot 18:1952', await dot.boundingBox(), [56, 280, 9, 9]);
  expect(await dot.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(34, 164, 93)');
});

test('Lesson card internals match Figma (1:478)', async ({ page }) => {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const card = page.locator('[data-node-id="1:478"]');
  expectBox('chip 1:482', await card.locator('[data-part="chip"]').boundingBox(), [48, 577, 147, 22]);
  expectBox('play 1:509', await card.getByRole('button', { name: /play audio/i }).boundingBox(), [322, 577, 32, 32]);
  expectBox('next 1:515', await card.getByRole('button', { name: 'Next' }).boundingBox(), [247, 636, 107, 30]);
  await expectTextAt('number 1:481', card.getByText('01', { exact: true }), 50, 615.5);
  await expectTextAt('title 1:512', card.getByRole('heading', { name: 'Chope' }), 72, 616);
  await expectTextAt('description 1:514', card.getByText(/^Save a seat/), 55, 651);
  await expectTextAt('progress label 1:452', page.getByText('0 of 3 learned today'), 88, 218.5);
});
