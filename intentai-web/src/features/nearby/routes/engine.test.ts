import { describe, expect, test } from 'vitest';
import { ATLAS_PLACES, atlasStation, stationPoint } from '../../../data/atlas/atlas';
import { closure, distance, eligibility, generate, mapsLinks, stats, type EnginePlace, type EngineStation } from './engine';

// A small grid near Clementi: 0.009° of latitude ≈ 1 km.
const BASE = { lat: 1.315, lng: 103.765 };
const at = (km: number, kmEast = 0) => ({ lat: BASE.lat + km * 0.009, lng: BASE.lng + kmEast * 0.009 });
const place = (id: string, over: Partial<EnginePlace> = {}): EnginePlace => ({
  id,
  name_en: id.toUpperCase(),
  category: 'culture',
  ...at(0.2),
  status: 'open',
  visit_minutes: 45,
  coordinates_quality: 'verified',
  address: `${id} street`,
  ...over,
});
const station = (ids: string[], over: Partial<EngineStation> = {}): EngineStation => ({ name_en: 'Clementi', kind: 'MRT', place_ids: ids, ...BASE, ...over });
const OPT = { date: '2026-10-29', mode: 'walking' as const, budget: 240, max: 6 };

describe('distance and stats', () => {
  test('haversine km; null without coordinates', () => {
    expect(distance(at(0), at(1))).toBeCloseTo(1, 1);
    expect(distance(at(0), { lat: null, lng: 103 })).toBeNull();
    expect(distance(null, at(0))).toBeNull();
  });

  test('stats add visit minutes (45 by default), known legs and the approximate flag', () => {
    const s = stats([place('a', { ...at(0), visit_minutes: 30 }), place('b', { ...at(1), visit_minutes: null }), place('c', { lat: null, lng: null, coordinates_quality: 'approximate' })]);
    expect(s.visitMinutes).toBe(30 + 45 + 45);
    expect(s.km).toBeCloseTo(1, 1);
    expect(s.knownLegs).toBe(1);
    expect(s.totalLegs).toBe(2);
    expect(s.approximate).toBe(true);
  });
});

describe('closures on the planned date', () => {
  test('recorded closed', () => {
    expect(closure(place('a', { status: 'closed' }), '2026-10-29')?.code).toBe('closed');
  });
  test('closing period from closes_on until reopens_on', () => {
    const p = place('a', { closes_on: '2026-10-31', reopens_on: '2027-01-01' });
    expect(closure(p, '2026-10-30')).toBeNull();
    expect(closure(p, '2026-10-31')?.code).toBe('closing_period');
    expect(closure(p, '2027-01-01')).toBeNull();
    expect(closure(place('b', { closes_on: '2026-10-31' }), '2030-01-01')?.code).toBe('closing_period');
  });
  test('announced temporary closures are inclusive of both dates', () => {
    const p = place('a', { closures: [{ from: '2026-11-19', to: '2026-12-03', note: '提升工程' }] });
    expect(closure(p, '2026-11-18')).toBeNull();
    expect(closure(p, '2026-11-19')?.reason).toBe('Announced temporary closure from 2026-11-19 to 2026-12-03');
    expect(closure(p, '2026-12-03')?.code).toBe('temporary_closure');
    expect(closure(p, '2026-12-04')).toBeNull();
  });
  test('weekly rest day (0 = Sunday … 6 = Saturday)', () => {
    const mondays = place('a', { closed_weekdays: [1] });
    expect(closure(mondays, '2026-11-02')?.code).toBe('weekly_closure'); // a Monday
    expect(closure(mondays, '2026-11-03')).toBeNull();
  });
});

describe('eligibility', () => {
  test('ferry, taxi, booking, transport on foot, coordinates, collection-only — with English reasons', () => {
    expect(eligibility(place('a', { transport_required: 'ferry' }), OPT)).toMatchObject({ code: 'ferry', reason: expect.stringMatching(/ferry/) });
    expect(eligibility(place('a', { transport_required: 'taxi' }), { ...OPT, mode: 'transit' })?.code).toBe('taxi');
    expect(eligibility(place('a', { requires_booking: true }), OPT)?.code).toBe('booking');
    expect(eligibility(place('a', { requires_booking: true }), { ...OPT, booking: true })).toBeNull();
    expect(eligibility(place('a', { transport_required: 'bus' }), OPT)?.code).toBe('transport');
    expect(eligibility(place('a', { transport_required: 'bus' }), { ...OPT, mode: 'transit' })).toBeNull();
    expect(eligibility(place('a', { lat: null, lng: null }), OPT)?.code).toBe('no_coordinates');
    expect(eligibility(place('a', { route_eligible: false }), OPT)?.code).toBe('not_route_eligible');
    // closure first
    expect(eligibility(place('a', { status: 'closed', transport_required: 'ferry' }), OPT)?.code).toBe('closed');
  });
});

describe('generate', () => {
  test('orders by proximity from the station, preferring category variety', () => {
    const places = [
      place('far-food', { category: 'food', ...at(1.2) }),
      place('near-culture', { category: 'culture', ...at(0.2) }),
      place('near-culture-2', { category: 'culture', ...at(0.4) }),
      place('mid-nature', { category: 'nature', ...at(0.6) }),
    ];
    const r = generate(places, station(places.map((p) => p.id)), OPT);
    expect(r.ids[0]).toBe('near-culture');
    // a second culture stop costs +5, so the nature stop comes before it
    expect(r.ids.indexOf('mid-nature')).toBeLessThan(r.ids.indexOf('near-culture-2'));
    expect(r.ids).toHaveLength(4);
    expect(r.excluded).toEqual([]);
    expect(r.initialCount).toBe(4);
  });

  test('only places linked to the station, and only the theme', () => {
    const places = [place('a', { category: 'food' }), place('b', { category: 'culture' }), place('c', { category: 'food' })];
    const r = generate(places, station(['a', 'b']), { ...OPT, theme: 'food' });
    expect(r.ids).toEqual(['a']);
  });

  test('the time budget limits stops (visits + transfers, in minutes)', () => {
    const places = ['a', 'b', 'c', 'd'].map((id, i) => place(id, { ...at(0.1 * (i + 1)), category: ['food', 'culture', 'nature', 'history'][i], visit_minutes: 50 }));
    const r = generate(places, station(places.map((p) => p.id)), { ...OPT, budget: 120 });
    // first: 50 + 5 min from the station; second: 50 + 7 walking ⇒ 112; a third does not fit
    expect(r.ids).toHaveLength(2);
    expect(r.estimatedMinutes).toBeLessThanOrEqual(120);
    expect(r.notChosen).toHaveLength(2);
  });

  test('the stop cap', () => {
    const places = ['a', 'b', 'c'].map((id, i) => place(id, { ...at(0.1 * (i + 1)) }));
    expect(generate(places, station(['a', 'b', 'c']), { ...OPT, max: 2 }).ids).toHaveLength(2);
  });

  test('walking legs are at most 3.5 km; transit has no such cap', () => {
    const places = [place('near', { ...at(0.2) }), place('far', { ...at(4.5), category: 'nature' })];
    const walk = generate(places, station(['near', 'far']), { ...OPT, budget: 600 });
    expect(walk.ids).toEqual(['near']);
    expect(walk.notChosen).toEqual(['far']);
    const transit = generate(places, station(['near', 'far']), { ...OPT, budget: 600, mode: 'transit' });
    expect(transit.ids).toEqual(['near', 'far']);
  });

  test('excluded places come with their reasons (closures on the date, ferry, taxi, booking)', () => {
    const places = [
      place('ok'),
      place('island', { transport_required: 'ferry' }),
      place('car', { transport_required: 'taxi' }),
      place('omakase', { requires_booking: true, category: 'food' }),
      place('monday', { closed_weekdays: [1] }),
      place('works', { closures: [{ from: '2026-11-01', to: '2026-11-08' }] }),
    ];
    const ids = places.map((p) => p.id);
    const r = generate(places, station(ids), { ...OPT, date: '2026-11-02' });
    expect(r.ids).toEqual(['ok']);
    expect(Object.fromEntries(r.excluded.map((e) => [e.id, e.code]))).toEqual({
      island: 'ferry',
      car: 'taxi',
      omakase: 'booking',
      monday: 'weekly_closure',
      works: 'temporary_closure',
    });
    // the same station another day, booking ahead
    const later = generate(places, station(ids), { ...OPT, date: '2026-11-10', booking: true });
    expect(later.ids.sort()).toEqual(['monday', 'ok', 'omakase', 'works']);
  });

  test('works on the real atlas: Clementi', () => {
    const s = atlasStation('clementi');
    expect(s).toBeDefined();
    const r = generate(ATLAS_PLACES, s, { ...OPT, budget: 180 });
    expect(r.ids.length).toBeGreaterThan(0);
    expect(r.estimatedMinutes).toBeLessThanOrEqual(180);
    // the rail bridge is collection-only
    expect(r.excluded.find((e) => e.id === 'sunset-way-rail-bridge')?.code).toBe('not_route_eligible');
  });

  test('stations without coordinates get the centroid of their places', () => {
    const s = atlasStation('telok-ayer');
    expect(s?.lat ?? null).toBeNull();
    const pt = stationPoint(s!);
    expect(pt?.derived).toBe(true);
    expect(pt!.lat).toBeGreaterThan(1.27);
    expect(pt!.lat).toBeLessThan(1.29);
    expect(stationPoint(atlasStation('clementi')!)?.derived).toBe(false);
  });
});

describe('mapsLinks', () => {
  const stops = ['a', 'b', 'c', 'd', 'e'].map((id) => place(id));
  test('walking: parts of up to four stops from the station, with waypoints', () => {
    const links = mapsLinks(stops, station([]), 'walking');
    expect(links).toHaveLength(2);
    expect(links[0].label).toBe('Open walking directions in Google Maps · part 1');
    const u = new URL(links[0].url);
    expect(u.origin + u.pathname).toBe('https://www.google.com/maps/dir/');
    expect(u.searchParams.get('origin')).toBe('Clementi MRT Station, Singapore');
    expect(u.searchParams.get('destination')).toBe('D, d street');
    expect(u.searchParams.get('waypoints')).toBe('A, a street|B, b street|C, c street');
    expect(u.searchParams.get('travelmode')).toBe('walking');
    expect(new URL(links[1].url).searchParams.get('origin')).toBe('D, d street');
  });
  test('one part has no part number', () => {
    expect(mapsLinks(stops.slice(0, 3), station([]), 'walking').map((l) => l.label)).toEqual(['Open walking directions in Google Maps']);
  });
  test('transit: one link per leg', () => {
    const links = mapsLinks(stops.slice(0, 2), station([]), 'transit');
    expect(links.map((l) => l.label)).toEqual(['Transit directions, leg 1 → A', 'Transit directions, leg 2 → B']);
    expect(new URL(links[1].url).searchParams.get('travelmode')).toBe('transit');
  });
  test('a single place without a station opens the place', () => {
    expect(mapsLinks([place('a', { maps_url: 'https://maps.example/a' })], null, 'walking')).toEqual([{ label: 'Open the place in Google Maps', url: 'https://maps.example/a' }]);
    expect(mapsLinks([], null, 'walking')).toEqual([]);
  });
});
