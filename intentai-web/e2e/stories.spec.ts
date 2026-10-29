import { expect, test } from './test';
import type { Page } from './test';

// Place stories: Home -> place page (Album Rail) -> culture cards -> passport stamp.
// Reduced motion is emulated wherever a test asserts the rail's front card, so autoplay is off and the rail snaps.

const BERLIN = 'berlin-wall-fragments';
const SLIDER = 'Compare the temple in 1890 and 2006';

const carousel = (page: Page) => page.getByTestId('nearby-carousel');
const homeCard = (page: Page, name: string) => carousel(page).getByRole('group', { name, exact: true });
/** The rail's front sleeve is the only one whose name carries the record state. */
const front = (page: Page) => page.getByRole('button', { name: /Tap to slide the record out|Record out/ });
const next = (page: Page, facet: string) => page.getByRole('link', { name: new RegExp(`^NEXT · ${facet.toUpperCase()}`) });

async function openHome(page: Page) {
  await page.goto('/');
  await expect(carousel(page).getByRole('group')).toHaveCount(5);
}

/** Home -> search dropdown -> Chinatown card -> its Open button. Lands on the place page. */
async function openChinatownFromHome(page: Page) {
  await openHome(page);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search a place or area' }).fill('pagoda');
  await page.getByRole('button', { name: /^Chinatown/ }).click();
  await expect(homeCard(page, 'Chinatown')).toHaveAttribute('aria-current', 'true');
  await homeCard(page, 'Chinatown').getByRole('button', { name: /^Open/ }).click();
  await expect(page).toHaveURL(/\/place\/chinatown$/);
}

test.describe('place flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('a fresh place visit opens the rail on card 2 (Monument)', async ({ page }) => {
    await page.goto(`/place/${BERLIN}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Berlin Wall Fragments' })).toBeVisible();
    await expect(front(page)).toHaveAccessibleName(/^Monument card/);
    await expect(page.getByText('0 of 4 cards opened')).toBeVisible();
  });

  test('browser Back: Food -> NEXT x3 -> History; Back returns to the place on History, then Home on that place', async ({ page }) => {
    await openChinatownFromHome(page);
    await page.getByRole('button', { name: 'Previous card' }).click();
    await expect(front(page)).toHaveAccessibleName(/^Food card/);
    await page.getByRole('link', { name: 'Open card' }).click();
    await expect(page).toHaveURL(/\/place\/chinatown\/food$/);

    for (const facet of ['monument', 'festival', 'history']) {
      await next(page, facet).click();
      await expect(page).toHaveURL(new RegExp(`/place/chinatown/${facet}$`));
    }

    await page.goBack();
    await expect(page).toHaveURL(/\/place\/chinatown$/);
    await expect(front(page)).toHaveAccessibleName(/^History card/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(homeCard(page, 'Chinatown')).toHaveAttribute('aria-current', 'true');
  });

  test('Berlin: Open -> Food -> NEXT x3 -> collect stamp -> passport; back navigation restores the rail and Home', async ({ page }) => {
    await openHome(page);
    await expect(homeCard(page, 'Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
    await homeCard(page, 'Berlin Wall Fragments').getByRole('button', { name: /^Open/ }).click();
    await expect(page).toHaveURL(new RegExp(`/place/${BERLIN}$`));

    await page.getByRole('button', { name: 'Previous card' }).click();
    await expect(front(page)).toHaveAccessibleName(/^Food card/);
    await page.getByRole('link', { name: 'Open card' }).click();
    await expect(page).toHaveURL(new RegExp(`/place/${BERLIN}/food$`));
    await expect(page.getByText('1 of 4', { exact: true })).toBeVisible();

    for (const facet of ['monument', 'festival', 'history']) {
      await next(page, facet).click();
      await expect(page).toHaveURL(new RegExp(`/place/${BERLIN}/${facet}$`));
    }
    await expect(page.getByText('4 of 4', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Collect stamp' }).click();
    const passport = page.getByRole('link', { name: /Stamped · see passport/ });
    await expect(passport).toBeFocused();
    await passport.click();
    await expect(page).toHaveURL(/\/moments$/);
    await expect(page.getByRole('list', { name: 'Place stories' }).getByRole('link', { name: /Berlin Wall Fragments/ })).toBeVisible();

    // Back to the card, then the place (rail on History), then Home on Berlin.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/place/${BERLIN}/history$`));
    await expect(page.getByRole('link', { name: /Stamped · see passport/ })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/place/${BERLIN}$`));
    await expect(front(page)).toHaveAccessibleName(/^History card/);
    await expect(page.getByText('4 of 4 cards opened')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(homeCard(page, 'Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
    await expect(homeCard(page, 'Berlin Wall Fragments')).toContainText('4 of 4 opened');
  });

  test('Home hero row opens the Fall of the Wall card', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /The Berlin Wall fell 37 years ago/ }).click();
    await expect(page).toHaveURL(new RegExp(`/place/${BERLIN}/festival$`));
    await expect(page.getByRole('heading', { level: 1, name: /Fall of the Wall/ })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(homeCard(page, 'Berlin Wall Fragments')).toHaveAttribute('aria-current', 'true');
  });

  test('Chinatown via search: Monument then/now slider works from the keyboard', async ({ page }) => {
    await openChinatownFromHome(page);
    await expect(front(page)).toHaveAccessibleName(/^Monument card/);
    await page.getByRole('link', { name: 'Open card' }).click();
    await expect(page).toHaveURL(/\/place\/chinatown\/monument$/);

    const slider = page.getByRole('slider', { name: SLIDER });
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '95');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '75');
    await expect(slider).toHaveAttribute('aria-valuetext', '75% of the 1890 photo shown');
  });

  test('progress: "N of 4 opened" on Home after two cards, and a reload keeps it', async ({ page }) => {
    await page.goto(`/place/${BERLIN}/food`);
    await expect(page.getByText('1 of 4', { exact: true })).toBeVisible();
    await page.goto(`/place/${BERLIN}/monument`);
    await expect(page.getByText('2 of 4', { exact: true })).toBeVisible();

    await openHome(page);
    await expect(homeCard(page, 'Berlin Wall Fragments')).toContainText('2 of 4 opened');
    await page.reload();
    await expect(carousel(page).getByRole('group')).toHaveCount(5);
    await expect(homeCard(page, 'Berlin Wall Fragments')).toContainText('2 of 4 opened');

    await homeCard(page, 'Berlin Wall Fragments').getByRole('button', { name: /^Open/ }).click();
    await expect(page.getByText('2 of 4 cards opened')).toBeVisible();
  });

  test('states: read more expands, the video plays and pauses, the stamp survives a reload', async ({ page }) => {
    await page.goto('/place/chinatown/monument');
    const more = page.getByText('Read more', { exact: true });
    await more.click();
    await expect(page.getByText('Show less', { exact: true })).toBeVisible();
    await expect(page.locator('details[open]')).toHaveCount(1);

    // Mock video: "playing" is the play/pause button state.
    await page.getByRole('button', { name: /^Play video/ }).click();
    await expect(page.getByTestId('now-playing')).toBeVisible();
    await page.getByRole('button', { name: 'Pause video' }).click();
    await expect(page.getByTestId('now-playing')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Play video/ })).toBeVisible();

    await page.goto('/place/chinatown/history');
    await page.getByRole('button', { name: 'Collect stamp' }).click();
    await expect(page.getByRole('link', { name: /Stamped · see passport/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: /Stamped · see passport/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Collect stamp' })).toHaveCount(0);
  });

  test('search open: the dropdown lists the places with cards and Escape closes it', async ({ page }) => {
    await openHome(page);
    await page.getByRole('button', { name: /Change search point$/ }).click();
    await expect(page.getByRole('textbox', { name: 'Search a place or area' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'PLACES WITH CARDS' }).getByRole('listitem')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: 'Search a place or area' })).toBeHidden();
  });

  test('reduced motion: the rail does not autoplay to another card', async ({ page }) => {
    await page.goto('/place/chinatown');
    await expect(front(page)).toHaveAccessibleName(/^Monument card/);
    await page.waitForTimeout(4600);
    await expect(front(page)).toHaveAccessibleName(/^Monument card/);
  });

  test('unknown place and unknown card show the not-found page', async ({ page }) => {
    await page.goto('/place/unknown-place');
    await expect(page.getByRole('heading', { level: 1, name: 'Place not found' })).toBeVisible();
    await page.goto('/place/chinatown/unknown');
    await expect(page.getByRole('heading', { level: 1, name: 'Place not found' })).toBeVisible();
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('dragging the rail with a finger moves to a later card; tapping Next card steps once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/place/chinatown');
    await expect(front(page)).toHaveAccessibleName(/^Monument card/);

    // The rail listens to pointer events: send a slow touch-type drag from right to left across the stage.
    await page.locator('[data-rail-stage]').evaluate(async (stage) => {
      const r = stage.getBoundingClientRect();
      const y = r.top + r.height / 2;
      const x0 = r.left + r.width / 2 + 40;
      const fire = (type: string, x: number) =>
        stage.dispatchEvent(
          new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y }),
        );
      fire('pointerdown', x0);
      for (let i = 1; i <= 8; i += 1) {
        await new Promise((res) => setTimeout(res, 40));
        fire('pointermove', x0 - i * 10);
      }
      fire('pointerup', x0 - 80);
    });
    await expect(front(page)).toHaveAccessibleName(/^(Festival|History) card/);

    const before = await front(page).getAttribute('aria-label');
    await page.getByRole('button', { name: 'Previous card' }).tap();
    await expect(front(page)).not.toHaveAttribute('aria-label', before!);
  });
});
