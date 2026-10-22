import { expect, test, type Page } from '@playwright/test';
import { quizFor } from '../src/pages/OnboardingPage/quiz';
import { paths } from '../src/routes';

const TOL = 3; // px, decision D2
type Box = [x: number, y: number, width: number, height: number];

// Figma frames 17:45, 17:77, 17:136, 17:216, 17:271 (390×844), boxes relative to the frame.
const WELCOME: Record<string, Box> = {
  '17:58': [50, 148, 290, 290], // glow
  '71:31': [90, 188, 210, 210], // mascot
  '17:71': [20, 458, 350, 76], // title
  '17:72': [40, 546, 310, 66], // lead
  '17:73': [20, 741, 350, 52], // Get started
};
const TIME: Record<string, Box> = {
  '17:90': [20, 58, 36, 36], // Back
  '17:97': [20, 140, 330, 64], // title
  '17:99': [20, 257, 350, 76],
  '17:106': [20, 345, 350, 76],
  '17:116': [20, 433, 350, 76],
  '17:125': [20, 533, 350, 75], // AI hint
  '17:133': [20, 740, 350, 52], // Continue
};
const TOPICS: Record<string, Box> = {
  '17:149': [20, 58, 36, 36],
  '17:156': [20, 140, 330, 64],
  '17:158': [20, 278, 169, 172], // Work
  '17:171': [201, 278, 169, 172], // Food
  '17:183': [20, 462, 169, 172], // Daily life
  '17:193': [201, 462, 169, 172], // Getting around
  '17:205': [20, 654, 350, 75],
  '17:213': [20, 740, 350, 52],
};
const QUIZ: Record<string, Box> = {
  '17:229': [20, 58, 36, 36],
  '17:242': [20, 270, 350, 147], // scenario card
  '17:249': [320.5, 280.5, 32, 32], // play
  '17:255': [20, 437, 350, 56], // answer A
  '17:259': [20, 505, 350, 56],
  '17:263': [20, 573, 350, 56],
  '17:268': [20, 740, 350, 52], // Check answer
};
const RESULT: Record<string, Box> = {
  '17:290': [20, 116, 350, 36], // title
  '17:292': [20, 224, 350, 116], // level card
  '17:306': [20, 396, 350, 192], // plan card
  '17:328': [20, 608, 350, 75], // AI hint
  '17:337': [20, 740, 350, 52], // Start learning
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

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

test.describe('first run', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('onboarding completes three questions and persists the resulting level', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Get started' }).click();
    await page.getByRole('button', { name: /^Less than 3 months/ }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    for (const topic of [/^Work/, /^Food/, /^Daily life/]) await page.getByRole('button', { name: topic }).click();
    await page.getByRole('button', { name: 'Continue (3 selected)' }).click();
    for (const question of quizFor(['Work', 'Food', 'Daily life'])) {
      await expect(page.getByText(question.phrase)).toBeVisible();
      await page.getByRole('button', { name: question.answers[question.correct] }).click();
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    }
    await expect(page.getByRole('heading', { level: 1, name: "You're Experienced" })).toBeVisible();
    await page.getByRole('button', { name: 'Start learning', exact: true }).click();
    await expect(page).toHaveURL(/\/today-setup$/);
    await page.getByRole('button', { name: 'Default', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Deepavali long weekend starts today' })).toBeVisible();
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('intentai:v1:profile') ?? '{}'));
    expect(profile).toMatchObject({ time: 'Less than 3 months', level: 'Experienced', topics: ['Work', 'Food', 'Daily life'] });
  });

  test('screens match Figma frame geometry at 390x844', async ({ page }) => {
    const screens: [string, string, Record<string, Box>][] = [
      ['welcome', paths.welcome, WELCOME],
      ['time', paths.onboardingTime, TIME],
      ['topics', paths.onboardingTopics, TOPICS],
      ['quiz', paths.onboardingQuiz, QUIZ],
      ['result', `${paths.onboardingResult}?score=2`, RESULT],
    ];
    for (const [name, path, frames] of screens) {
      await open(page, path);
      if (name === 'quiz') await page.getByRole('button', { name: /^A / }).click(); // Figma shows A chosen
      await expectFrames(page, frames);
      await page.screenshot({ path: `test-results/onboarding-${name}.png` });
    }
  });

  test('a short screen fits the viewport without scrolling', async ({ page }) => {
    await open(page, paths.onboardingTime);
    // +1: AppShell's idle 1px toast live region sits below <main> (shared fix requested).
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844 + 1);
  });
});
