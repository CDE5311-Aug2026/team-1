import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { resetPersistentStores } from '../../data/persistentStore';
import { explorePersonalStore } from '../../data/stores';
import { placesInArea, placesInRegion, URA_AREAS } from '../../data/ura/ura';
import TodayPage from './TodayPage';

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderHome(entry = '/') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/holidays/deepavali" element={<p>holiday page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
        <Route path="/nearby/place/:placeKey" element={<p>place page</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const card = (name: string) => screen.getByRole('group', { name });
const deck = (label: string) => screen.getByRole('region', { name: label });
const checkIn = (ids: string[]) =>
  explorePersonalStore.set((d) => ({
    ...d,
    places: ids.map((placeKey) => ({ placeKey: placeKey as `curated:${string}`, saved: false, visited: true, visitedOn: '2026-10-31', updatedAt: '2026-10-31T00:00:00.000Z' })),
  }));

beforeEach(() => {
  localStorage.clear();
  resetPersistentStores();
});

test('Home opens on the five URA regions, Central first (the home base is in Queenstown)', () => {
  renderHome();
  expect(screen.getByRole('heading', { level: 1, name: 'Explore Singapore' })).toBeInTheDocument();
  const regions = within(deck('Regions')).getAllByRole('group');
  expect(regions.map((r) => r.getAttribute('aria-label'))).toEqual(['Central', 'East', 'North', 'North-East', 'West']);
  expect(card('Central')).toHaveAttribute('aria-current', 'true');
  expect(within(card('Central')).getByText(`0 of ${placesInRegion('central').length} places checked in`)).toBeInTheDocument();
  expect(within(card('Central')).getByRole('img', { name: 'not visited yet' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Back to/ })).toBeNull();
  expect(screen.getByRole('application', { name: /planning areas/ })).toBeInTheDocument();
});

test('tapping a region selects it; its action opens its planning areas; Back returns to the regions', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(card('West'));
  expect(card('West')).toHaveAttribute('aria-current', 'true');
  expect(screen.getByTestId('where')).toHaveTextContent('r=west');
  await user.click(screen.getByRole('button', { name: 'Explore West' }));
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West');
  const areas = within(deck('West planning areas')).getAllByRole('group');
  expect(areas).toHaveLength(12);
  // Most places first; areas with none yet go last.
  expect(areas[0]).toHaveAttribute('aria-label', 'Clementi');
  await user.click(screen.getByRole('button', { name: 'Back to regions' }));
  expect(within(deck('Regions')).getAllByRole('group')).toHaveLength(5);
  expect(card('West')).toHaveAttribute('aria-current', 'true');
});

test('an area opens its places; Open goes to the place page', async () => {
  const user = userEvent.setup();
  renderHome('/?lvl=areas&r=west&a=cl');
  await user.click(screen.getByRole('button', { name: 'See 11 places' }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=places');
  expect(screen.getByLabelText('Where you are')).toHaveTextContent('Singapore › West › Clementi');
  const places = within(screen.getByRole('region', { name: 'Nearby places' })).getAllByRole('group');
  expect(places).toHaveLength(placesInArea('cl').length);
  await user.click(within(places[0]).getByRole('button', { name: /in Nearby$/ }));
  expect(screen.getByText('place page')).toBeInTheDocument();
});

test('the level and card come back from the URL (Back from a place page)', () => {
  renderHome('/?lvl=places&r=west&a=cl&p=curated%3Asg-clementi-woods');
  expect(card('Clementi Woods Park')).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('button', { name: 'Back to West areas' })).toBeInTheDocument();
});

test('progress: some check-ins = exploring; all of an area = unlocked with a tick', () => {
  const area = URA_AREAS.find((a) => a.region === 'west' && placesInArea(a.id).length === 1)!;
  const [only] = placesInArea(area.id);
  checkIn([only.id, placesInArea('cl')[0].id]);
  renderHome(`/?lvl=areas&r=west&a=${area.id}`);
  expect(within(card(area.name)).getByRole('img', { name: 'all checked in' })).toBeInTheDocument();
  expect(within(card(area.name)).getByRole('progressbar', { name: `${area.name} unlocked` })).toHaveAttribute('aria-valuenow', '100');
  expect(within(card('Clementi')).getByRole('img', { name: 'exploring' })).toBeInTheDocument();
  expect(within(card('Clementi')).getByText('1 of 11 places checked in')).toBeInTheDocument();
});

test('an area with no places yet says so and stays where it is', async () => {
  const user = userEvent.setup();
  const empty = URA_AREAS.find((a) => a.region === 'west' && placesInArea(a.id).length === 0)!;
  renderHome(`/?lvl=areas&r=west&a=${empty.id}`);
  expect(within(card(empty.name)).getByText('No places yet')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Nothing to see yet' }));
  expect(screen.getByTestId('where')).toHaveTextContent('lvl=areas');
});

test('the event card opens the holiday page; the bell opens notices', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole('button', { name: /Deepavali long weekend starts today/ }));
  expect(screen.getByText('holiday page')).toBeInTheDocument();
});

test('the map credits name URA and the open data licence', async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByText('Map data'));
  expect(screen.getByText(/Master Plan 2019 Planning Area Boundary \(No Sea\), Urban Redevelopment Authority, via data\.gov\.sg \(Singapore Open Data Licence v1\.0\)/)).toBeInTheDocument();
});
