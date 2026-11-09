import { SAVES_CLEARED } from '../../../data/deviceKeys';
import { HUNTS } from '../hunts';
import { loadHunt, passStop, startHunt } from './model';

const photo = { name: 'stop.jpg', type: 'image/jpeg', size: 1000 };

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new Event(SAVES_CLEARED));
});

it.each(HUNTS.map((h) => h.id))('%s: one recognised photo a stop finishes the hunt, in order', (id) => {
  const fresh = loadHunt(id)!;
  expect(fresh.started).toBe(false);
  expect(fresh.current).toBe(0);
  startHunt(id);
  expect(loadHunt(id)!.started).toBe(true);
  for (let i = 0; i < fresh.stops.length; i++) {
    const now = loadHunt(id)!;
    expect(now.current).toBe(i);
    const after = passStop(id, now.stops[i].id, photo, new Date(Date.UTC(2026, 10, 10, 9, i)));
    expect(after.stops[i].done).toBe(true);
  }
  const done = loadHunt(id)!;
  expect(done.complete).toBe(true);
  expect(done.current).toBeNull();
});

it('keeps the Golden Dome’s second building hidden until the first is passed', () => {
  const before = loadHunt('short')!;
  expect(before.stops[1].address).toBe('');
  passStop('short', 'short-press', photo);
  expect(loadHunt('short')!.stops[1].name).toBe('Sultan Mosque');
});

it('saves a pass as an on-site check-in with the photo time', () => {
  passStop('telok-ayer', 'telok-ayer-01', photo, new Date('2026-11-10T01:02:03.000Z'));
  const raw = JSON.parse(localStorage.getItem('findsg-onsite-v1:telok-ayer:manual')!);
  expect(raw.completed).toEqual(['telok-ayer-01']);
  expect(raw.stops['telok-ayer-01'].checkin.confirmedAt).toBe('2026-11-10T01:02:03.000Z');
  expect(raw.stops['telok-ayer-01'].checkin.countsAsVisit).toBe(true);
});

it('never shows notes written for the old remote play', () => {
  for (const h of HUNTS) for (const s of loadHunt(h.id)!.stops) expect(s.hint ?? '').not.toMatch(/\bremote\b/i);
});
