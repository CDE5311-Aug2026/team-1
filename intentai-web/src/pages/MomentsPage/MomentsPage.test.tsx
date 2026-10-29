import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import { addLookup, type Lookup } from '../../data/domain';
import { collectedStore, lookupsStore, onboardingStore, profileStore, streakStore } from '../../data/stores';
import { todayKey } from '../../data/progress';
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

const tile = (title: string) => screen.getByRole('button', { name: new RegExp(`^\\d\\d ${title} `) });

test("today's three replace the daily card switch, in a row above All lookups", () => {
  renderPage();
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: "Today's three" })).toBeInTheDocument();
  for (const title of ['Chope', 'Can or not?', 'Paiseh']) {
    expect(tile(title.replace('?', '\\?'))).toHaveAttribute('aria-expanded', 'false');
  }
});

test("today's three follow the profile's Singlish topics", () => {
  profileStore.set((prev) => ({ ...prev, topics: ['Work', 'Food'] }));
  renderPage();
  expect(screen.getAllByRole('button', { name: /^0[1-3] / })).toHaveLength(3);
  for (const title of ['Can or not\\?', 'Tapau', 'Steady']) expect(tile(title)).toBeInTheDocument();
});

test('tapping a tile opens its full card under the row; another tile swaps it, the same tile closes it', async () => {
  renderPage();
  await userEvent.click(tile('Chope'));
  expect(tile('Chope')).toHaveAttribute('aria-expanded', 'true');
  const detail = screen.getByRole('region', { name: 'Chope' });
  expect(within(detail).getByText('/chohp/')).toBeInTheDocument();
  expect(within(detail).getByText('“I chope a table first, you go order.”')).toBeInTheDocument();
  expect(within(detail).getByRole('button', { name: /play audio/i })).toBeInTheDocument();

  await userEvent.click(tile('Paiseh'));
  expect(tile('Chope')).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('region', { name: 'Chope' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Paiseh' })).toBeInTheDocument();

  await userEvent.click(tile('Paiseh'));
  expect(screen.queryByRole('region', { name: 'Paiseh' })).not.toBeInTheDocument();
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

const passport = () => screen.getByRole('region', { name: 'Singlish passport' });

test('the passport shows collected phrases, topics, days and the quiz level', () => {
  profileStore.set((prev) => ({ ...prev, level: 'Experienced' }));
  collectedStore.set(['chope', 'tapau']);
  streakStore.set({ date: todayKey(), count: 4 });
  renderPage();
  expect(within(passport()).getByRole('heading', { name: 'My phrasebook' })).toBeInTheDocument();
  // 2 collected phrases + "chope" and "wah, finally ah" are not Got it in the seed, so 2.
  expect(within(passport()).getByText('2', { selector: '[data-stat="phrases"]' })).toBeInTheDocument();
  expect(within(passport()).getByText('4', { selector: '[data-stat="topics"]' })).toBeInTheDocument();
  expect(within(passport()).getByText('4', { selector: '[data-stat="days"]' })).toBeInTheDocument();
  expect(within(passport()).getByText('Experienced')).toBeInTheDocument();
  expect(within(passport()).queryByText(/collect your first phrase/)).toBeNull();
});

test('an empty passport says how to collect the first phrase', () => {
  collectedStore.set([]);
  lookupsStore.set([]);
  renderPage();
  expect(within(passport()).getByText('0', { selector: '[data-stat="phrases"]' })).toBeInTheDocument();
  expect(within(passport()).getByText('Open a card below to collect your first phrase.')).toBeInTheDocument();
});

test('no quiz level means no level stamp', () => {
  profileStore.set((prev) => ({ ...prev, level: undefined }));
  renderPage();
  expect(within(passport()).queryByText(/Beginner|Intermediate|Experienced/)).toBeNull();
});

test("opening a Today's three card collects it, stamps it and counts a learning day", async () => {
  streakStore.set({ date: '', count: 0 });
  renderPage();
  expect(within(tile('Chope')).queryByText('got it')).toBeNull();
  await userEvent.click(tile('Chope'));
  expect(collectedStore.get()).toEqual(['chope']);
  expect(within(tile('Chope')).getByText('got it')).toBeInTheDocument();
  expect(streakStore.get().date).toBe(todayKey());
  const topics = within(screen.getByRole('list', { name: 'My topics' })).getAllByRole('listitem');
  expect(topics.map((t) => t.textContent)).toContain('Daily life1 of 3');
});

test('My topics lists all four Singlish topics when the profile has none; the culture ranking is ignored', () => {
  onboardingStore.set((prev) => ({ ...prev, topics: ['history', 'food', 'festival', 'monument'] }));
  profileStore.set((prev) => ({ ...prev, topics: undefined }));
  renderPage();
  const topics = within(screen.getByRole('list', { name: 'My topics' })).getAllByRole('listitem');
  expect(topics.map((t) => t.textContent)).toEqual(['Work0 of 3', 'Food0 of 3', 'Daily life0 of 3', 'Getting around0 of 3']);
});
