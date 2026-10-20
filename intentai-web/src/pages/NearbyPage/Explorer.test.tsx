import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import AppShell from '../../components/AppShell/AppShell';
import { COLLECTIONS, members } from '../../features/nearby/catalogue';
import { getLocationState } from '../../features/nearby/location';
import { deleteAllData, explorePersonalStore, settingsStore } from '../../data/stores';
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
    expect(screen.getByRole('button', { name: /Exploring Singapore/ })).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByRole('application', { name: /Map of Singapore places/ })).toBeInTheDocument();
    expect(screen.getByText(/places across Singapore/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Phrases for a setting/ })).toBeInTheDocument();
    // Without an origin there are no distances.
    expect(screen.queryByText(/Approx\./)).not.toBeInTheDocument();
  });

  test('categories filter the list and the map together', async () => {
    renderAt('/nearby?view=list');
    await userEvent.click(screen.getByRole('button', { name: 'Food' }));
    expect(screen.getByTestId('where')).toHaveTextContent('category=food');
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThan(3);
    for (const card of cards) expect(card).toHaveTextContent('Food ·');
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

  test('selecting a card selects the same place on the map (and the other way round)', async () => {
    renderAt('/nearby?area=sg-marina-bay&view=list');
    const pin = () => document.querySelector('[data-pin="curated:sg-merlion-park"]');
    const card = screen.getAllByRole('button', { name: 'Merlion Park' })[0];
    await userEvent.click(card);
    expect(screen.getByTestId('where')).toHaveTextContent('sel=curated%3Asg-merlion-park');
    expect(card).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(within(screen.getByRole('region', { name: 'Selected place' })).getByText('Merlion Park')).toBeInTheDocument();
    expect(pin()).toHaveAttribute('aria-pressed', 'true');
    // and from the map: another pin selects its card
    const other = document.querySelector<HTMLButtonElement>('[data-pin]:not([data-pin="curated:sg-merlion-park"])')!;
    await userEvent.click(other);
    expect(screen.getByTestId('where')).toHaveTextContent(`sel=${encodeURIComponent(other.dataset.pin!)}`);
  });

  test('an area search measures distances "from selected area" within the radius', () => {
    renderAt('/nearby?area=sg-chinatown&view=list');
    expect(screen.getByText(/within 2 km of Chinatown/)).toBeInTheDocument();
    expect(screen.getAllByText(/Approx\. .* from selected area/).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/from your approximate location/).length).toBeGreaterThan(0);
  });

  test('outside Singapore: manual exploration stays, with an explanation', async () => {
    mockGeolocation({ lat: 3.139, lng: 101.687, accuracy: 10 });
    renderAt('/nearby');
    await userEvent.click(screen.getByRole('button', { name: /My location/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText(/Nearby works in Singapore/)).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /Exploring Singapore/ })).toBeInTheDocument();
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

  test('shows sourced facts with dates and sources, practical actions and membership', () => {
    renderAt(`/nearby/place/${key}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Maxwell Food Centre' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Maxwell Road Food Centre/ })[0]).toHaveAttribute('href', expect.stringMatching(/^https:\/\/www\.roots\.gov\.sg\//));
    expect(screen.getByText(/Last reviewed 2026-10-20/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Directions/ })).toHaveAttribute('href', expect.stringContaining('destination=1.2'));
    expect(screen.getByRole('link', { name: /Directions/ }).getAttribute('href')).not.toContain('origin');
    expect(screen.queryByRole('link', { name: /View in 3D/ })).toBeNull();
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'What you might hear here' })).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /Mark visited/ }));
    expect(explorePersonalStore.get().places[0]).toMatchObject({ placeKey: key, saved: false, visited: true });
    await userEvent.click(screen.getByRole('button', { name: '☆ Save' }));
    expect(explorePersonalStore.get().places[0]).toMatchObject({ saved: true, visited: true });
    act(() => undoToast());
    expect(explorePersonalStore.get().places[0]).toMatchObject({ saved: false, visited: true });
  });

  test('a future visit date is refused', async () => {
    renderAt(`/nearby/place/${key}`);
    await userEvent.click(screen.getByRole('button', { name: /Mark visited/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Change date' }));
    fireEvent.change(screen.getByLabelText(/Visit date/), { target: { value: '2999-01-01' } });
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
    expect(screen.getByRole('heading', { name: 'Singapore collection (draft) · 100 places' })).toBeInTheDocument();
    expect(screen.getByText('1 of 100 visited')).toBeInTheDocument();
    expect(screen.queryByText('100 Places to Explore in Singapore')).not.toBeInTheDocument();
  });

  test('filters never change the denominator; marking visited updates it once', async () => {
    renderAt(`/nearby/collections/${c.id}?category=food`);
    expect(screen.getByText('0 of 100 visited')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /^Mark visited:/ });
    expect(buttons.length).toBeLessThan(100);
    await userEvent.click(buttons[0]);
    expect(screen.getByText('1 of 100 visited')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Visited' }));
    expect(screen.getByText(/Showing 1 of 100/)).toBeInTheDocument();
    expect(screen.getByText('1 of 100 visited')).toBeInTheDocument();
  });

  test('reaching 10% shows one small acknowledgement', async () => {
    const ids = members(c).slice(0, 9).map((p) => p.id);
    explorePersonalStore.set((d) => ({ ...d, places: ids.map((placeKey) => ({ placeKey, saved: false, visited: true, updatedAt: new Date().toISOString() })) }));
    renderAt(`/nearby/collections/${c.id}?visit=todo`);
    await userEvent.click(screen.getAllByRole('button', { name: /^Mark visited:/ })[0]);
    expect(screen.getByText(/10% of this collection visited/)).toBeInTheDocument();
    expect(explorePersonalStore.get().milestonesSeen).toEqual({ [c.id]: [10] });
    // Undo takes the visit and the acknowledgement back; reaching 10% again shows it again.
    act(() => undoToast());
    expect(screen.queryByText(/10% of this collection visited/)).not.toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: '☆ Save' }));
    expect(explorePersonalStore.get().places).toHaveLength(1);
    act(() => deleteAllData());
    expect(explorePersonalStore.get().places).toEqual([]);
    expect(getLocationState()).toEqual({ status: 'manual' });
    act(() => undoToast());
    expect(explorePersonalStore.get().places).toEqual([]);
  });
});
