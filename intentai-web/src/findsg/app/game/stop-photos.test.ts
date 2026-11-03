import {describe, expect, test} from 'vitest';
// @ts-expect-error the game modules are untyped JS
import {ONSITE_ROUTES} from './onsite-content.js';
// @ts-expect-error the game modules are untyped JS
import {distanceLabel, metresBetween, photoOf, pinOf} from './stop-photos.js';

// the shipped photo files, only listed, never loaded
const FILES = new Set(Object.keys(import.meta.glob(['../../../../public/nearby/photos/*', '../../../../public/hunt/om/refs/*'])).map(p => p.replace(/^.*\/public\//, '')));

const stops = (Object.values(ONSITE_ROUTES) as {stops: {id: string}[]}[]).flatMap(r => r.stops);

describe('stop photos and pins', () => {
  test('every stop has a map pin', () => {
    expect(stops.filter(s => !pinOf(s.id)).map(s => s.id)).toEqual([]);
  });
  test('every listed photo is a credited file that ships with the app', () => {
    expect(FILES.size).toBeGreaterThan(100);
    for (const s of stops) for (const kind of ['place', 'detail']) {
      const p = photoOf(s.id, kind);
      if (!p) continue;
      expect(p.credit, s.id).toBeTruthy();
      expect(FILES.has(p.src.replace(/^\/+/, '')), p.src).toBe(true);
    }
  });
  test('distances read in metres, then kilometres', () => {
    expect(distanceLabel(312)).toBe('310 m');
    expect(distanceLabel(1240)).toBe('1.2 km');
    const m = metresBetween({lat: 1.3, lng: 103.86}, {lat: 1.301, lng: 103.86});
    expect(m).toBeGreaterThan(105);
    expect(m).toBeLessThan(118);
  });
});
