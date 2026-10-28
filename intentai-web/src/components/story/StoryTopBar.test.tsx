import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { expect, test } from 'vitest';
import { markOpened } from '../../data/stores';
import { paths, patterns } from '../../routes';
import { StoryTopBar } from './StoryTopBar';

function PlaceProbe() {
  const location = useLocation();
  return <p data-testid="place">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderBar(facet: 'food' | 'monument' | 'festival' | 'history') {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.placeCard('berlin-wall-fragments', facet)]}>
      <Routes>
        <Route path={patterns.placeCard} element={<StoryTopBar placeId="berlin-wall-fragments" facet={facet} backLabel="Berlin Wall Fragments" />} />
        <Route path={patterns.homePlace} element={<PlaceProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const segments = () => Array.from(document.querySelectorAll('[data-segment]')).map((el) => el.getAttribute('data-segment'));

test('direct History entry with only History opened shows "4 of 4" and grey segments 1 to 3', () => {
  markOpened('berlin-wall-fragments', 'history');
  renderBar('history');
  expect(screen.getByText('4 of 4')).toBeInTheDocument();
  expect(segments()).toEqual(['todo', 'todo', 'todo', 'current']);
});

test('segments other than the current one are orange only when that facet was opened', () => {
  markOpened('berlin-wall-fragments', 'food');
  markOpened('berlin-wall-fragments', 'history');
  renderBar('monument');
  expect(screen.getByText('2 of 4')).toBeInTheDocument();
  expect(segments()).toEqual(['done', 'current', 'todo', 'done']);
  // The current segment fills with the .a-seg animation.
  expect(document.querySelector('[data-segment="current"] .a-seg')).not.toBeNull();
});

test('the segment strip is decorative', () => {
  renderBar('food');
  expect(document.querySelector('[data-segment]')!.parentElement).toHaveAttribute('aria-hidden', 'true');
});

test('back link goes up to the place, with the rail on this card', async () => {
  renderBar('festival');
  await userEvent.click(screen.getByRole('link', { name: 'Back to Berlin Wall Fragments' }));
  expect(screen.getByTestId('place')).toHaveTextContent(`${paths.homePlace('berlin-wall-fragments')} {"railIndex":2}`);
});
