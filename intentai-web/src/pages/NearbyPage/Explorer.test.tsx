import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import AppShell from '../../components/AppShell/AppShell';
import { COLLECTIONS, collection, curatedPlace, members, placesIn } from '../../features/nearby/catalogue';
import { getLocationState } from '../../features/nearby/location';
import { deleteAllData, explorePersonalStore, settingsStore } from '../../data/stores';
import { stateOf } from '../../features/nearby/personal';
import { DEFAULT_SETTINGS } from '../../data/domain';
import { undoToast } from '../../hooks/useToast';
import CollectionDetailPage from './CollectionDetailPage';
import CollectionsPage from './CollectionsPage';
import ExplorePage from './ExplorePage';
import LocationPage from './LocationPage';
import PlaceDetailPage from './PlaceDetailPage';
import SavedPage from './SavedPage';

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path="/nearby" element={<ExplorePage />} />
        <Route path="/nearby/location" element={<LocationPage />} />
        <Route path="/nearby/place/:placeKey" element={<PlaceDetailPage />} />
        <Route path="/nearby/collections" element={<CollectionsPage />} />
        <Route path="/nearby/collections/:collectionId" element={<CollectionDetailPage />} />
        <Route path="/nearby/saved" element={<SavedPage />} />
        <Route path="/nearby/places" element={<AppShell><p>phrase settings</p></AppShell>} />
        <Route path="/ask" element={<AppShell><p>ask page</p></AppShell>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

function mockGeolocation(fix?: { lat: number; lng: number; accuracy: number }, code?: number) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, err?: PositionErrorCallback | null, _o?: PositionOptions) => {
    if (fix) ok({ coords: { latitude: fix.lat, longitude: fix.lng, accuracy: fix.accuracy }, timestamp: 1 } as unknown as GeolocationPosition);
    else err?.({ code: code ?? 1 } as GeolocationPositionError);
  });
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
  return getCurrentPosition;
}

describe('Explore', () => {
  test('first entry: manual Singapore overview, no location request, map and list of real places', () => {
    const getCurrentPosition = mockGeolocation({ lat: 1.28, lng: 103.84, accuracy: 10 });
    renderAt('/nearby');
    expect(screen.getByRole('button', { name: /All of Singapore/ })).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByRole('application', { name: /Map of Singapore places/ })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${placesIn('SG').length} places$`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Local phrases/ })).toBeInTheDocument();
    // Without an origin there are no distances.
    expect(screen.queryByText(/~[\d.]+ k?m/)).not.toBeInTheDocument();
  });

  test("the list button opens Editor's picks; a pick shows only its places, as a checklist, until it is closed", async () => {
    renderAt('/nearby');
    const button = screen.getByRole('button', { name: "Editor's picks" });
    expect(screen.queryByRole('button', { name: 'Food' })).not.toBeInTheDocument(); // no category chips any more
    await userEvent.click(button);
    const panel = screen.getByRole('dialog', { name: "Editor's picks" });
    await userEvent.click(within(panel).getByRole('button', { name: /Hawker centres to know/ }));
    expect(screen.queryByRole('dialog', { name: "Editor's picks" })).not.toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('list=sg-hawker-centres');
    const sheet = screen.getByRole('region', { name: 'Places' });
    expect(within(sheet).getByRole('heading', { level: 1, name: 'Hawker centres to know' })).toBeInTheDocument();
    expect(within(sheet).getByText(/^0 of \d+ checked in$/)).toBeInTheDocument();
    const toggles = within(sheet).getAllByRole('button', { name: /^Check in:/ });
    expect(toggles.length).toBe(collection('sg-hawker-centres')!.memberIds.length);
    await userEvent.click(toggles[0]);
    expect(within(sheet).getByText(/^1 of \d+ checked in$/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Close this list' }));
    expect(screen.getByTestId('where')).not.toHaveTextContent('list=');
    expect(within(sheet).getByRole('heading', { level: 1, name: 'Nearby' })).toBeInTheDocument();
  });

  test("Korean restaurants to know: ten places, each with a dated, linked recognition; Hangul names show in their own language", async () => {
    const list = collection('sg-korean-restaurants')!;
    expect(list.memberIds).toHaveLength(10);
    for (const id of list.memberIds) {
      const p = curatedPlace(id)!;
      expect(p.category).toBe('food');
      expect(p.recognition?.source.url).toMatch(/^https:\/\//);
      expect(p.recognition!.year).toBeGreaterThanOrEqual(2025);
    }
    renderAt('/nearby?list=sg-korean-restaurants&view=list');
    const sheet = screen.getByRole('region', { name: 'Places' });
    expect(within(sheet).getByRole('heading', { level: 1, name: 'Korean restaurants to know' })).toBeInTheDocument();
    expect(within(sheet).getAllByRole('button', { name: /^Check in:/ })).toHaveLength(10);
    expect(within(sheet).getByText('엄용백')).toHaveAttribute('lang', 'ko');
  });

  test('a submitted search needs 2–100 characters and searches only on submit', async () => {
    renderAt('/nearby?view=list');
    const box = screen.getByRole('searchbox', { name: /Search places/ });
    await userEvent.type(box, 'm');
    expect(screen.getByTestId('where')).not.toHaveTextContent('q=');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Type 2–100 characters.');
    await userEvent.type(box, 'erlion');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByTestId('where')).toHaveTextContent('q=merlion');
    expect(screen.getByRole('heading', { name: 'Merlion Park' })).toBeInTheDocument();
  });

  test('full-screen map with a sheet: peek first, the handle opens the list, a selected place opens it halfway', async () => {
    renderAt('/nearby?area=sg-marina-bay');
    const sheet = screen.getByRole('region', { name: 'Places' });
    expect(sheet).toHaveAttribute('data-detent', 'peek');
    expect(within(sheet).getByRole('heading', { level: 1, name: 'Nearby' })).toBeInTheDocument();
    // the phrases for the place picked on the phrase settings (Today's "Near you") are the first row
    expect(within(sheet).getByRole('link', { name: /Local phrases Old Airport Rd Food Centre/ })).toHaveAttribute('href', '/nearby/phrases');
    const handle = screen.getByRole('button', { name: 'Show the list' });
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(handle);
    expect(screen.getByTestId('where')).toHaveTextContent('view=list');
    expect(sheet).toHaveAttribute('data-detent', 'full');
    await userEvent.click(screen.getByRole('button', { name: 'Show the map' }));
    expect(sheet).toHaveAttribute('data-detent', 'peek');
    const card = within(sheet).getAllByRole('button').find((b) => b.closest('h3'))!;
    await userEvent.click(card);
    expect(screen.getByTestId('where')).toHaveTextContent('sel=curated');
    expect(sheet).toHaveAttribute('data-detent', 'half');
  });

  test('dragging the sheet by its header moves the sheet, never the map, and a drag over a button is not a tap', () => {
    renderAt('/nearby?area=sg-marina-bay');
    const sheet = screen.getByRole('region', { name: 'Places' });
    const map = screen.getByRole('application', { name: /Map of Singapore places/ });
    const scale = map.getAttribute('data-scale');
    const where = screen.getByTestId('where').textContent;
    const button = within(sheet).getByRole('link', { name: 'Collections' });
    fireEvent.pointerDown(button, { pointerId: 1, clientY: 700, button: 0 });
    fireEvent.pointerMove(button, { pointerId: 1, clientY: 600 });
    expect(sheet).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(button, { pointerId: 1, clientY: 450 });
    fireEvent.pointerUp(button, { pointerId: 1, clientY: 450 });
    fireEvent.click(button);
    expect(sheet).toHaveAttribute('data-detent', 'half');
    expect(map.getAttribute('data-scale')).toBe(scale);
    expect(screen.getByTestId('where').textContent).toBe(where); // the click after the drag did not open Collections
    expect(screen.queryByRole('button', { name: 'Show places in this area' })).not.toBeInTheDocument();
  });

  test('selecting a card selects the same place on the map (and the other way round)', async () => {
    renderAt('/nearby?area=sg-marina-bay&view=list');
    const pin = () => document.querySelector('[data-pin="curated:sg-merlion-park"]');
    const card = screen.getAllByRole('button', { name: 'Merlion Park' })[0];
    await userEvent.click(card);
    // a row goes to its place: the full list gives way to the map, with the place selected
    expect(screen.getByTestId('where')).toHaveTextContent('sel=curated%3Asg-merlion-park');
    expect(screen.getByTestId('where')).not.toHaveTextContent('view=list');
    expect(screen.getByRole('region', { name: 'Places' })).toHaveAttribute('data-detent', 'half');
    expect(within(screen.getByRole('region', { name: 'Selected place' })).getByText('Merlion Park')).toBeInTheDocument();
    expect(pin()).toHaveAttribute('aria-pressed', 'true');
    // and from the map: another pin selects its card
    const other = document.querySelector<HTMLButtonElement>('[data-pin]:not([data-pin="curated:sg-merlion-park"])')!;
    await userEvent.click(other);
    expect(screen.getByTestId('where')).toHaveTextContent(`sel=${encodeURIComponent(other.dataset.pin!)}`);
  });

  test('a tap on the selected card (or its picture) goes to the place on the map, close up', async () => {
    renderAt('/nearby?sel=curated%3Asg-merlion-park');
    const map = screen.getByRole('application', { name: /Map of Singapore places/ });
    const before = Number(map.getAttribute('data-scale'));
    const sheet = screen.getByRole('region', { name: 'Selected place' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Show Merlion Park on the map' }));
    const after = Number(map.getAttribute('data-scale'));
    expect(after).toBeGreaterThan(before * 4);
    // the card's own buttons keep their job: Check in does not move the map
    await userEvent.click(within(sheet).getByRole('button', { name: 'Check in' }));
    expect(Number(map.getAttribute('data-scale'))).toBe(after);
    // a tap on the card itself goes there again (after the map was zoomed out)
    await userEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(Number(map.getAttribute('data-scale'))).toBeLessThan(after);
    await userEvent.click(within(sheet).getByText('Merlion Park'));
    expect(Number(map.getAttribute('data-scale'))).toBe(after);
  });

  test('View details unfolds the place under its card in the sheet (Explore stays); check in works there', async () => {
    renderAt('/nearby?area=sg-marina-bay&sel=curated%3Asg-merlion-park');
    const sheet = screen.getByRole('region', { name: 'Selected place' });
    const toggle = within(sheet).getByRole('button', { name: 'View details: Merlion Park' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/nearby\?.*info=1/);
    expect(within(sheet).getByRole('button', { name: 'Hide details: Merlion Park' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(sheet).getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(within(sheet).getByRole('heading', { name: 'Culture & language' })).toBeInTheDocument();
    expect(screen.getByRole('application', { name: /Map of Singapore places/ })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Check in' }));
    expect(stateOf(explorePersonalStore.get(), 'curated:sg-merlion-park')).toMatchObject({ visited: true });
    expect(within(sheet).getByRole('link', { name: 'Open as a page' })).toHaveAttribute('href', '/nearby/place/curated%3Asg-merlion-park');
    // another place folds the details
    await userEvent.click(document.querySelector<HTMLButtonElement>('[data-pin]:not([data-pin="curated:sg-merlion-park"])')!);
    expect(screen.getByTestId('where')).not.toHaveTextContent('info=1');
  });

  test('an area search measures distances "from selected area" within the radius', () => {
    renderAt('/nearby?area=sg-chinatown&view=list');
    expect(screen.getByText(/places within 2 km/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chinatown & Tanjong Pagar. Change area/ })).toBeInTheDocument();
    // the sheet names the area; rows show the distance only, never "from you"
    expect(screen.getAllByText(/~[\d.]+ k?m$/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/from you/)).not.toBeInTheDocument();
    expect(screen.queryByText(/from you(?!r)/)).not.toBeInTheDocument();
  });

  test('with location granted: explanation first, then distances "from you"; switching off clears it', async () => {
    const getCurrentPosition = mockGeolocation({ lat: 1.2803, lng: 103.8447, accuracy: 15 });
    renderAt('/nearby?view=list');
    await userEvent.click(screen.getByRole('button', { name: /My location/ }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /Near you/ })).toBeInTheDocument();
    expect(screen.getAllByText(/from you/).length).toBeGreaterThan(0);
    expect(window.location.search).not.toContain('103.84');
    act(() => settingsStore.set({ ...DEFAULT_SETTINGS, location: false }));
    expect(screen.queryByText(/from you(?!r)/)).not.toBeInTheDocument();
  });

  test('an inaccurate fix is labelled approximate and never "from you"', async () => {
    mockGeolocation({ lat: 1.2803, lng: 103.8447, accuracy: 2000 });
    renderAt('/nearby?view=list');
    await userEvent.click(screen.getByRole('button', { name: /My location/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('button', { name: /Approximate location/ })).toBeInTheDocument();
    expect(screen.queryByText(/from you(?!r)/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/~[\d.]+ k?m$/).length).toBeGreaterThan(0);
  });

  test('outside Singapore: manual exploration stays, with an explanation', async () => {
    mockGeolocation({ lat: 3.139, lng: 101.687, accuracy: 10 });
    renderAt('/nearby');
    await userEvent.click(screen.getByRole('button', { name: /My location/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText(/Nearby works in Singapore/)).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /All of Singapore/ })).toBeInTheDocument();
  });

  test('denied permission keeps the browsing path with a useful message', async () => {
    mockGeolocation(undefined, 1);
    renderAt('/nearby');
    await userEvent.click(screen.getByRole('button', { name: /My location/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Location permission is off/)).toBeInTheDocument();
    expect(settingsStore.get().location).toBe(false);
    expect(screen.getByRole('searchbox')).toBeEnabled();
  });
});

describe('Location page', () => {
  test('choosing an area returns to Explore with that area and remembers it', async () => {
    renderAt('/nearby/location');
    await userEvent.click(screen.getByRole('button', { name: 'Chinatown & Tanjong Pagar' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/nearby?area=sg-chinatown');
    expect(explorePersonalStore.get().selectedAreaId).toBe('sg-chinatown');
  });
});

describe('Place detail', () => {
  const key = 'curated:sg-maxwell-food-centre';

  test('shows sourced facts with dates and sources, practical actions and membership', async () => {
    renderAt(`/nearby/place/${key}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Maxwell Food Centre' })).toBeInTheDocument();
    // the cards: a phrase on top; the fact (with its sources) is the next card
    const cards = screen.getByRole('group', { name: 'Culture and language cards for Maxwell Food Centre' });
    expect(within(cards).getByText('Chope')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Maxwell Road Food Centre/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Next card' }));
    expect((await screen.findAllByRole('link', { name: /Maxwell Road Food Centre/ }))[0]).toHaveAttribute('href', expect.stringMatching(/^https:\/\/www\.roots\.gov\.sg\//));
    expect(screen.getByText(/Last reviewed 2026-10-20/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Directions/ })).toHaveAttribute('href', expect.stringContaining('destination=1.2'));
    expect(screen.getByRole('link', { name: /Directions/ }).getAttribute('href')).not.toContain('origin');
    expect(screen.queryByRole('link', { name: /View in 3D/ })).toBeNull();
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'Culture & language' })).toBeInTheDocument();
  });

  test('practical details: hours, address, phone, website, Apple Maps and what people say, each with its page', () => {
    renderAt('/nearby/place/curated:sg-summer-pavilion');
    const details = screen.getByRole('region', { name: 'Details' });
    expect(details).toHaveTextContent('Daily 11:30–14:30, 18:30–22:30');
    expect(details).toHaveTextContent('7 Raffles Avenue, Singapore 039799');
    expect(within(details).getByRole('link', { name: '+65 6434 5286' })).toHaveAttribute('href', 'tel:+6564345286');
    expect(within(details).getByRole('link', { name: /summerpavilion\.com\.sg/ })).toHaveAttribute('href', 'https://www.summerpavilion.com.sg');
    expect(within(details).getByRole('link', { name: /Open in Apple Maps/ }).getAttribute('href')).toMatch(/^https:\/\/maps\.apple\.com\/\?ll=1\.\d+%2C103\.\d+&q=Summer\+Pavilion$/);
    expect(within(details).getByRole('link', { name: /MICHELIN Guide: .* \(opens the site\)/ })).toHaveAttribute('href', expect.stringContaining('guide.michelin.com'));
    expect(details).toHaveTextContent(/MICHELIN inspectors praise/);
    // the same page for four details is one source line
    expect(within(details).getAllByText((_, el) => el?.tagName === 'P' && /^Hours, Address, Phone, Website, What people say: Summer Pavilion/.test(el.textContent ?? ''))).toHaveLength(1);
  });

  test('a place that a Today article names shows that article in its culture cards', () => {
    renderAt('/nearby/place/curated:sg-sultan-mosque');
    const cards = screen.getByRole('group', { name: 'Culture and language cards for Sultan Mosque' });
    expect(within(cards).getByText('Culture · from Today')).toBeInTheDocument();
    expect(within(cards).getByText('A landmark mosque first built in the 1820s for Sultan Hussein Shah.')).toBeInTheDocument();
  });

  test('a place with nothing confirmed still gets Apple Maps, and no empty rows', () => {
    renderAt('/nearby/place/curated:sg-coleman-bridge');
    const details = screen.getByRole('region', { name: 'Details' });
    expect(within(details).getAllByRole('listitem')).toHaveLength(1);
    expect(within(details).getByRole('link', { name: /Open in Apple Maps/ })).toBeInTheDocument();
  });

  test('a dataset-only place says it has no sourced facts instead of inventing one', () => {
    renderAt('/nearby/place/curated:sg-capitaspring');
    expect(screen.getByText(/No sourced fun facts yet/)).toBeInTheDocument();
    expect(screen.getByText(/from the EARTH ONLINE Singapore dataset/)).toBeInTheDocument();
  });

  test('Save and Visited are independent; Undo restores exactly; Directions does not visit', async () => {
    renderAt(`/nearby/place/${key}`);
    await userEvent.click(screen.getByRole('link', { name: /Directions/ }));
    expect(explorePersonalStore.get().places).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Check in' }));
    expect(explorePersonalStore.get().places[0]).toMatchObject({ placeKey: key, saved: false, visited: true });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(explorePersonalStore.get().places[0]).toMatchObject({ saved: true, visited: true });
    act(() => undoToast());
    expect(explorePersonalStore.get().places[0]).toMatchObject({ saved: false, visited: true });
  });

  test('a future visit date is refused', async () => {
    renderAt(`/nearby/place/${key}`);
    await userEvent.click(screen.getByRole('button', { name: 'Check in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Change date' }));
    fireEvent.change(screen.getByLabelText(/Check-in date/), { target: { value: '2999-01-01' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save date' }));
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be in the future');
  });

  test('an unknown or malformed id has a useful not-found state', () => {
    renderAt('/nearby/place/curated:sg-no-such-place');
    expect(screen.getByRole('heading', { name: 'Place not found' })).toBeInTheDocument();
    renderAt('/nearby/place/%3Cscript%3E');
    expect(screen.getAllByRole('heading', { name: 'Place not found' })).toHaveLength(2);
  });
});

describe('Collections', () => {
  const c = COLLECTIONS[0];

  test('cards show the honest draft title, real count and progress', () => {
    const [first] = members(c);
    explorePersonalStore.set((d) => ({ ...d, places: [{ placeKey: first.id, saved: false, visited: true, updatedAt: new Date().toISOString() }] }));
    renderAt('/nearby/collections');
    expect(screen.getByRole('heading', { name: 'Singapore collection · 100 places' })).toBeInTheDocument();
    expect(screen.getByText('1 of 100 checked in')).toBeInTheDocument();
    expect(screen.queryByText('100 Places to Explore in Singapore')).not.toBeInTheDocument();
  });

  test('filters never change the denominator; marking visited updates it once', async () => {
    renderAt(`/nearby/collections/${c.id}?category=food`);
    expect(screen.getByText('0 of 100 checked in')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /^Check in:/ });
    expect(buttons.length).toBeLessThan(100);
    await userEvent.click(buttons[0]);
    expect(screen.getByText('1 of 100 checked in')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Checked in' }));
    expect(screen.getByText(/Showing 1 of 100/)).toBeInTheDocument();
    expect(screen.getByText('1 of 100 checked in')).toBeInTheDocument();
  });

  test('region and order fold behind "More filters", which counts the ones that are on', async () => {
    renderAt(`/nearby/collections/${c.id}`);
    const more = screen.getByRole('button', { name: 'More filters' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/Region/)).not.toBeInTheDocument();
    await userEvent.click(more);
    const region = screen.getByLabelText(/Region/) as HTMLSelectElement;
    await userEvent.selectOptions(region, region.options[1].value);
    expect(screen.getByRole('button', { name: 'More filters (1 on)' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Showing \d+ of 100/)).toBeInTheDocument();
  });

  test('reaching 10% shows one small acknowledgement', async () => {
    const ids = members(c).slice(0, 9).map((p) => p.id);
    explorePersonalStore.set((d) => ({ ...d, places: ids.map((placeKey) => ({ placeKey, saved: false, visited: true, updatedAt: new Date().toISOString() })) }));
    renderAt(`/nearby/collections/${c.id}?visit=todo`);
    await userEvent.click(screen.getAllByRole('button', { name: /^Check in:/ })[0]);
    expect(screen.getByText(/10% of this collection checked in/)).toBeInTheDocument();
    expect(explorePersonalStore.get().milestonesSeen).toEqual({ [c.id]: [10] }); // an editor's pick only counts the whole list
    // Undo takes the visit and the acknowledgement back; reaching 10% again shows it again.
    act(() => undoToast());
    expect(screen.queryByText(/10% of this collection checked in/)).not.toBeInTheDocument();
    expect(explorePersonalStore.get().milestonesSeen).toBeUndefined();
  });
});

describe('Saved and deletion', () => {
  test('saved and visited lists, empty guidance and removal', async () => {
    renderAt('/nearby/saved');
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  test('import shows a preview before merging and keeps existing state', async () => {
    renderAt('/nearby/saved');
    const file = new File(
      [JSON.stringify({ format: 'intentai-explore-personal', schemaVersion: 1, places: [{ placeKey: 'curated:sg-merlion-park', saved: true, visited: false, updatedAt: '2026-10-01T00:00:00.000Z' }, { placeKey: 'curated:sg-gone', saved: true, visited: false, updatedAt: '2026-10-01T00:00:00.000Z' }] })],
      'backup.json',
      { type: 'application/json' },
    );
    await userEvent.upload(screen.getByLabelText('Backup file'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Restore this backup?' });
    expect(dialog).toHaveTextContent('2 records: 2 new saved');
    expect(dialog).toHaveTextContent(/not in this catalogue/);
    expect(explorePersonalStore.get().places).toEqual([]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));
    expect(explorePersonalStore.get().places.map((p) => p.placeKey).sort()).toEqual(['curated:sg-gone', 'curated:sg-merlion-park']);
    expect(screen.getByText('Place not in this catalogue')).toBeInTheDocument();
  });

  test('a bad backup is refused without touching saved places', async () => {
    renderAt('/nearby/saved');
    await userEvent.upload(screen.getByLabelText('Backup file'), new File(['{oops'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByRole('dialog', { name: 'Could not restore' })).toHaveTextContent('not valid JSON');
  });

  test('Delete all my data clears exploration and location, and Undo cannot bring it back', async () => {
    mockGeolocation({ lat: 1.2803, lng: 103.8447, accuracy: 15 });
    renderAt('/nearby/place/curated:sg-merlion-park');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(explorePersonalStore.get().places).toHaveLength(1);
    act(() => deleteAllData());
    expect(explorePersonalStore.get().places).toEqual([]);
    expect(getLocationState()).toEqual({ status: 'manual' });
    act(() => undoToast());
    expect(explorePersonalStore.get().places).toEqual([]);
  });
});
