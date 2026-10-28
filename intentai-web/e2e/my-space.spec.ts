import { expect, test } from './test';
import type { Page } from '@playwright/test';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma boxes relative to each 390×844 frame (get_metadata, frame x/y subtracted).
const ABOUT_YOU: Record<string, Box> = {
  '21:1338': [20, 104, 350, 42], // Segment
  '21:1345': [20, 158, 350, 25], // Section / About you
  '21:1347': [20, 195, 350, 168], // Card / Profile
  '21:1380': [20, 375, 350, 25], // Section / Switches
  '21:1384': [20, 412, 350, 227], // Card / Switches (v2: four rows, Figma's 284 had five)
  '12:155': [20, 758, 350, 58], // Tab bar
};
const NOTICES: Record<string, Box> = {
  '21:1419': [20, 104, 350, 42],
  '21:1426': [20, 158, 350, 128], // Local fix
  '21:1440': [20, 298, 350, 137], // AI notice
  '21:1458': [20, 447, 350, 25], // Your data
  '21:1462': [20, 484, 350, 42], // Delete all my data
  '12:297': [20, 758, 350, 58],
};
const DETAILS: Record<string, Box> = {
  '21:1550': [20, 104, 71, 20], // Back row
  '21:1554': [20, 138, 350, 432], // Card / AI output
  '21:1568': [37, 358, 316, 53], // Field / Occasion
  '21:1575': [37, 419, 316, 53], // Field / With
  '21:1583': [37, 509, 316, 44], // Actions
  '21:1588': [20, 584, 350, 15], // Ask a local
  '14:627': [20, 758, 350, 58],
};
const EDIT: Record<string, Box> = {
  '21:1591': [20, 104, 53, 20],
  '21:1595': [20, 138, 350, 244], // Card / Edit
  '21:1598': [37, 191, 316, 53],
  '21:1605': [37, 252, 316, 55], // focused With field
  '21:1611': [37, 321, 316, 44],
};
const CONFIRMED: Record<string, Box> = {
  '21:1466': [20, 104, 350, 42],
  '21:1473': [20, 158, 350, 128],
  '21:1487': [20, 298, 350, 78],
  '21:1496': [20, 388, 350, 25],
  '21:1500': [20, 425, 350, 42],
  '21:1504': [20, 700, 350, 44], // Toast
  '14:811': [20, 758, 350, 58],
};
const REJECTED: Record<string, Box> = {
  '21:1507': [20, 104, 350, 42],
  '21:1514': [20, 158, 350, 128],
  '21:1528': [20, 298, 350, 107],
  '21:1539': [20, 417, 350, 25],
  '21:1543': [20, 454, 350, 42],
  '21:1547': [20, 700, 350, 44],
  '14:931': [20, 758, 350, 58],
};

async function expectFrames(page: Page, frames: Record<string, Box>) {
  let maxDelta = 0;
  for (const [nodeId, [x, y, width, height]] of Object.entries(frames)) {
    const box = await page.locator(`[data-node-id="${nodeId}"]`).boundingBox();
    expect(box, `${nodeId} not rendered`).not.toBeNull();
    const actual = { x: box!.x, y: box!.y, width: box!.width, height: box!.height };
    const want = { x, y, width, height };
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      const delta = Math.abs(actual[key] - want[key]);
      maxDelta = Math.max(maxDelta, delta);
      expect(delta, `${nodeId}.${key}: got ${actual[key]}, want ${want[key]}`).toBeLessThanOrEqual(TOL);
    }
  }
  test.info().annotations.push({ type: 'max delta (px)', description: maxDelta.toFixed(2) });
}

async function open(page: Page, path: string, storage: Record<string, unknown> = {}) {
  await page.goto(paths.mySpace);
  await page.evaluate((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(`intentai:v1:${key}`, JSON.stringify(value));
  }, storage);
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

const OCCASIONS_ON = {
  settings: { daily: false, occasions: true, local: false, rehearse: false, judgement: false, location: false },
};
const notice = (status: string) => ({ status, dismissed: false, occasion: 'Team dinner', with: 'Colleagues and manager' });

test.describe('geometry at 390x844', () => {
  test('About you (12:40)', async ({ page }) => {
    await open(page, paths.mySpace);
    await expectFrames(page, ABOUT_YOU);
    await page.screenshot({ path: 'test-results/my-space-12-40.png' });
  });

  test('Notices (12:182)', async ({ page }) => {
    await open(page, paths.notices, OCCASIONS_ON);
    await expectFrames(page, NOTICES);
    await page.screenshot({ path: 'test-results/my-space-12-182.png' });
  });

  test('Details (14:512)', async ({ page }) => {
    await open(page, paths.noticeDetails, OCCASIONS_ON);
    await expectFrames(page, DETAILS);
    await page.screenshot({ path: 'test-results/my-space-14-512.png' });
  });

  test('Edit (19:1107)', async ({ page }) => {
    await open(page, paths.noticeDetails, OCCASIONS_ON);
    await page.getByRole('button', { name: /edit with/i }).click();
    await expect(page.getByRole('textbox', { name: 'With' })).toBeFocused();
    await expectFrames(page, EDIT);
    await page.screenshot({ path: 'test-results/my-space-19-1107.png' });
  });

  test('Confirmed (14:730)', async ({ page }) => {
    await open(page, paths.noticeConfirmed, { ...OCCASIONS_ON, notices: notice('confirmed') });
    await expectFrames(page, CONFIRMED);
    await page.screenshot({ path: 'test-results/my-space-14-730.png' });
  });

  test('Not right (14:850)', async ({ page }) => {
    await open(page, paths.noticeRejected, { ...OCCASIONS_ON, notices: notice('rejected') });
    await expectFrames(page, REJECTED);
    await page.screenshot({ path: 'test-results/my-space-14-850.png' });
  });
});

// v0: "profile editing and all five switches persist, with switches initially off" (v2 drops "Daily card")
test('profile editing and all four switches persist, with switches initially off', async ({ page }) => {
  await open(page, paths.mySpace);
  for (const name of ['Flag occasions', 'Answer as a local', 'Rehearse with AI', 'No-judgement mode']) {
    await expect(page.getByRole('switch', { name, exact: true })).toHaveAttribute('aria-checked', 'false');
  }
  await page.getByRole('button', { name: 'Edit From', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'From' }).fill('Malaysia');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('switch', { name: 'Answer as a local', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Malaysia', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Answer as a local', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Delete From', exact: true }).click();
  await expect(page.getByText('Not set')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Malaysia', { exact: true })).toBeVisible();
});

// v0: "AI notice edit, confirm, reject and undo work"
test('AI notice edit, confirm, reject and undo work', async ({ page }) => {
  await open(page, paths.mySpace);
  await page.getByRole('switch', { name: 'Flag occasions', exact: true }).click();
  await page.getByRole('button', { name: /^notices/i }).click();
  await expect(page.getByText('AI · Medium confidence')).toBeVisible();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: /edit occasion/i }).click();
  await page.getByRole('textbox', { name: 'Occasion', exact: true }).fill('Lunch');
  await page.getByRole('textbox', { name: 'With', exact: true }).fill('Friends');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Lunch', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.noticeConfirmed}$`));
  await expect(page.getByText('Seating phrases added for Thursday')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.notices}$`));
  await page.getByRole('button', { name: 'Not right', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.noticeRejected}$`));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.notices}$`));
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
});

// v0: data-deletion half of "Nearby manual place selection and data deletion work"
test('Delete all my data returns to Welcome and stays there after a reload', async ({ page }) => {
  await open(page, paths.notices);
  await page.getByRole('button', { name: 'Delete all my data', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete all my data', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.welcome}$`));
  await page.goto(paths.today);
  await expect(page).toHaveURL(new RegExp(`${paths.welcome}$`));
});
