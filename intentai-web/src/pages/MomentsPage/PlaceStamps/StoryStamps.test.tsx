import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { placeStoriesStore } from '../../../data/stores';
import StoryStamps from './StoryStamps';

const renderRow = () => render(<MemoryRouter><StoryStamps /></MemoryRouter>);

test('an unstamped story place shows no row', () => {
  placeStoriesStore.set({ chinatown: { opened: ['food'], checkedIn: true, stamped: false } });
  const { container } = renderRow();
  expect(container).toBeEmptyDOMElement();
});

test('story stamps: newest first, each linking to its place story, with credits once', () => {
  placeStoriesStore.set({
    chinatown: { opened: [], checkedIn: false, stamped: true, stampedOn: '2026-10-20' },
    'berlin-wall-fragments': { opened: [], checkedIn: false, stamped: true, stampedOn: '2026-10-28' },
  });
  renderRow();
  const links = within(screen.getByRole('list', { name: 'Place stories' })).getAllByRole('link');
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/place/berlin-wall-fragments', '/place/chinatown']);
  expect(screen.getAllByText(/^Credits:/)).toHaveLength(1);
});
