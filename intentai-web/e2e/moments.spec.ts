import { expect, test } from './test';
import type { Page } from './test';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frame 4:919 (Moments — Every lookup), 390×844, from get_metadata (Body 4:935 sits at 20,110).
// v2: "Today's three" replaces the 56px daily card row (4:937) (+108px), and the passport redesign
// adds the passport hero and "My topics" above the list (+360px), and the tiles' "Open" cue adds 22px,
// so everything below sits 490px lower.
const V2_SHIFT = 490;
const MOMENTS: Record<string, Box> = {
  '4:935': [20, 110, 350, 573 + V2_SHIFT], // Body
  '4:945': [20, 178 + V2_SHIFT, 126, 26], // Section / All lookups
  '4:961': [20, 216 + V2_SHIFT, 350, 123], // Card 1
  '4:977': [20, 351 + V2_SHIFT, 350, 123], // Card 2
  '4:991': [20, 486 + V2_SHIFT, 350, 123], // Card 3
  '7:1095': [20, 621 + V2_SHIFT, 350, 36], // Pagination
  '7:1114': [20, 669 + V2_SHIFT, 350, 14], // Pagination caption
  '4:1021': [20, 758, 350, 58], // Tab bar
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

async function seedLookups(page: Page, lookups: unknown[]) {
  await page.goto('/moments');
  await page.evaluate((value) => localStorage.setItem('intentai:v1:lookups', JSON.stringify(value)), lookups);
  await page.reload();
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

const PAISEH = { id: 'paiseh', word: 'Paiseh', meaning: 'Sorry or embarrassed.', source: 'AI-generated' };

// Figma shows 24 lookups (8 pages); the first three are the app's seed lookups.
const SEED = [
  { id: 'wah', word: 'wah, finally ah', meaning: 'Mostly teasing, with some impatience — both at once.', source: 'Confirmed by a local' },
  { id: 'chope', word: 'chope', meaning: 'To reserve a seat by leaving tissues on it.', source: 'Confirmed by a local' },
  { id: 'sabo', word: 'sabo', meaning: 'To sell someone out — joking or serious; tone decides.', source: 'AI-generated' },
];
const FIGMA_24 = [
  ...SEED,
  ...Array.from({ length: 21 }, (_, i) => ({ id: `x${i}`, word: `phrase ${i}`, meaning: 'm', source: 'AI-generated' })),
];

test('Moments matches Figma frame geometry at 390x844', async ({ page }) => {
  await seedLookups(page, FIGMA_24);
  await expect(page.getByText('Showing 1–3 of 24 lookups')).toBeVisible();
  await expectFrames(page, MOMENTS);
});

// v0 "Ask context, query, report, lookup deletion and undo work": the lookup part, seeded instead of via Ask.
test('lookup deletion and undo work', async ({ page }) => {
  await seedLookups(page, [PAISEH]);
  await expect(page.getByRole('article', { name: 'Paiseh' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Paiseh', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Paiseh' })).toHaveCount(0);
  await expect(page.getByText('No lookups yet. Ask about a phrase to save it here.')).toBeVisible();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Paiseh' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article', { name: 'Paiseh' })).toBeVisible();
});

test('a newly added "paiseh…" lookup shows on page 1 and pagination survives deletes', async ({ page }) => {
  const older = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, word: `phrase ${i}`, meaning: 'm', source: 'Confirmed by a local' }));
  await seedLookups(page, [{ ...PAISEH, word: 'paiseh…' }, ...older]);
  await expect(page.getByRole('article').first()).toContainText('paiseh…');
  await expect(page.getByText('Showing 1–3 of 7 lookups')).toBeVisible();

  await page.getByRole('button', { name: 'Page 3', exact: true }).click();
  await page.getByRole('button', { name: 'Delete phrase 5', exact: true }).click();
  await expect(page.getByText('Showing 4–6 of 6 lookups')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
});

test("today's three sit in one row and a tapped tile opens its card under the row", async ({ page }) => {
  await page.goto('/moments');
  const tiles = page.getByRole('button', { name: /^0[1-3] / });
  await expect(tiles).toHaveCount(3);
  const tops = await tiles.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);

  await tiles.first().click();
  const detail = page.getByRole('region', { name: 'Chope' });
  await expect(detail).toBeVisible();
  const rowBottom = (await tiles.first().boundingBox())!;
  const detailBox = (await detail.boundingBox())!;
  const listBox = (await page.getByRole('heading', { name: 'All lookups' }).boundingBox())!;
  expect(detailBox.y).toBeGreaterThan(rowBottom.y + rowBottom.height - 1);
  expect(listBox.y).toBeGreaterThan(detailBox.y + detailBox.height - 1);
});

test('visual check screenshot at 390x844', async ({ page }) => {
  await seedLookups(page, FIGMA_24);
  await page.screenshot({ path: 'test-results/moments-390.png' });
});
