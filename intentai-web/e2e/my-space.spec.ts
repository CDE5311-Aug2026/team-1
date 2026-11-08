import { expect, test } from './test';
import type { Page } from './test';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma boxes relative to each 390×844 frame (get_metadata, frame x/y subtracted).
// v3: My Space itself follows Figma S1 (no frame check here; see MySpacePage.test.tsx). The notice screens keep theirs.
const NOTICES: Record<string, Box> = {
  '21:1419': [20, 104, 350, 42],
  '21:1426': [20, 158, 350, 128], // Local fix
  '21:1440': [20, 298, 350, 137], // AI notice
  '21:1458': [20, 447, 350, 25], // Your data
  '21:1462': [20, 484, 350, 42], // Delete all my data
};
const DETAILS: Record<string, Box> = {
  '21:1550': [20, 104, 71, 20], // Back row
  '21:1554': [20, 138, 350, 432], // Card / AI output
  '21:1568': [37, 358, 316, 53], // Field / Occasion
  '21:1575': [37, 419, 316, 53], // Field / With
  '21:1583': [37, 509, 316, 44], // Actions
};
const EDIT: Record<string, Box> = {
  '21:1591': [20, 104, 53, 20],
  // Figma 244: 240 since the shared MySpace card took the v2 16 px padding (plan A7, F1 restyle to the new tokens).
  '21:1595': [20, 138, 350, 240], // Card / Edit
  '21:1598': [37, 191, 316, 53],
  '21:1605': [37, 252, 316, 55], // focused With field
  '21:1611': [37, 317, 316, 44],
};
const CONFIRMED: Record<string, Box> = {
  '21:1466': [20, 104, 350, 42],
  '21:1473': [20, 158, 350, 128],
  '21:1487': [20, 298, 350, 78],
  '21:1496': [20, 388, 350, 25],
  '21:1500': [20, 425, 350, 42],
  '21:1504': [20, 700, 350, 44], // Toast
};
const REJECTED: Record<string, Box> = {
  '21:1507': [20, 104, 350, 42],
  '21:1514': [20, 158, 350, 128],
  '21:1528': [20, 298, 350, 78], // Figma 107: the "Ask a local instead" link went with Community (31 Oct)
  // Figma y 417 / 454: 29 px higher since the card lost its "Ask a local instead" link.
  '21:1539': [20, 388, 350, 25],
  '21:1543': [20, 425, 350, 42],
  '21:1547': [20, 700, 350, 44],
};

// v2 tab bar (plan C6): a 64 px pill (Home · Hunt · Passport) and a round Search button, in the same 350 px column as
// the Figma bar (Figma 12:297/14:627/14:811/14:931 were the old 58 px bar at y 758). The nav landmark itself has no
// height (TabBar.module.css), so the row inside it is measured.
const TAB_BAR: Box = [20, 697, 350, 64];

async function expectTabBar(page: Page) {
  const row = page.getByRole('navigation', { name: 'Primary' }).locator(':scope > div').first();
  const box = await row.boundingBox();
  expect(box, 'tab bar not rendered').not.toBeNull();
  const [x, y, width, height] = TAB_BAR;
  const want = { x, y, width, height };
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(box![key] - want[key]), `tab bar.${key}: got ${box![key]}, want ${want[key]}`).toBeLessThanOrEqual(TOL);
  }
}

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
  test('Notices (12:182)', async ({ page }) => {
    await open(page, paths.notices, OCCASIONS_ON);
    await expectFrames(page, NOTICES);
    await expectTabBar(page);
    await page.screenshot({ path: 'test-results/my-space-12-182.png' });
  });

  test('Details (14:512)', async ({ page }) => {
    await open(page, paths.noticeDetails, OCCASIONS_ON);
    await expectFrames(page, DETAILS);
    await expectTabBar(page);
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
    await expectTabBar(page);
    await page.screenshot({ path: 'test-results/my-space-14-730.png' });
  });

  test('Not right (14:850)', async ({ page }) => {
    await open(page, paths.noticeRejected, { ...OCCASIONS_ON, notices: notice('rejected') });
    await expectFrames(page, REJECTED);
    await expectTabBar(page);
    await page.screenshot({ path: 'test-results/my-space-14-850.png' });
  });
});

// Reduce motion in Settings applies to the whole app. v2 (board 18): Motion is its own page, one tap from Settings.
test('Settings › Reduced motion stops the app’s animations', async ({ page }) => {
  await open(page, paths.mySpaceSettings);
  await page.getByRole('link', { name: /^Motion/ }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.mySpaceMotion}$`));
  await page.getByRole('radiogroup', { name: 'Motion' }).getByRole('radio', { name: 'Reduced', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await expect(page.getByTestId('motion-preview')).toHaveAttribute('data-still', 'true');
  // Settings shows the choice
  await page.goto(paths.mySpaceSettings);
  await expect(page.getByRole('link', { name: /^Motion/ })).toContainText('Reduced');
});

// From PR #5: Text size scales the app's rem-sized text and survives a reload; Terms & licences is its own page.
// v2 (boards 19, 21, 22): Text size is its own page with five steps; photo credits moved out of Terms to their own page.
test('Settings › Text size applies app-wide, and Terms & licences opens its page', async ({ page }) => {
  await open(page, paths.mySpaceSettings);
  await page.getByRole('link', { name: /^Text size/ }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.mySpaceTextSize}$`));
  const sizes = page.getByRole('radiogroup', { name: 'Text size' });
  await expect(sizes.getByRole('radio', { name: 'Default', exact: true })).toHaveAttribute('aria-checked', 'true');
  await sizes.getByRole('radio', { name: 'Large', exact: true }).click();
  await expect(sizes.getByRole('radio', { name: 'Large', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('style', /font-size: 110%/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('style', /font-size: 110%/);
  await page.goto(paths.mySpaceSettings);
  await expect(page.locator('html')).toHaveAttribute('style', /font-size: 110%/);
  await page.getByRole('link', { name: /Terms & licences/ }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.licences}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Terms & licences' })).toBeVisible();
  await expect(page.getByText('© OpenStreetMap contributors', { exact: true })).toBeVisible();
  await page.goto(paths.mySpaceSettings);
  await page.getByRole('link', { name: /Photo credits/ }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.credits}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Photo credits' })).toBeVisible();
});

// v0: "AI notice edit, confirm, reject and undo work"
test('AI notice edit, confirm, reject and undo work', async ({ page }) => {
  await open(page, paths.notices, OCCASIONS_ON);
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
