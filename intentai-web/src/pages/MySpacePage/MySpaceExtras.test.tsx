// Features ported from Team 1's PR #5 into our My Space: text size, Nearby radius, Today's topics, the Licences page,
// page-timing opt-out, data export, dependent switches, the header title and the privacy summary card.
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import placePhotos from '../../data/explore/photos.json';
import { curatedPlace } from '../../features/nearby/catalogue';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { DEFAULT_MY_SPACE_PREFS, mySpacePrefsStore, profileV3Store, repairMySpacePrefs } from '../../data/profile/profile';
import { exportData } from '../../data/profile/storage';
import { culturePrefsStore, openedCardsStore, settingsStore } from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { send } from '../../usage/appTracker';
import type { UsageEvent } from '../../usage/event';
import { readLocalUsage } from '../../usage/localLog';
import { creditGroups } from './LicencesPage';
import { NEEDS_LOCAL, NEEDS_OCCASIONS, TEXT_PREVIEW } from './SettingsPage';
import { currentPath, renderAt } from './testUtils';

afterEach(() => {
  act(() => dismissToast());
  document.documentElement.style.fontSize = '';
  vi.unstubAllGlobals();
});

test('Text size: the slider shows a live preview, applies to <html> app-wide and is kept', () => {
  renderAt(paths.mySpaceSettings);
  const slider = screen.getByRole('slider', { name: 'Text size' });
  expect(slider).toHaveAttribute('aria-valuetext', 'Default');
  expect(document.documentElement.style.fontSize).toBe('');
  expect(screen.getByTestId('text-preview')).toHaveTextContent(TEXT_PREVIEW);

  fireEvent.change(slider, { target: { value: '3' } });
  expect(slider).toHaveAttribute('aria-valuetext', 'Larger');
  expect(mySpacePrefsStore.get().textSize).toBe(3);
  expect(document.documentElement.style.fontSize).toBe('120%');
  expect(screen.getByTestId('text-preview').style.fontSize).toBe('1.125rem');
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}my-space-prefs`)!).textSize).toBe(3);

  // Applied on every page, not only Settings.
  act(() => mySpacePrefsStore.set((p) => ({ ...p, textSize: 0 })));
  expect(document.documentElement.style.fontSize).toBe('90%');
  fireEvent.change(slider, { target: { value: '1' } });
  expect(document.documentElement.style.fontSize).toBe('');
});

test('Nearby radius: the slider steps through Explore’s radii and is persisted', () => {
  renderAt(paths.mySpaceSettings);
  const slider = screen.getByRole('slider', { name: 'Nearby radius' });
  expect(slider).toHaveAttribute('aria-valuetext', '2 kilometres');
  fireEvent.change(slider, { target: { value: '2' } });
  expect(mySpacePrefsStore.get().radiusM).toBe(3000);
  expect(slider).toHaveAttribute('aria-valuetext', '3 kilometres');
  expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}my-space-prefs`)!).radiusM).toBe(3000);
});

test('older stored preferences keep their choices and gain the new defaults', () => {
  const old = { notify: { localAnswers: true, recaps: false, occasions: false, nearYou: false }, notifyTime: 'morning', captions: false, haptics: true };
  expect(repairMySpacePrefs(old)).toEqual({ ...DEFAULT_MY_SPACE_PREFS, ...old });
  expect(repairMySpacePrefs({ ...old, usageTiming: false, radiusM: 7 })).toMatchObject({ usageTiming: false, radiusM: DEFAULT_MY_SPACE_PREFS.radiusM });
  expect(repairMySpacePrefs('x')).toBeNull();
});

test('Today’s topics shows the saved topics and opens the ranked topic editor', async () => {
  culturePrefsStore.set({ categories: ['foods', 'monuments', 'holidays'] });
  renderAt(paths.mySpaceSettings);
  const row = screen.getByRole('button', { name: /Today’s topics/ });
  expect(row).toHaveTextContent(/Foods.*Monuments/);
  await userEvent.click(row);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('dependent switches wait for their My Space switch, with the reason', async () => {
  settingsStore.set((s) => ({ ...s, occasions: false, local: false }));
  renderAt(paths.mySpaceSettings);
  const occasions = screen.getByRole('switch', { name: 'Occasions' });
  const near = screen.getByRole('switch', { name: 'Questions near you' });
  expect(occasions).toHaveAttribute('aria-disabled', 'true');
  expect(occasions).toHaveAccessibleDescription(NEEDS_OCCASIONS);
  expect(near).toHaveAttribute('aria-disabled', 'true');
  expect(near).toHaveAccessibleDescription(NEEDS_LOCAL);
  await userEvent.click(near);
  expect(mySpacePrefsStore.get().notify.nearYou).toBe(false);
  expect(screen.getByRole('status')).toHaveTextContent(NEEDS_LOCAL);
  // Independent ones are never blocked.
  expect(screen.getByRole('switch', { name: 'Local answers' })).not.toHaveAttribute('aria-disabled');

  act(() => settingsStore.set((s) => ({ ...s, local: true })));
  expect(near).not.toHaveAttribute('aria-disabled');
  await userEvent.click(near);
  expect(mySpacePrefsStore.get().notify.nearYou).toBe(true);
  expect(near).toHaveAttribute('aria-checked', 'true');
  // Turning the dependency off shows it off again; the choice is kept for later.
  act(() => settingsStore.set((s) => ({ ...s, local: false })));
  expect(near).toHaveAttribute('aria-checked', 'false');
  expect(mySpacePrefsStore.get().notify.nearYou).toBe(true);
});

test('Licences page lists the map, culture-card, place-story, Nearby place-photo and community credits', () => {
  renderAt(paths.licences);
  expect(screen.getByRole('heading', { level: 1, name: 'Terms & licences' })).toBeInTheDocument();
  for (const title of ['Maps', 'Culture cards', 'Place stories', 'Home places', 'Nearby places', 'Community']) {
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
  }
  expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument();
  const nearby = within(screen.getByRole('region', { name: 'Nearby places' }));
  const photos = Object.entries((placePhotos as { photos: Record<string, { credit: string; source: string }> }).photos);
  expect(photos.length).toBeGreaterThan(0);
  for (const [id, p] of photos.slice(0, 5)) {
    expect(nearby.getAllByText(curatedPlace(id)?.name ?? id).length).toBeGreaterThan(0);
    expect(nearby.getAllByRole('link', { name: `${p.credit}, via Wikimedia Commons` })[0]).toHaveAttribute('href', p.source);
  }
  const community = within(screen.getByRole('region', { name: 'Community' }));
  expect(community.getByRole('link', { name: /DiceBear “Notionists”/ })).toBeInTheDocument();
  expect(community.getByText(/community card kit: AI-generated illustrations/)).toBeInTheDocument();
  expect(community.getByText(/illustrative community members/)).toBeInTheDocument();
  expect(screen.getAllByText('Photo: Zairon · CC BY-SA 4.0').length).toBeGreaterThan(0);
  // Every group has entries.
  for (const g of creditGroups()) expect(g.items.length, g.title).toBeGreaterThan(0);
});

test('Export my data downloads one JSON file with our stores', async () => {
  openedCardsStore.set(['laksa']);
  profileV3Store.set((p) => ({ ...p, from: 'CN' }));
  mySpacePrefsStore.set((p) => ({ ...p, textSize: 2 }));
  const data = exportData() as { app: string; data: Record<string, unknown> };
  expect(data.app).toBe('IntentAI');
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
  expect(card).toHaveTextContent(/on this phone only/);
  expect(card.querySelector('[aria-hidden="true"] > span')).not.toBeNull();
  await userEvent.click(card);
  expect(currentPath()).toBe(paths.mySpacePrivacy);
});
