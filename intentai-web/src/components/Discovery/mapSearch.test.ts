import { expect, test } from 'vitest';
import { normalise, searchMap, tokens } from './mapSearch';

const names = (q: string) => searchMap(q).places.map((h) => h.place.name);

test('names still come first, in English or Chinese', () => {
  expect(names('berlin')[0]).toBe('Berlin Wall Fragments');
  expect(names('林志源')[0]).toBe('Lim Chee Guan (New Bridge Road)');
  expect(names('Berlin Wall')[0]).toBe('Berlin Wall Fragments');
});

test('what a place is: "hawker" finds the hawker centres, also in Chinese', () => {
  const r = searchMap('hawker');
  expect(r.placeCount).toBeGreaterThanOrEqual(10);
  expect(r.places.every((h) => /hawker|food centre|market/i.test(`${h.place.kind} ${h.place.name}`))).toBe(true);
  expect(searchMap('小贩中心').placeCount).toBeGreaterThanOrEqual(10);
  expect(names('mosque').length).toBeGreaterThan(5);
});

test('other names and neighbourhoods: UTown, Kent Ridge, Chinatown', () => {
  expect(names('utown')).toContain('Berlin Wall Fragments');
  expect(names('kent ridge')).toContain('Berlin Wall Fragments');
  expect(searchMap('chinatown').placeCount).toBeGreaterThan(5);
  expect(names('牛车水').length).toBeGreaterThan(5);
});

test('every word must match: "temple chinatown" is temples in Chinatown', () => {
  const hits = searchMap('temple chinatown').places;
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every((h) => /temple|monastery/i.test(`${h.place.kind} ${h.place.name}`))).toBe(true);
});

test('the place line says what it is and its URA planning area', () => {
  expect(searchMap('berlin').places[0].line).toBe('Monument · Queenstown');
});

test('planning areas and Editor’s Picks are found by name', () => {
  expect(searchMap('queens').areas.map((a) => a.name)).toEqual(['Queenstown']);
  const picks = [
    { id: 'w1', kind: 'walk' as const, title: 'Chinatown · The story walk', subtitle: 'Six stops' },
    { id: 'l1', kind: 'list' as const, title: 'Michelin hawkers', subtitle: '' },
  ];
  expect(searchMap('story walk', picks).picks.map((k) => k.id)).toEqual(['w1']);
  expect(searchMap('michelin', picks).picks.map((k) => k.id)).toEqual(['l1']);
});

test('one letter is too little; one Chinese character is enough; nonsense finds nothing', () => {
  expect(searchMap('a').placeCount).toBe(0);
  expect(searchMap('桥').placeCount).toBeGreaterThan(0);
  expect(searchMap('zzzz').placeCount).toBe(0);
});

test('typing is forgiving about case, accents and punctuation', () => {
  expect(normalise("  Haw  Par's  VILLA ")).toBe('haw pars villa');
  expect(tokens('food centre')).toEqual(['food centre']);
  expect(names('HAW PAR')[0]).toBe('Haw Par Villa');
});
