import { render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { explorePersonalStore } from '../../../data/stores';
import Journal from './Journal';
import { dayAnchor, useJournalDays } from './useJournalDays';

const visit = (placeKey: `curated:${string}`, day: string) => ({ placeKey, saved: false, visited: true, visitedOn: day, updatedAt: `${day}T10:00:00Z` });

afterEach(() => window.history.replaceState(null, '', '/'));

test('useJournalDays: the same days the journal shows, newest first, for the Passport carousel', () => {
  explorePersonalStore.set((d) => ({
    ...d,
    places: [visit('curated:sg-artscience-museum', '2026-11-04'), visit('curated:sg-henderson-waves', '2026-11-07')],
  }));
  const { result } = renderHook(() => useJournalDays());
  expect(result.current.days.map((d) => d.day)).toEqual(['2026-11-07', '2026-11-04']);
  expect(result.current.days[0].stats.places).toBe(1);
});

test('each day has an anchor, so /moments#day-… can open it', () => {
  explorePersonalStore.set((d) => ({ ...d, places: [visit('curated:sg-artscience-museum', '2026-11-04')] }));
  window.history.replaceState(null, '', `/moments#${dayAnchor('2026-11-04')}`);
  render(
    <MemoryRouter>
      <Journal />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Journal' })).toBeInTheDocument();
  expect(document.getElementById('day-2026-11-04')).not.toBeNull();
});

test("a day's top: the date, the day's map right beneath it, the photo beside them; the map's credit stays", () => {
  // owner, 9 Nov 2026: "the map is to the left of the high-quality image right beneath the date"
  explorePersonalStore.set((d) => ({ ...d, places: [visit('curated:sg-artscience-museum', '2026-11-04')] }));
  render(
    <MemoryRouter>
      <Journal />
    </MemoryRouter>,
  );
  const day = document.getElementById('day-2026-11-04')!;
  const top = day.firstElementChild as HTMLElement;
  const map = screen.getByRole('application', { name: /^Map of .* 1 place in the order you went$/ });
  const photo = screen.getByRole('group', { name: /^Places of / });
  // all three sit in the day's top block, in reading order: date, map, photo; the place list comes after
  expect(top.contains(map) && top.contains(photo)).toBe(true);
  const order = [top.querySelector('p'), map, photo];
  for (let i = 1; i < order.length; i++)
    expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(top.textContent).toMatch(/OpenStreetMap contributors/);
  expect(top.compareDocumentPosition(day.querySelector('ol')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
