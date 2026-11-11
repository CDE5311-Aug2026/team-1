import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { singaporeWeekday, yearsSinceFall } from '../../../data/stories/berlinGuide';
import { curatedPlace } from '../catalogue';
import { BERLIN_PLACE_ID, BerlinStory, historyRows } from './BerlinStory';
import { storyPages } from './storyPages';

// Mon 9 Nov 2026, 10:00 in Singapore
const MONDAY = new Date('2026-11-09T02:00:00Z');
const story = (now = MONDAY) =>
  render(
    <MemoryRouter>
      <BerlinStory now={now} />
    </MemoryRouter>,
  );

test('four parts in visit order: the panels first, lunch nearby last', () => {
  story();
  const nav = screen.getByRole('navigation', { name: 'On this page' });
  expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['The panels', 'History', '9 November', 'Lunch nearby']);
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    'Two slabs of the Berlin Wall, in a UTown garden',
    'From 1961 to a Singapore garden',
    'Fall of the Wall: the night the border opened',
    'The Spread',
  ]);
});

test('the 28 Oct card copy is kept, with the longer explanation and a source link for each part', () => {
  story();
  expect(screen.getByText(/Behind Tembusu College stand two concrete panels/)).toBeInTheDocument();
  expect(screen.getByText(/Günter Schabowski announced new travel rules/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Why it went up' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'The night, hour by hour' })).toBeInTheDocument();
  const sources = screen.getAllByRole('link').filter((a) => a.getAttribute('target') === '_blank' && !/google\.com\/maps/.test(a.getAttribute('href') ?? ''));
  expect(sources.length).toBeGreaterThanOrEqual(10);
  expect(sources.every((a) => a.getAttribute('href')?.startsWith('https://'))).toBe(true);
});

test('videos: nothing loads from YouTube until Play, then a titled no-cookie player', async () => {
  const { container } = story();
  expect(container.querySelector('iframe')).toBeNull();
  const plays = screen.getAllByRole('button', { name: /^Play video:/ });
  expect(plays.map((b) => b.getAttribute('aria-label'))).toEqual([
    'Play video: Unveiling of Berlin Wall panels at NUS, The Straits Times, 0:19 (loads YouTube)',
    'Play video: The Berlin Wall – How it worked, DW Documentary, 10:23 (loads YouTube)',
    'Play video: The fall of the Berlin Wall, The Guardian, 5:56 (loads YouTube)',
  ]);
  await userEvent.click(plays[0]);
  const frame = screen.getByTitle('Unveiling of Berlin Wall panels at NUS (The Straits Times, YouTube)');
  expect(frame.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/8hXEzGPmT9s\?/);
});

test('a playing video stops when the notebook page it is on turns away', async () => {
  const { container } = render(
    <MemoryRouter>
      <section data-state="current">
        <BerlinStory now={MONDAY} />
      </section>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getAllByRole('button', { name: /^Play video:/ })[1]);
  expect(container.querySelector('iframe')).not.toBeNull();
  container.querySelector('section[data-state]')!.setAttribute('data-state', 'past');
  await waitFor(() => expect(container.querySelector('iframe')).toBeNull());
});

test('the timeline keeps the four card rows and adds four, in date order', () => {
  expect(historyRows().map((r) => r.date)).toEqual(['1961 · 13 AUG', '1975', '1989 · 9 NOV', '1990 · 13 JUN', '1990 · 3 OCT', '2014', '2015', '2016 · 18 OCT']);
});

test("The Spread's hours mark today's row from the date in Singapore, with no 'open now' claim", () => {
  story();
  const table = screen.getByRole('table');
  expect(within(table).getByRole('rowheader', { name: 'Mon–Fri · today' })).toBeInTheDocument();
  expect(screen.queryByText(/Open today until/)).toBeNull();
  // a Saturday evening in Singapore is still Saturday when the device is in UTC
  expect(singaporeWeekday(new Date('2026-11-14T15:00:00Z'))).toBe(6);
  expect(singaporeWeekday(new Date('2026-11-14T16:30:00Z'))).toBe(0);
});

test('the years since 9 November 1989 are counted, not written in', () => {
  expect(yearsSinceFall(new Date('2026-11-08T12:00:00Z'))).toBe(36);
  expect(yearsSinceFall(MONDAY)).toBe(37);
  story();
  expect(screen.getByText('Remembrance · MON 9 NOV')).toBeInTheDocument();
});

test("Home's notebook keeps its short story page, with the way to the full story", () => {
  const pages = storyPages(curatedPlace(BERLIN_PLACE_ID)!);
  expect(pages).toHaveLength(1);
  render(<MemoryRouter>{pages[0].node}</MemoryRouter>);
  expect(screen.getByText(/Behind Tembusu College stand two concrete panels/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /The full story/ }).getAttribute('href')).toBe('/nearby/place/curated%3Asg-berlin-wall-fragments-utown#berlin-panels');
});
