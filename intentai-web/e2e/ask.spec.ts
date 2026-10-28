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
  '2:545': [20, 758, 350, 58], // Tab bar
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
test('Ask context, query and report work, and the phrase is kept as a lookup', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose context' }).click();
  const contextDialog = page.getByRole('dialog', { name: 'Choose context' });
  await contextDialog.getByLabel('Where did you hear it?').selectOption('Office · work');
  await contextDialog.getByRole('button', { name: 'Save', exact: true }).click();

  await page.getByRole('textbox', { name: /ask intentai/i }).fill('What does paiseh mean?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const answer = page.getByRole('article', { name: /IntentAI answer: What does paiseh mean/ });
  await expect(page.getByText(/is Singlish for feeling sorry or embarrassed/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'context: Office · work' })).toBeVisible();
  await expect(page.getByText(/Your colleague is apologising/)).toBeVisible();

  await answer.getByRole('button', { name: 'Report this answer' }).click();
  const reportDialog = page.getByRole('dialog', { name: 'Report this answer' });
  await reportDialog.getByLabel('What seems wrong?').fill('Please check this wording.');
  await reportDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Report saved on this device');

  const stored = await page.evaluate(() => ({
    lookups: localStorage.getItem('intentai:v1:lookups') ?? '',
    reports: localStorage.getItem('intentai:v1:reports') ?? '',
  }));
  expect(stored.lookups).toMatch(/Paiseh/);
  expect(stored.reports).toMatch(/Please check this wording\./);
});

test('Ask from cards: a suggested question answers from its card, and Open shows the card', async ({ page }) => {
  await expect(page.getByLabel('Asking about')).toHaveValue('sg-chinatown');
  await page.getByRole('button', { name: /What is the story of Sri Mariamman Temple\?/ }).click();
  const answer = page.getByRole('article', { name: /IntentAI answer: What is the story of Sri Mariamman Temple/ });
  await expect(answer).toContainText('Source · Chinatown · Monument card');
  await answer.getByRole('button', { name: 'Open the Sri Mariamman Temple card' }).click();
  await expect(page.getByRole('dialog', { name: 'Sri Mariamman Temple' })).toContainText('Naraina Pillai');
});

test('Personalise setup opens Welcome', async ({ page }) => {
  await page.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('button', { name: 'Personalise setup' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});
