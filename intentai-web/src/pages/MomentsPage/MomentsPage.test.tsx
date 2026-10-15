import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { addLookup, SEED_LOOKUPS, type Lookup } from '../../data/domain';
import { lookupsStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import MomentsPage from './MomentsPage';

function renderPage() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.moments]}>
      <Routes>
        <Route path={paths.moments} element={<MomentsPage />} />
        <Route path={paths.community} element={<p>community page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function makeLookups(count: number): Lookup[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `l${i + 1}`,
    word: `phrase ${i + 1}`,
    meaning: `meaning ${i + 1}`,
    source: 'AI-generated' as const,
  }));
}

const card = (word: string) => screen.getByRole('article', { name: word });

test('lists every seeded lookup with its source label, count and caption', () => {
  renderPage();

  expect(screen.getByRole('heading', { level: 1, name: 'Moments' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'All lookups' })).toBeInTheDocument();
  expect(screen.getByText('3', { selector: '[data-node-id="4:944"]' })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(within(card('wah, finally ah')).getByText('Confirmed by a local')).toBeInTheDocument();
  expect(within(card('chope')).getByText('To reserve a seat by leaving tissues on it.')).toBeInTheDocument();
  expect(within(card('sabo')).getByText('AI-generated')).toBeInTheDocument();
  expect(screen.getByText('Showing 1–3 of 3 lookups')).toBeInTheDocument();
});

test('the daily card is off by default and shows one saved phrase a day when switched on', async () => {
  renderPage();
  const toggle = screen.getByRole('switch', { name: 'Show a daily card' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(screen.getByText('One saved phrase a day · off by default')).toBeInTheDocument();

  await userEvent.click(toggle);

  expect(settingsStore.get().daily).toBe(true);
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  const pick = SEED_LOOKUPS.find((l) => screen.queryByText(`Today's card: ${l.word}`));
  expect(pick).toBeDefined();
  expect(screen.getAllByText(pick!.meaning).length).toBeGreaterThanOrEqual(1);
});

test('the daily card says so when nothing is saved yet', async () => {
  lookupsStore.set([]);
  settingsStore.set((prev) => ({ ...prev, daily: true }));
  renderPage();
  expect(screen.getByText('No saved phrases yet')).toBeInTheDocument();
});

test('Got it marks a lookup understood and can be undone by pressing again', async () => {
  renderPage();
  const gotIt = within(card('chope')).getByRole('button', { name: 'Got it chope' });
  expect(gotIt).toHaveAttribute('aria-pressed', 'false');

  await userEvent.click(gotIt);
  expect(gotIt).toHaveAttribute('aria-pressed', 'true');
  expect(lookupsStore.get().find((l) => l.id === 'chope')?.got).toBe(true);
  expect(screen.getByRole('status')).toHaveTextContent('Marked as understood');

  await userEvent.click(gotIt);
  expect(lookupsStore.get().find((l) => l.id === 'chope')?.got).toBe(false);
});

test('Met it again counts encounters', async () => {
  renderPage();
  await userEvent.click(within(card('wah, finally ah')).getByRole('button', { name: 'Met it again wah, finally ah' }));
  await userEvent.click(within(card('wah, finally ah')).getByRole('button', { name: /Met it again · 1/ }));

  expect(lookupsStore.get()[0].encounters).toBe(2);
  expect(within(card('wah, finally ah')).getByText('Met it again · 2')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Encounter saved');
});

test('Not sure on an AI-generated lookup sends the user to ask a local', async () => {
  renderPage();
  expect(within(card('sabo')).queryByRole('button', { name: /Got it/ })).not.toBeInTheDocument();

  await userEvent.click(within(card('sabo')).getByRole('button', { name: 'Not sure about sabo' }));

  expect(screen.getByText('community page')).toBeInTheDocument();
});

test('Delete removes a lookup and Undo puts it back in the same place', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Delete chope' }));

  expect(screen.queryByRole('article', { name: 'chope' })).not.toBeInTheDocument();
  expect(lookupsStore.get().map((l) => l.id)).toEqual(['wah', 'sabo']);
  expect(screen.getByRole('status')).toHaveTextContent('Lookup deleted');

  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(lookupsStore.get().map((l) => l.id)).toEqual(['wah', 'chope', 'sabo']);
  expect(card('chope')).toBeInTheDocument();
});

test('pages through three lookups at a time', async () => {
  lookupsStore.set(makeLookups(7));
  renderPage();

  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');

  await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(card('phrase 4')).toBeInTheDocument();
  expect(screen.getByText('Showing 4–6 of 7 lookups')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

test('the page stays valid when its last lookup is deleted', async () => {
  lookupsStore.set(makeLookups(7));
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));

  await userEvent.click(screen.getByRole('button', { name: 'Delete phrase 7' }));

  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByText('Showing 4–6 of 6 lookups')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
});

test('shows an empty state without pagination when nothing is saved', () => {
  lookupsStore.set([]);
  renderPage();

  expect(screen.getByText('No lookups yet. Ask about a phrase to save it here.')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Lookup pages' })).not.toBeInTheDocument();
});

test('Practise opens a dialog to hear the phrase and write an example', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Practise sabo' }));

  const dialog = screen.getByRole('dialog', { name: 'Practise sabo' });
  expect(within(dialog).getByText('To sell someone out — joking or serious; tone decides.')).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Hear it' }));
  // jsdom has no speech synthesis, so the user is told instead of nothing happening.
  expect(screen.getByRole('status')).toHaveTextContent('Audio isn’t available on this device');

  await userEvent.type(within(dialog).getByLabelText('Your example'), 'Eh, don’t sabo me lah.');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Example saved');
  expect(lookupsStore.get().find((item) => item.id === 'sabo')?.example).toBe('Eh, don’t sabo me lah.');

  // Reopening shows the saved example so it can be revised.
  await userEvent.click(screen.getByRole('button', { name: 'Practise sabo' }));
  expect(screen.getByLabelText('Your example')).toHaveValue('Eh, don’t sabo me lah.');
});

test('Practise with no example written saves nothing and says so plainly', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Practise sabo' }));
  await userEvent.click(screen.getByRole('button', { name: 'Done' }));

  expect(screen.getByRole('status')).toHaveTextContent('Practice complete');
  expect(lookupsStore.get().find((item) => item.id === 'sabo')?.example).toBeUndefined();
});

test('a lookup added elsewhere (Ask, lessons) appears first on page 1', () => {
  lookupsStore.set(makeLookups(5));
  lookupsStore.set((prev) => addLookup(prev, { word: 'paiseh…', meaning: 'Sorry or embarrassed.' }, () => 'paiseh'));
  renderPage();

  expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('paiseh…');
  expect(screen.getByText('Showing 1–3 of 6 lookups')).toBeInTheDocument();
});

test('after deleting a lookup, focus stays in the list (on its heading)', async () => {
  renderPage();
  await userEvent.click(screen.getAllByRole('button', { name: /^delete/i })[0]);
  expect(screen.getByRole('heading', { name: 'All lookups' })).toHaveFocus();
});
