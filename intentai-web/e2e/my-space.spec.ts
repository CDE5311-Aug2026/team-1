import { expect, test } from './test';
import type { Page } from './test';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma boxes relative to each 390×844 frame (get_metadata, frame x/y subtracted).
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

const DONE = {
  onboarding: {
    done: true,
    from: 'China',
    time: 'lt3m',
    role: 'intern',
    language: 'en',
    base: { lat: 1.3049, lng: 103.7735, label: 'NUS UTown' },
    topics: ['food', 'festival', 'monument', 'history'],
    hidden: ['from'],
    completedAt: '2026-10-28T00:00:00.000Z',
  },
};

test('profile tiles: edit a role and save, privacy eye, switches start off and persist', async ({ page }) => {
  await open(page, paths.mySpace, DONE);
  for (const name of ['Flag occasions', 'Answer as a local']) {
    await expect(page.getByRole('switch', { name, exact: true })).toHaveAttribute('aria-checked', 'false');
  }
  await page.getByRole('button', { name: /^Here as:/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Role' });
  await sheet.getByRole('radio', { name: /Working/ }).click();
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Role updated')).toBeVisible();
  await page.getByRole('button', { name: 'Show from' }).click();
  await page.getByRole('switch', { name: 'Answer as a local', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Here as: Working\./ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^From: China\./ })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Answer as a local', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('an incomplete Topics ranking explains inside the open sheet', async ({ page }) => {
  await open(page, paths.mySpace, DONE);
  await page.getByRole('button', { name: /^Topics:/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Topics' });
  await sheet.getByRole('button', { name: /^History, ranked 4/ }).click();
  // Save stays tappable while incomplete (aria-disabled) so it can explain what is missing.
  await sheet.getByRole('button', { name: 'Save', exact: true }).click({ force: true });
  await expect(sheet.getByRole('status')).toHaveText('Tap all 4 topics to set the order');
  await expect(sheet.getByRole('button', { name: 'Save', exact: true })).toBeInViewport();
});

test('largest text at 320px: no sideways scrolling, sheet footer on screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, paths.mySpace, { ...DONE, preferences: { notify: { answers: true, recap: true, occasions: false, near: true }, recapTime: 'evening', radiusKm: 3, motion: 'full', textSize: 4, captions: true, haptics: true, permissions: { calendar: 0, notifications: 0, camera: 0 }, usageTiming: true } });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe('130%');
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: /^Here as:/ }).click();
  await expect(page.getByRole('dialog', { name: 'Role' }).getByRole('button', { name: 'Save', exact: true })).toBeInViewport();
  expect(await overflow()).toBeLessThanOrEqual(0);
  for (const path of [paths.mySpaceSettings, paths.mySpacePrivacy]) {
    await page.goto(path);
    expect(await overflow(), path).toBeLessThanOrEqual(0);
  }
});

test('Settings text size applies to the whole app and survives a reload', async ({ page }) => {
  await open(page, paths.mySpaceSettings, DONE);
  await page.getByLabel('Text size').focus();
  await page.keyboard.press('End');
  await expect(page.getByText('Largest', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to My Space' }).click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe('130%');
});

test('hold to delete everything, then a new passport; Tab stays in the overlay', async ({ page }) => {
  await open(page, paths.mySpacePrivacy, DONE);
  const button = page.getByRole('button', { name: 'Hold to delete all my data' });
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1800);
  await page.mouse.up();
  const dialog = page.getByRole('dialog', { name: 'Everything is deleted' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    // Focus may leave for the browser UI (body), but never lands on a page control behind the modal.
    const outside = await page.evaluate(() => {
      const el = document.activeElement;
      return Boolean(el && el !== document.body && !el.closest('dialog'));
    });
    expect(outside).toBe(false);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Make a new passport' }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.onboarding}$`));
  await page.goto(paths.today);
  await expect(page).toHaveURL(new RegExp(`${paths.onboarding}$`));
});

test('Redo onboarding opens the welcome screen', async ({ page }) => {
  await open(page, paths.mySpace, DONE);
  await page.getByRole('button', { name: /Redo onboarding/ }).click();
  await expect(page).toHaveURL(new RegExp(`${paths.onboarding}$`));
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${paths.onboarding}$`));
});

// v0: "AI notice edit, confirm, reject and undo work"
test('AI notice edit, confirm, reject and undo work', async ({ page }) => {
  await open(page, paths.mySpace);
  await page.getByRole('switch', { name: 'Flag occasions', exact: true }).click();
  // The bell (Home header) opens Notices; My Space no longer has a Notices tab.
  await page.goto(paths.notices);
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

