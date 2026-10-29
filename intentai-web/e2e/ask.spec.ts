import { expect, test, type Page } from '@playwright/test';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frame 2:429 (Ask Feature), 390×844, boxes from get_metadata relative to the frame. The chat itself now follows
// docs/design-boards/ask-board.png (Ask from cards), so only the frame around it is still checked against Figma.
const ASK: Record<string, Box> = {
  '71:8': [9, 49, 58, 58], // Mascot
  '2:722': [291, 57, 34, 34], // New chat
  '2:716': [335, 57, 34, 34], // Chat options
  '2:545': [20, 752, 350, 64], // Tab bar
};

async function expectFrames(page: Page, frames: Record<string, Box>) {
  for (const [nodeId, [x, y, width, height]] of Object.entries(frames)) {
    const box = await page.locator(`[data-node-id="${nodeId}"]`).first().boundingBox();
    expect(box, `${nodeId} not rendered`).not.toBeNull();
    const actual = { x: box!.x, y: box!.y, width: box!.width, height: box!.height };
    const want = { x, y, width, height };
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(actual[key] - want[key]), `${nodeId}.${key}: got ${actual[key]}, want ${want[key]}`).toBeLessThanOrEqual(TOL);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(paths.ask);
  await page.evaluate(() => document.fonts.ready.then(() => true));
});

test('Ask matches Figma frame geometry at 390x844 without page scroll', async ({ page }) => {
  await expectFrames(page, ASK);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height, 'page should not scroll').toBeLessThanOrEqual(844);
  await page.screenshot({ path: 'test-results/ask-390.png' });
});

// Ported from v0 "Ask context, query, report, lookup deletion and undo work" (Ask part; deletion is Moments').
test('Ask a phrase, add context, save, and report; the phrase is kept as a lookup', async ({ page }) => {
  await page.getByRole('textbox', { name: /ask intentai/i }).fill('What does paiseh mean?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const answer = page.getByRole('article', { name: /IntentAI answer: What does paiseh mean/ });
  // The situation card first: where / who / how, then the steps, then the reading.
  const card = answer.getByRole('region', { name: 'Add the situation' });
  await card.getByRole('button', { name: 'Office' }).click();
  await card.getByRole('button', { name: 'Colleague' }).click();
  await card.getByRole('button', { name: 'Read it' }).click();
  await expect(answer.getByRole('article', { name: 'Phrase reading' })).toContainText('Behind the words.', { timeout: 6000 });
  await expect(answer).toContainText('Your colleague is apologising');
  await expect(answer).toContainText('Medium confidence');

  await answer.getByRole('button', { name: 'Save insight' }).click();
  await expect(answer.getByRole('button', { name: 'Saved to Moments' })).toBeVisible();

  await answer.getByRole('button', { name: 'Report this answer' }).click();
  const reportDialog = page.getByRole('dialog', { name: 'Report this answer' });
  await reportDialog.getByLabel('What seems wrong?').fill('Please check this wording.');
  await reportDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Report saved on this device');

  const stored = await page.evaluate(() => ({
    lookups: localStorage.getItem('intentai:v1:lookups') ?? '',
    reports: localStorage.getItem('intentai:v1:reports') ?? '',
    insights: localStorage.getItem('intentai:v1:insights') ?? '',
  }));
  expect(stored.lookups).toMatch(/Paiseh/);
  expect(stored.reports).toMatch(/Please check this wording\./);
  expect(stored.insights).toMatch(/What does paiseh mean\?/);
});

test('Ask home: Learn culture opens examples from real areas, and an example answers from its card', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'What do you want to ask today?' })).toBeVisible();
  await page.getByRole('button', { name: 'Learn culture' }).click();
  const sheet = page.getByRole('dialog', { name: 'Learn culture' });
  await sheet.getByRole('button', { name: /What is the story of Sultan Mosque\?/ }).click();
  const answer = page.getByRole('article', { name: /IntentAI answer: What is the story of Sultan Mosque/ });
  await expect(answer).toContainText('From your monument card · Kampong Glam');
  await answer.getByRole('button', { name: 'Open the Sultan Mosque card' }).click();
  await expect(page.getByRole('dialog', { name: 'Sultan Mosque' })).toContainText('Sultan Hussein Shah');
});

test('History keeps the chat across a reload and reopens it; settings turn motion off', async ({ page }) => {
  await page.getByRole('textbox', { name: /ask intentai/i }).fill('What does chope mean?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('article', { name: /IntentAI answer: What does chope mean/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Chat history' }).click();
  await page.getByRole('dialog', { name: 'History' }).getByRole('button', { name: /What does chope mean\?/ }).click();
  await expect(page.getByRole('article', { name: /IntentAI answer: What does chope mean/ })).toContainText('Behind the words.');

  await page.getByRole('button', { name: 'Ask settings' }).click();
  await page.getByRole('dialog', { name: 'Ask settings' }).getByRole('switch', { name: 'Reduce motion' }).click();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
});
