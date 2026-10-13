import type { Page } from '@playwright/test';
import { ALL_STATIC_PATHS, paths } from '../src/routes';

// Every route in the app, plus one seeded community question.
export const ROUTES = [...ALL_STATIC_PATHS, paths.question('sabo')];

// Notice screens exist only while the occasion notice is live; seed the state each one needs.
const SETTINGS_OCCASIONS_ON = JSON.stringify({ daily: false, occasions: true, local: false, rehearse: false, judgement: false, location: false });
const noticeState = (status: string) =>
  JSON.stringify({ status, dismissed: false, occasion: 'Team dinner', with: 'Colleagues and manager' });
const STATE: Record<string, Record<string, string>> = {
  [paths.noticeDetails]: { settings: SETTINGS_OCCASIONS_ON, notices: noticeState('pending') },
  [paths.noticeEdit]: { settings: SETTINGS_OCCASIONS_ON, notices: noticeState('pending') },
  [paths.noticeConfirmed]: { settings: SETTINGS_OCCASIONS_ON, notices: noticeState('confirmed') },
  [paths.noticeRejected]: { settings: SETTINGS_OCCASIONS_ON, notices: noticeState('rejected') },
};

/** Seeds the stored state `route` needs to render instead of redirecting. Call after a first goto. */
export async function seed(page: Page, route: string) {
  const entries = STATE[route];
  await page.evaluate((e) => {
    for (const key of ['settings', 'notices']) localStorage.removeItem(`intentai:v1:${key}`);
    for (const [key, value] of Object.entries(e ?? {})) localStorage.setItem(`intentai:v1:${key}`, value);
  }, entries);
}
