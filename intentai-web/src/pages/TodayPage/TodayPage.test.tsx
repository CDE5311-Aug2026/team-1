import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_SETTINGS } from '../../data/domain';
import { placeStore, settingsStore } from '../../data/stores';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { dailyExpressions } from '../../data/expressions';
import TodayPage from './TodayPage';

const three = dailyExpressions([]);

test('renders the list: title, three expression cards, progress at 0 of 3', () => {
  render(<MemoryRouter useTransitions={false}><TodayPage expressions={three} learnedCount={0} onAdvance={vi.fn()} /></MemoryRouter>);

  expect(screen.getByText("Today's three expressions, Can or cannot learn?")).toBeInTheDocument();
  expect(screen.getByText('Chope')).toBeInTheDocument();
  expect(screen.getByText('Can or not?')).toBeInTheDocument();
  expect(screen.getByText('Paiseh')).toBeInTheDocument();
  expect(screen.getByText('0 of 3 learned today')).toBeInTheDocument();
});

test('fetches all three lesson photos while the list shows, before Start', () => {
  const setSrc = vi.spyOn(HTMLImageElement.prototype, 'src', 'set');
  render(<MemoryRouter useTransitions={false}><TodayPage expressions={three} learnedCount={0} onAdvance={vi.fn()} /></MemoryRouter>);

  // Preloads are detached Image objects; rendered icons are in the document.
  const preloaded = setSrc.mock.calls.filter((_, i) => !(setSrc.mock.contexts[i] as HTMLImageElement).isConnected);
  expect(preloaded.map(([url]) => url)).toEqual(three.map((e) => e.photo));
  setSrc.mockRestore();
});

test('Start switches to the stepped view on Chope; Next advances to the next phrase', async () => {
  render(<MemoryRouter useTransitions={false}><TodayPage expressions={three} learnedCount={0} onAdvance={vi.fn()} /></MemoryRouter>);

  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  expect(screen.getByText('Can or not?')).toBeInTheDocument();
});

test('advancing through all three phrases calls onAdvance 3 times and returns to the list', async () => {
  const onAdvance = vi.fn();
  render(<MemoryRouter useTransitions={false}><TodayPage expressions={three} learnedCount={0} onAdvance={onAdvance} /></MemoryRouter>);

  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i })); // Chope -> Can or not?
  await userEvent.click(screen.getByRole('button', { name: /^next$/i })); // Can or not? -> Paiseh
  await userEvent.click(screen.getByRole('button', { name: /^next$/i })); // Paiseh -> back to list

  expect(onAdvance.mock.calls.map(([id]) => id)).toEqual(['chope', 'can-or-not', 'paiseh']);
  // Back in list mode: Start button is visible again.
  expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
});

test('Detail on a card enters the stepped view at that expression', async () => {
  render(<MemoryRouter useTransitions={false}><TodayPage expressions={three} learnedCount={0} onAdvance={vi.fn()} /></MemoryRouter>);

  await userEvent.click(screen.getAllByRole('button', { name: /^detail$/i })[1]);

  expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
  expect(screen.getByText('Can or not?')).toBeInTheDocument();
});

function renderWithRoutes(learnedIds: string[] = []) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TodayPage expressions={three} learnedCount={learnedIds.length} learnedIds={learnedIds} onAdvance={vi.fn()} />} />
        <Route path="/nearby" element={<p>nearby page</p>} />
        <Route path="/nearby/places" element={<p>places page</p>} />
        <Route path="/my-space/notices" element={<p>notices page</p>} />
        <Route path="/moments" element={<p>moments page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// PRD §6: the card opens Nearby Explore whether or not location is on (it used to send users with
// location off to the phrase-setting list, which hid the map from first-time users).
test('Nearby card opens Explore while location is off (the default)', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /nearby/i }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('Nearby card opens Explore when location is on', async () => {
  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /nearby/i }));
  expect(screen.getByText('nearby page')).toBeInTheDocument();
});

test('the bell opens notices', async () => {
  renderWithRoutes();
  await userEvent.click(screen.getByRole('button', { name: /notifications/i }));
  expect(screen.getByText('notices page')).toBeInTheDocument();
});

test('finishing the third phrase shows the completion pop-up, which links to Moments', async () => {
  renderWithRoutes(['chope', 'can-or-not']);
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  for (let i = 0; i < 3; i += 1) {
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  }
  expect(screen.getByRole('dialog', { name: 'Can! You did it.' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'View your lookups' }));
  expect(screen.getByText('moments page')).toBeInTheDocument();
});

test('Nearby card describes the real catalogue instead of a pretend nearby place', () => {
  placeStore.set('Office');
  renderWithRoutes();
  const card = screen.getByRole('button', { name: /nearby/i });
  expect(card).toHaveTextContent('Explore Singapore');
  expect(card).toHaveTextContent(/\d+ places on our map/);
  expect(card).not.toHaveTextContent('Office');
});

test('the mascot leaves the lesson and returns to the list', async () => {
  render(<MemoryRouter useTransitions={false}><TodayPage expressions={three} learnedCount={0} onAdvance={vi.fn()} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Detail' })).toHaveLength(3);
});
