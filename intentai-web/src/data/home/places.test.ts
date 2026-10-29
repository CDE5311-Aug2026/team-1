import { describe, expect, test } from 'vitest';
import { DEFAULT_EXPLORE_PERSONAL } from '../../features/nearby/domain';
import {
  HOME_PLACES, cardById, cardKind, cardPhoto, cardPosition, checkInTarget, dayLabel, greetingFor, homePlace,
  isCheckedIn, keyNumbers, kindLabel, openedCount, placeKeysOf, plainFacts, timelineOf,
} from './places';

describe('places with cards', () => {
  test('come from the areas that have culture cards, Chinatown first with its three real cards', () => {
    const chinatown = homePlace('sg-chinatown')!;
    expect(HOME_PLACES[0].id).toBe('sg-chinatown');
    expect(chinatown.cards.map((c) => c.article.id)).toEqual(['chicken-rice', 'sri-mariamman', 'thian-hock-keng']);
    expect(HOME_PLACES.every((p) => p.cards.length > 0 && p.cover)).toBe(true);
    // nothing the repo lacks
    expect(HOME_PLACES.some((p) => /berlin/i.test(p.name))).toBe(false);
  });

  test('N of M opened counts only this place’s cards', () => {
    const chinatown = homePlace('sg-chinatown')!;
    expect(openedCount(chinatown, ['laksa', 'thian-hock-keng', 'chicken-rice'])).toBe(2);
  });

  test('checked in = Nearby visited at a place the cards name', () => {
    const chinatown = homePlace('sg-chinatown')!;
    expect(placeKeysOf(chinatown)).toContain('curated:sg-thian-hock-keng-temple');
    expect(isCheckedIn(chinatown, DEFAULT_EXPLORE_PERSONAL)).toBe(false);
    const personal = { ...DEFAULT_EXPLORE_PERSONAL, places: [{ placeKey: 'curated:sg-thian-hock-keng-temple' as const, saved: false, visited: true, updatedAt: '' }] };
    expect(isCheckedIn(chinatown, personal)).toBe(true);
    // the same rule as the Moments stamp: any catalogue place in the area
    const boatQuay = { ...DEFAULT_EXPLORE_PERSONAL, places: [{ placeKey: 'curated:sg-boat-quay' as const, saved: false, visited: true, updatedAt: '' }] };
    expect(isCheckedIn(chinatown, boatQuay)).toBe(true);
    expect(isCheckedIn(homePlace('sg-kampong-glam')!, boatQuay)).toBe(false);
    expect(checkInTarget(cardById('sri-mariamman')!, 'sg-chinatown')).toEqual({ key: 'curated:sg-sri-mariamman-temple', name: expect.stringMatching(/Sri Mariamman/) });
  });
});

describe('cards', () => {
  test('layout follows the topic, history trivia gets the history layout', () => {
    expect(cardKind(cardById('chicken-rice')!)).toBe('food');
    expect(cardKind(cardById('thian-hock-keng')!)).toBe('monument');
    expect(cardKind(cardById('hari-raya-puasa')!)).toBe('festival');
    expect(cardKind(cardById('sentosa-name')!)).toBe('history');
    expect(kindLabel(cardById('botanic-gardens')!)).toBe('UNESCO');
  });

  test('position and next card within the place', () => {
    expect(cardPosition('sri-mariamman')).toMatchObject({ index: 2, total: 3 });
    expect(cardPosition('sri-mariamman').next?.article.id).toBe('thian-hock-keng');
    expect(cardPosition('lunar-new-year').place).toBeUndefined();
  });

  test('key numbers and things to look for come from the card’s facts', () => {
    const shk = cardById('sultan-mosque')!;
    expect(keyNumbers(shk).map((n) => n.value).slice(0, 2)).toEqual(['1824 to 1826', '1932']);
    expect(keyNumbers(shk, 2)).toHaveLength(2);
    // the kicker's date ("Telok Ayer Street · gazetted 1973"); the summary is not repeated as a number
    expect(keyNumbers(cardById('thian-hock-keng')!)).toEqual([{ value: '1973', caption: 'Year gazetted as a national monument' }]);
    expect(plainFacts(cardById('thian-hock-keng')!)).toContain('Built with traditional joinery, without nails.');
  });

  test('timeline: sentences with years, in time order', () => {
    const events = timelineOf(cardById('sentosa-name')!);
    expect(events[0].label).toBe('Late 16th century');
    expect(events.map((e) => e.year)).toEqual([...events.map((e) => e.year)].sort((a, b) => a - b));
    expect(events.some((e) => e.label === '1972')).toBe(true);
  });

  test('a card without its own photo uses the Nearby picture of its place', () => {
    expect(cardPhoto(cardById('raffles-hotel')!)?.src).toMatch(/sg-raffles-hotel\.webp$/);
  });
});

test('greeting by time of day and the date line', () => {
  expect(greetingFor(8)).toBe('Good morning');
  expect(greetingFor(14)).toBe('Good afternoon');
  expect(greetingFor(21)).toBe('Good evening');
  expect(dayLabel(new Date(2026, 9, 29))).toBe('Thu 29 Oct');
});
