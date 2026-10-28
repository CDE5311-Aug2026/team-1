import { expect, test } from 'vitest';
import { todaysHoliday } from './holiday';

test('the demo date is Sat 7 Nov 2026, the start of the Deepavali long weekend', () => {
  expect(todaysHoliday.today).toBe('Sat 7 Nov');
  expect(todaysHoliday.cardTitle).toBe('Deepavali long weekend starts today');
  // Deepavali itself is Sun 8 Nov; the card must not claim Nov 7 is the festival day.
  expect(todaysHoliday.cardBody).toMatch(/Sun 8 Nov/);
  expect(todaysHoliday.cardBody).toMatch(/Mon 9 Nov/);
});

test('the detail leads with the survey top choice and is layered: quick facts, deeper read, source', () => {
  expect(todaysHoliday.detailHeading).toBe('Meaning and origins');
  expect(todaysHoliday.facts.length).toBeGreaterThanOrEqual(3);
  expect(todaysHoliday.deeper.length).toBeGreaterThan(0);
  expect(todaysHoliday.source).not.toBe('');
});

test('the hero card carries a kicker and the Berlin Wall anniversary row', () => {
  expect(todaysHoliday.kicker).toBe('Sat 7 Nov · Long weekend');
  expect(todaysHoliday.also).toEqual({
    when: 'Also Mon 9 Nov · Near you',
    title: 'The Berlin Wall fell 37 years ago',
    placeId: 'berlin-wall-fragments',
  });
});
