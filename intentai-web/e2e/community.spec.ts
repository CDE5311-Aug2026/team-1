import { expect, test } from './test';
import type { Page } from '@playwright/test';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frames 3:728 (list) and 7:1119 (question detail), 390×844, from get_metadata.
const LIST: Record<string, Box> = {
  '3:879': [20, 114, 350, 44], // Segment / mode
  '3:891': [20, 208, 350, 100], // Card / Pending
  '3:901': [20, 322, 350, 100], // Card / Answered
  '3:912': [21, 662, 348, 13], // Privacy note
  '3:915': [20, 692, 350, 48], // Button / Ask a local
  '3:787': [20, 758, 350, 58], // Tab bar
};
const DETAIL: Record<string, Box> = {
  '7:1157': [20, 114, 350, 44], // Segment / mode
  '7:1196': [20, 172, 150, 18], // Back row
  '7:1200': [20, 204, 350, 506], // Card / Pending — expanded
  '7:1246': [37, 657, 120, 36], // Withdraw
  '7:1248': [167, 657, 186, 36], // Add more context
  '7:1250': [20, 724, 350, 4], // Pager
  '7:1135': [20, 758, 350, 58], // Tab bar
};

async function expectFrames(page: Page, frames: Record<string, Box>) {
  await page.evaluate(() => document.fonts.ready.then(() => true));
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

test('Community list matches Figma frame geometry at 390x844', async ({ page }) => {
  await page.goto(paths.community);
  await expectFrames(page, LIST);
  await page.screenshot({ path: 'test-results/community-list.png' });
});

test('Question detail matches Figma frame geometry at 390x844', async ({ page }) => {
  await page.goto(paths.question('sabo'));
  await expectFrames(page, DETAIL);
  await page.screenshot({ path: 'test-results/community-question.png' });
});

test('an unknown question redirects to the list', async ({ page }) => {
  await page.goto(paths.question('nope'));
  await expect(page).toHaveURL(/\/community$/);
});

// Port of v0 "Community anonymous question, context, answer and withdrawal work".
test('Community anonymous question, context, answer and withdrawal work', async ({ page }) => {
  await page.goto(paths.community);
  await page.getByRole('button', { name: 'Ask a local', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Your message').fill('Is chope polite?');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.getByRole('link', { name: 'Open question Is chope polite?', exact: true }).click();
  await page.getByRole('button', { name: 'Add more context', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Your message').fill('At a hawker centre');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/At a hawker centre/)).toBeVisible();

  await page.getByRole('switch', { name: 'Answer as a local', exact: true }).click();
  await page.getByRole('button', { name: 'Answer question', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Your message').fill('It is common at hawker centres.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('It is common at hawker centres.', { exact: true })).toBeVisible();

  // Survives a reload (persisted on this device).
  await page.reload();
  await expect(page.getByText('It is common at hawker centres.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(page.getByText('Is chope polite?', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Question withdrawn');

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open question Is chope polite?', exact: true })).toBeVisible();
});
