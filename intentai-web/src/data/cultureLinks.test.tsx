import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import NearbyLinks from '../components/NearbyLinks/NearbyLinks';
import { area, collection, curatedPlace } from '../features/nearby/catalogue';
import { CATEGORIES, articlesFor } from './culture';
import { ARTICLE_LINKS, HOLIDAY_LINKS, articlesNaming, nearbyHref, type NearbyLink } from './cultureLinks';
import { todaysHoliday } from './holiday';

const all: [string, NearbyLink][] = [
  ...Object.entries(ARTICLE_LINKS).flatMap(([k, ls]) => ls.map((l) => [k, l] as [string, NearbyLink])),
  ...Object.entries(HOLIDAY_LINKS).flatMap(([k, ls]) => ls.map((l) => [k, l] as [string, NearbyLink])),
];

test('every link goes to a real place, area or list, under the name the catalogue gives it', () => {
  for (const [, l] of all) {
    const name = l.kind === 'place' ? curatedPlace(l.id)?.name : l.kind === 'area' ? area(l.id)?.name : collection(l.id)?.title;
    expect(name, `${l.kind} ${l.id}`).toBe(l.label);
  }
});

test('an article links only to places its own text names (a stall to try is marked as such)', () => {
  const articles = CATEGORIES.flatMap((c) => articlesFor(c.id));
  for (const [id, links] of Object.entries(ARTICLE_LINKS)) {
    const a = articles.find((x) => x.id === id);
    expect(a, id).toBeDefined();
    const text = [a!.title, a!.kicker, a!.summary, ...a!.facts, a!.deeper].join(' ');
    for (const l of links) {
      if (l.kind === 'place' && l.why !== 'try') {
        const short = l.label.replace(/ (Temple|Monastery)$/, '');
        expect(text.includes(l.named ?? l.label) || text.includes(short), `${id} names ${l.label}`).toBe(true);
      }
    }
  }
  expect(HOLIDAY_LINKS[todaysHoliday.name]).toBeDefined();
  expect(articlesNaming('curated:sg-sultan-mosque')).toEqual(['sultan-mosque']);
  expect(articlesNaming('curated:sg-tian-tian-hainanese-chicken-rice')).toEqual([]); // a stall to try is not "named"
});

test('the chips open Nearby on the place (details open), the area or the list, and show a check-in', () => {
  expect(nearbyHref({ kind: 'place', id: 'curated:sg-sultan-mosque', label: 'Sultan Mosque' })).toBe('/nearby?sel=curated%3Asg-sultan-mosque&info=1');
  expect(nearbyHref({ kind: 'list', id: 'sg-hawker-centres', label: 'x' })).toBe('/nearby?list=sg-hawker-centres');
  render(
    <MemoryRouter>
      <NearbyLinks links={ARTICLE_LINKS['chicken-rice']} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Try it: Tian Tian Hainanese Chicken Rice (opens Nearby)' })).toHaveAttribute(
    'href',
    '/nearby?sel=curated%3Asg-tian-tian-hainanese-chicken-rice&info=1',
  );
  expect(screen.getByRole('link', { name: 'Hawker centres to know (opens Nearby)' })).toHaveAttribute('href', '/nearby?list=sg-hawker-centres');
});
