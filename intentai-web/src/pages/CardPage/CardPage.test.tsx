import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { openedCardsStore, tipsStore } from '../../data/stores';
import CardPage from './CardPage';

function renderAt(id: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[`/card/${id}`]}>
      <Routes>
        <Route path="/card/:cardId" element={<CardPage />} />
        <Route path="/place/:placeKey" element={<p>place page</p>} />
        <Route path="/nearby" element={<p>nearby page</p>} />
        <Route path="/moments" element={<p>moments page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('opening a card marks it opened and shows where it sits in its place', () => {
  renderAt('sri-mariamman');
  expect(openedCardsStore.get()).toContain('sri-mariamman');
  expect(screen.getByRole('heading', { level: 1, name: 'Sri Mariamman Temple' })).toBeInTheDocument();
  expect(screen.getByText('2 of 3')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Next · Monument\s*Thian Hock Keng Temple/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /See it on the Nearby map/ })).toHaveAttribute('href', expect.stringContaining('sel=curated%3Asg-sri-mariamman-temple'));
  expect(screen.getByText(/Photo: Chainwit/)).toBeInTheDocument();
});

test('food: Try it nearby is the card’s try link with the catalogue’s checked details; no tip yet says so', () => {
  renderAt('chicken-rice');
  const tryIt = screen.getByRole('region', { name: 'Try it nearby' });
  expect(within(tryIt).getByText('Tian Tian Hainanese Chicken Rice')).toBeInTheDocument();
  expect(within(tryIt).getByText(/Maxwell Food Centre/)).toBeInTheDocument();
  expect(screen.getByText(/No local tip on this card yet/)).toBeInTheDocument();
});

test('food: a local tip from Community shows, signed, with no Example tag in the demo build', () => {
  tipsStore.set([{ id: 't1', cardId: 'chicken-rice', questionId: 'q1', text: 'Go before noon.', by: 'Mei', createdAt: 1, cited: 0, sample: true }]);
  renderAt('chicken-rice');
  const tip = screen.getByRole('region', { name: 'Local tip' });
  expect(within(tip).getByText('“Go before noon.”')).toBeInTheDocument();
  expect(within(tip).queryByText('Example')).toBeNull();
});

test('monument: key numbers and things to look for come from the facts', async () => {
  renderAt('thian-hock-keng');
  expect(within(screen.getByRole('region', { name: 'Look for' })).getByText('Built with traditional joinery, without nails.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Read more' }));
  expect(screen.getByRole('button', { name: 'Read less' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Sailors gave thanks here for a safe voyage from China.')).toBeInTheDocument();
});

test('festival with a checked video: poster with a play button; no invented next date', async () => {
  renderAt('lunar-new-year');
  expect(screen.getByRole('region', { name: 'When' })).toHaveTextContent('Chinese · January or February');
  expect(screen.queryByRole('button', { name: /Remind me/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Play video: Chinese New Year' }));
  expect(screen.getByTitle('Chinese New Year')).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com/embed/DFkEZ8z4lmc'));
});

test('history: a timeline of the card’s dated sentences', () => {
  renderAt('sentosa-name');
  const items = within(screen.getByRole('region', { name: 'Timeline' })).getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('Late 16th century');
  expect(items.some((i) => i.textContent?.includes('1972'))).toBe(true);
});

test('when every card of the place is opened: That’s all N cards here + Collect stamp', async () => {
  openedCardsStore.set(['chicken-rice', 'sri-mariamman']);
  renderAt('thian-hock-keng');
  expect(screen.getByRole('heading', { name: 'That’s all 3 cards here' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Collect stamp/ }));
  expect(screen.getByText(/Moments once you check in/)).toBeInTheDocument();
});

test('not all opened: no stamp block', () => {
  renderAt('thian-hock-keng');
  expect(screen.queryByRole('button', { name: /Collect stamp/ })).not.toBeInTheDocument();
});

test('unknown card', () => {
  renderAt('nope');
  expect(screen.getByRole('heading', { name: 'Card not found' })).toBeInTheDocument();
});
