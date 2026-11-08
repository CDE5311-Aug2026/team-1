// Features ported from Team 1's PR #5 into our My Space: text size (the Nearby radius is retired), the Licences page,
// page-timing opt-out, data export, the header title and the privacy summary card.
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import placePhotos from '../../data/explore/photos.json';
import { curatedPlace } from '../../features/nearby/catalogue';
import { STORAGE_PREFIX, resetPersistentStores } from '../../data/persistentStore';
import { DEFAULT_MY_SPACE_PREFS, mySpacePrefsStore, profileV3Store, repairMySpacePrefs } from '../../data/profile/profile';
import { exportData } from '../../data/profile/storage';
import { openedCardsStore } from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { send } from '../../usage/appTracker';
import type { UsageEvent } from '../../usage/event';
import { readLocalUsage } from '../../usage/localLog';
import { todaysHoliday } from '../../data/holiday';
import { creditGroups } from './LicencesPage';
import { placePhotoGroups } from './CreditsPage';
import { TOURISM_INFO } from '../../data/tourism';
import { currentPath, renderAt } from './testUtils';

afterEach(() => {
  act(() => dismissToast());
  document.documentElement.style.fontSize = '';
  vi.unstubAllGlobals();
});

test('Text size page: the steps are radios, the preview scales live, the size applies to <html> app-wide and is kept', async () => {
  renderAt(paths.mySpaceTextSize);
  expect(screen.getByRole('heading', { level: 1, name: 'Text size' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Default' })).toHaveAttribute('aria-checked', 'true');
  expect(document.documentElement.style.fontSize).toBe('');
  expect(screen.getByText(/scales the app’s text/)).toBeInTheDocument();
  expect(screen.queryByText(/Dynamic Type/)).toBeNull();

  await userEvent.click(screen.getByRole('radio', { name: 'Larger' }));
  expect(screen.getByRole('radio', { name: 'Larger' })).toHaveAttribute('aria-checked', 'true');
  expect(mySpacePrefsStore.get().textSize).toBe(3);
  expect(document.documentElement.style.fontSize).toBe('120%');
  expect(screen.getByTestId('text-preview').style.fontSize).toBe('1.05rem');
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}my-space-prefs`)!).textSize).toBe(3);

  // The largest step (plan B6 screenshot) and back to Default.
  await userEvent.click(screen.getByRole('radio', { name: 'Largest' }));
  expect(document.documentElement.style.fontSize).toBe('130%');
  act(() => mySpacePrefsStore.set((p) => ({ ...p, textSize: 0 })));
  expect(document.documentElement.style.fontSize).toBe('90%');
  await userEvent.click(screen.getByRole('radio', { name: 'Default' }));
  expect(document.documentElement.style.fontSize).toBe('');
});

test('Settings › Text size shows the chosen size and opens its page', async () => {
  mySpacePrefsStore.set((p) => ({ ...p, textSize: 2 }));
  renderAt(paths.mySpaceSettings);
  const row = screen.getByRole('link', { name: /Text size/ });
  expect(row).toHaveTextContent('Large');
  await userEvent.click(row);
  expect(currentPath()).toBe(paths.mySpaceTextSize);
});

test('Settings has no Nearby radius any more (the v1 explorer, its only reader, is retired)', () => {
  renderAt(paths.mySpaceSettings);
  expect(screen.queryByRole('slider', { name: 'Nearby radius' })).toBeNull();
  expect(screen.queryByText(/kilometres|\d km$/)).toBeNull();
  expect(DEFAULT_MY_SPACE_PREFS).not.toHaveProperty('radiusM');
});

test('older stored preferences keep their choices and gain the new defaults', () => {
  const old = { notify: { localAnswers: true, recaps: false, occasions: false, nearYou: false }, notifyTime: 'morning', captions: false, haptics: true };
  expect(repairMySpacePrefs(old)).toEqual({ ...DEFAULT_MY_SPACE_PREFS, ...old });
  expect(repairMySpacePrefs('x')).toBeNull();
});

test('a stored record from before 8 Nov 2026 still loads: its radiusM is dropped, every other choice kept', () => {
  const stored = { ...DEFAULT_MY_SPACE_PREFS, captions: false, haptics: true, textSize: 3, usageTiming: false, radiusM: 3000 };
  const repaired = repairMySpacePrefs(stored);
  expect(repaired).toEqual({ ...DEFAULT_MY_SPACE_PREFS, captions: false, haptics: true, textSize: 3, usageTiming: false });
  expect(repaired).not.toHaveProperty('radiusM');
  // an odd radius (never valid) does not sink the record either
  expect(repairMySpacePrefs({ ...stored, radiusM: 7 })).toMatchObject({ usageTiming: false, textSize: 3 });
  // through the store: the record is read (not reset to the defaults) and comes back without the field
  localStorage.setItem(`${STORAGE_PREFIX}my-space-prefs`, JSON.stringify(stored));
  resetPersistentStores();
  const fresh = mySpacePrefsStore.get();
  expect(fresh).toMatchObject({ captions: false, haptics: true, textSize: 3, usageTiming: false });
  expect(fresh).not.toHaveProperty('radiusM');
});

test('Terms & licences: the prototype note, maps, content and terms; photo credits are one link away', async () => {
  renderAt(paths.licences);
  expect(screen.getByRole('heading', { level: 1, name: 'Terms & licences' })).toBeInTheDocument();
  for (const title of ['Maps', 'Content', 'Terms']) expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /student prototype/ })).toBeInTheDocument();
  expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Master Plan 2019/ })).toHaveAttribute('href', expect.stringContaining('data.gov.sg'));
  const content = within(screen.getByRole('region', { name: 'Content' }));
  expect(content.getByRole('link', { name: /DiceBear “Notionists”/ })).toBeInTheDocument();
  expect(content.getByText(/community card kit: AI-generated illustrations/)).toBeInTheDocument();
  expect(content.getByText(/illustrative community members/)).toBeInTheDocument();
  // No claim the app does not keep: nothing about hunters seeing your position.
  expect(screen.queryByText(/live position/)).toBeNull();
  await userEvent.click(screen.getByRole('link', { name: /Place photos/ }));
  expect(currentPath()).toBe(paths.credits);
});

test('Photo credits: Nearby place photos by Tourism 2040 category, then every other photo group', () => {
  renderAt(paths.credits);
  expect(screen.getByRole('heading', { level: 1, name: 'Photo credits' })).toBeInTheDocument();
  const photos = Object.entries((placePhotos as { photos: Record<string, { credit: string; source: string }> }).photos);
  expect(photos.length).toBeGreaterThan(0);
  // Every Nearby photo is listed once, under its place's category, linked to its source.
  const groups = placePhotoGroups();
  expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(photos.length);
  for (const g of groups) {
    const region = within(screen.getByRole('region', { name: g.title }));
    expect(region.getByText(`${g.items.length} ${g.items.length === 1 ? 'photo' : 'photos'}`)).toBeInTheDocument();
  }
  for (const [id, p] of photos.slice(0, 5)) {
    const place = curatedPlace(id);
    const title = (place && place.tourism && TOURISM_INFO[place.tourism.category].label) ?? 'Other places';
    const region = within(screen.getByRole('region', { name: title }));
    expect(region.getAllByText(place?.name ?? id).length).toBeGreaterThan(0);
    expect(region.getAllByRole('link', { name: p.credit }).some((a) => a.getAttribute('href') === p.source)).toBe(true);
  }
  for (const title of ['Culture cards', 'Place stories', 'Home places']) expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
  expect(screen.getAllByText('Photo: Zairon · CC BY-SA 4.0').length).toBeGreaterThan(0);
  // Every group has entries.
  for (const g of creditGroups()) expect(g.items.length, g.title).toBeGreaterThan(0);
  // Home shows this photo with no room for a line of its own
  expect(creditGroups().flatMap((g) => g.items).map((c) => c.credit)).toContain(todaysHoliday.image.credit);
  expect(screen.getAllByText(todaysHoliday.image.credit).length).toBeGreaterThan(0);
});

test('Export my data downloads one JSON file with our stores', async () => {
  openedCardsStore.set(['laksa']);
  profileV3Store.set((p) => ({ ...p, from: 'CN' }));
  mySpacePrefsStore.set((p) => ({ ...p, textSize: 2 }));
  const data = exportData() as { app: string; data: Record<string, unknown> };
  expect(data.app).toBe('FindSG');
  expect(data.data['opened-cards']).toEqual(['laksa']);
  expect((data.data['profile-v3'] as { from: string }).from).toBe('CN');
  expect((data.data['my-space-prefs'] as { textSize: number }).textSize).toBe(2);

  const blobs: Blob[] = [];
  vi.stubGlobal('URL', { ...URL, createObjectURL: (b: Blob) => (blobs.push(b), 'blob:x'), revokeObjectURL: () => {} });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  renderAt(paths.mySpacePrivacy);
  await userEvent.click(screen.getByRole('button', { name: /Export my data/ }));
  expect(click).toHaveBeenCalledTimes(1);
  expect(blobs[0].type).toBe('application/json');
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blobs[0]);
  });
  const file = JSON.parse(text);
  expect(file.data['opened-cards']).toEqual(['laksa']);
  click.mockRestore();
});

test('Anonymous page timing: switching it off stops sending; the device copy stays', async () => {
  const beacon = vi.fn(() => true);
  const fetchFn = vi.fn(() => Promise.resolve(new Response()));
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
  vi.stubGlobal('fetch', fetchFn);
  const event: UsageEvent = { uid: 'u', sid: 's', kind: 'page', name: 'Today', ms: 1000, at: 1 };

  renderAt(paths.mySpacePrivacy);
  const timing = screen.getByRole('switch', { name: 'Anonymous page timing' });
  expect(timing).toHaveAttribute('aria-checked', 'true');
  expect(timing).toHaveAccessibleDescription(/We record how long you spend on each page/);
  send([event]);
  expect(beacon).toHaveBeenCalledTimes(1);

  await userEvent.click(timing);
  expect(mySpacePrefsStore.get().usageTiming).toBe(false);
  expect(screen.getByText(/Nothing leaves it: anonymous page timing is off/)).toBeInTheDocument();
  send([event]);
  expect(beacon).toHaveBeenCalledTimes(1);
  expect(fetchFn).not.toHaveBeenCalled();
  expect(readLocalUsage()).toHaveLength(2);
});

test('S1: the top bar names the page (Passport) beside your avatar; the privacy card shows size and the storage bar', async () => {
  renderAt(paths.mySpace);
  const h1 = screen.getByRole('heading', { level: 1, name: 'Passport' });
  expect(h1).toBeVisible();
  const card = screen.getByRole('link', { name: /Privacy & data/ });
  expect(card).toHaveTextContent(/on this phone/);
  expect(card.querySelector('[aria-hidden="true"] > span')).not.toBeNull();
  await userEvent.click(card);
  expect(currentPath()).toBe(paths.mySpacePrivacy);
});
