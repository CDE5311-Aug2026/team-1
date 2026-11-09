import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { explorePersonalStore } from '../../../data/stores';
import PlaceDetailPage from '../../../pages/NearbyPage/PlaceDetailPage';
import { ALL_PLACES, curatedPlace } from '../catalogue';
import type { CuratedPlace } from '../domain';
import type { LocationState } from '../location';
import { factTiles, nearbyPlaces, placePhoto, tipFact } from './PlaceV2';
import { distanceLabel, hintText, stampHint } from './PlaceV2Proximity';

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/nearby/place/${encodeURIComponent(id)}`]}>
      <Routes>
        <Route path="/nearby/place/:placeKey" element={<PlaceDetailPage />} />
        <Route path="/" element={<h1>Home probe</h1>} />
        <Route path="/nearby" element={<h1>Retired explorer</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const victoria = curatedPlace('curated:sg-victoria-theatre-and-concert-hall')!;
// about 30 m from Victoria Theatre
const NEAR = { lat: 1.28855, lng: 103.85159 };

function active(fix: { lat: number; lng: number }, accuracyM = 15, ageMs = 1000, now = 1_000_000): LocationState {
  return { status: 'active', fix: { ...fix, accuracyM, timestamp: now - ageMs } };
}

test('a place opened on its own closes (✕) to Home (the v1 Nearby explorer is retired, 8 Nov 2026)', async () => {
  renderAt(victoria.id);
  await userEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('heading', { name: 'Home probe' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Retired explorer' })).toBeNull();
});

describe('stamp hint (plan C4, B7)', () => {
  const now = 1_000_000;
  test('within range only with a good pin, a fresh accurate fix and 150 m or less', () => {
    const h = stampHint(victoria, active(NEAR), true, now);
    expect(h.kind).toBe('in-range');
    expect(hintText(h)).toMatch(/^You are \d+ m away · within range$/);
    // a fix older than 60 s
    expect(stampHint(victoria, active(NEAR, 15, 61_000), true, now).kind).toBe('stale');
    // accuracy worse than 100 m: a distance, never "within range"
    expect(stampHint(victoria, active(NEAR, 150), true, now).kind).toBe('about');
    // a street / area / approximate pin never shows range
    for (const pinQuality of ['street', 'area', 'approx'] as const) {
      const h2 = stampHint({ ...victoria, pinQuality }, active(NEAR), true, now);
      expect(h2.kind).toBe('rough-pin');
      expect(hintText(h2)).not.toMatch(/within range/);
    }
    expect(stampHint({ ...victoria, pinQuality: 'building' }, active(NEAR), true, now).kind).toBe('in-range');
  });

  test('far away, denied, locating, elsewhere; nothing ever says "verified"', () => {
    const far = stampHint(victoria, active({ lat: 1.36, lng: 103.99 }), true, now);
    expect(far.kind).toBe('out-of-range');
    expect(hintText(far)).toMatch(/out of range · stamps are self-reported/);
    expect(hintText(stampHint({ ...victoria, pinQuality: 'area' }, active({ lat: 1.36, lng: 103.99 }), true, now))).toMatch(/^About \d+ km away/);
    expect(stampHint(victoria, { status: 'denied' }, false, now).kind).toBe('denied');
    expect(stampHint(victoria, { status: 'requesting' }, false, now).kind).toBe('locating');
    expect(stampHint(victoria, { status: 'manual' }, false, now).kind).toBe('ask');
    expect(stampHint(victoria, active(NEAR), false, now).kind).toBe('elsewhere');
    const all = ['ask', 'locating', 'denied', 'unavailable', 'elsewhere', 'stale', 'rough-pin'].map((kind) => hintText({ kind } as never));
    for (const t of [...all, hintText({ kind: 'in-range', metres: 20 }), hintText({ kind: 'about', distance: 'x' })]) expect(t).not.toMatch(/verif/i);
  });

  test('list distances follow the same pin rules', () => {
    expect(distanceLabel(victoria, { status: 'manual' }, false)).toBeNull();
    expect(distanceLabel(victoria, active(NEAR, 15, 0, Date.now()), true)).toMatch(/^Approx\./);
    expect(distanceLabel({ ...victoria, pinQuality: 'approx' }, active(NEAR, 15, 0, Date.now()), true)).toBeNull();
  });
});

describe('sections only with their data (plan A9)', () => {
  test('tiles only from quick facts, the tip only from a sourced fact', () => {
    expect(factTiles({ quickFacts: { year: '2019', heightM: 40, floors: 10, architect: 'X' } })).toEqual([
      { value: '2019', label: 'built' },
      { value: '40 m', label: 'tall' },
      { value: '10', label: 'floors' },
    ]);
    expect(factTiles({})).toEqual([]);
    expect(tipFact({ facts: [{ id: 'a', text: 'no source', sources: [] }] })).toBeUndefined();
  });

  test('Jewel: photo, hours with source, a tile, a sourced tip, the story; no challenge', () => {
    const { container } = renderAt('curated:sg-jewel-changi-airport');
    expect(screen.getByRole('heading', { level: 1, name: 'Jewel Changi Airport' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jewel Changi Airport' })).toBeInTheDocument();
    expect(container.querySelector('[data-photo="yes"] [data-glyph="att"]')).not.toBeNull();
    // the hours chip, with its source under it (the practical details lower down repeat them)
    expect(screen.getAllByText(/Open 24 hours; most shops 10:00–22:00/)[0].closest('span')).toBeInTheDocument();
    expect(screen.getByText(/^Hours:/)).toHaveTextContent('Hours: Jewel Changi Airport (opens in a new tab), checked 2026-10-22');
    expect(within(screen.getByText(/^Hours:/)).getByRole('link')).toHaveAttribute('href', expect.stringContaining('jewelchangiairport.com'));
    expect(within(screen.getByRole('region', { name: 'Key facts' })).getByText('2019')).toBeInTheDocument();
    const tip = screen.getByRole('region', { name: 'Picked for you · Attractions' });
    expect(within(tip).getByText(/^Source:/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The story' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Part of a challenge' })).toBeNull();
    expect(screen.getByRole('link', { name: /Directions/ })).toHaveAttribute('href', expect.stringContaining('google.com/maps/dir'));
  });

  test('a place on a challenge route links the challenge’s volume; nearby places come from the proximity ranking', () => {
    renderAt(victoria.id);
    const card = screen.getByRole('region', { name: 'Part of a challenge' });
    expect(within(card).getByText('The Missing Years')).toBeInTheDocument();
    expect(within(card).getByText(/Stop 6 of 8 · 7–8 Nov/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /View Weekend challenge/ })).toHaveAttribute('href', '/hunt#story/civic-f1');
    const strip = screen.getByRole('region', { name: 'Nearby' });
    const first = nearbyPlaces(victoria)[0];
    expect(within(strip).getAllByRole('link')[0]).toHaveAttribute('href', `/nearby/place/${encodeURIComponent(first.key)}`);
  });

  test('missing photo, missing story and no nearby places: the tint shows and those sections are hidden', () => {
    // any published place with no photo, no dataset intro and nothing within 1.5 km (the photo set grows over time)
    const place = ALL_PLACES.find((p) => p.editorialStatus === 'published' && !p.description && !p.quickFacts && !placePhoto(p) && nearbyPlaces(p).length === 0);
    expect(place).toBeTruthy();
    const { container } = renderAt(place!.id);
    expect(container.querySelector('[data-photo="no"] [data-glyph]')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'The story' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Nearby' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Key facts' })).toBeNull();
  });
});

describe('Stamp here', () => {
  test('stamps once (self-reported); stamping again keeps and shows the original date', async () => {
    renderAt(victoria.id);
    expect(screen.getByText(/Stamps are self-reported/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Stamp here' }));
    const record = explorePersonalStore.get().places[0];
    expect(record).toMatchObject({ placeKey: victoria.id, visited: true });
    act(() => explorePersonalStore.set((d) => ({ ...d, places: [{ ...d.places[0], visitedOn: '2026-11-01' }] })));
    const stamped = screen.getByRole('button', { name: /^Stamped · 1 Nov/ });
    await userEvent.click(stamped);
    expect(explorePersonalStore.get().places[0].visitedOn).toBe('2026-11-01');
    expect(await screen.findByText('Already stamped on 1 Nov')).toBeInTheDocument();
    expect(screen.getByText(/Stamped on 1 Nov · self-reported/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove stamp' }));
    expect(explorePersonalStore.get().places).toEqual([]);
  });

  test('Check distance asks first, then shows "within range" near the place', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: NEAR.lat, longitude: NEAR.lng, accuracy: 12 }, timestamp: Date.now() } as unknown as GeolocationPosition),
    );
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    renderAt(victoria.id);
    await userEvent.click(screen.getByRole('button', { name: 'Check distance' }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/within range/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stamp here' })).toBeEnabled();
  });

  test('a planned place shows "coming soon" and cannot be stamped', () => {
    const planned = ALL_PLACES.find((p: CuratedPlace) => p.operatingStatus === 'planned' && p.editorialStatus === 'draft')!;
    renderAt(planned.id);
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: planned.name })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Stamp/ })).toBeNull();
  });
});
