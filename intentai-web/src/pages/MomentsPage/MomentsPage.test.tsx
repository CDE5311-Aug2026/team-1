import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { expect, test } from 'vitest';
import { EMPTY_SOCIAL, communitySocialStore } from '../../data/community/social';
import { recapStore } from '../../data/moments/recapStore';
import { explorePersonalStore, insightsStore, lookupsStore, openedCardsStore, questionsStore, tipsStore } from '../../data/stores';
import { markVisited } from '../../features/nearby/actions';
import { patterns, paths } from '../../routes';
import MomentsPage from './MomentsPage';

function Probe({ name }: { name: string }) {
  const { state } = useLocation();
  const params = useParams();
  return (
    <p data-testid="probe">
      {name} {params.cardId ?? params.placeKey ?? ''} {(state as { prompt?: string; askLocal?: string } | null)?.prompt ?? (state as { askLocal?: string } | null)?.askLocal ?? ''}
    </p>
  );
}

function renderPage() {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.moments]}>
      <Routes>
        <Route path={paths.moments} element={<MomentsPage />} />
        <Route path={patterns.card} element={<Probe name="card" />} />
        <Route path={patterns.place} element={<Probe name="place" />} />
        <Route path={paths.ask} element={<Probe name="ask" />} />
        <Route path={paths.community} element={<Probe name="community" />} />
        <Route path={paths.nearby} element={<Probe name="nearby" />} />
        <Route path={patterns.question} element={<Probe name="question" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const checkIn = (key: `curated:${string}`, date = '2026-11-02') =>
  explorePersonalStore.set((d) => ({ ...d, places: [...d.places, { placeKey: key, saved: false, visited: true, visitedOn: date, updatedAt: `${date}T00:00:00.000Z` }] }));

test('new user: no stamps, locked outlines, and the empty states say what to do', () => {
  lookupsStore.set([]);
  renderPage();
  expect(screen.getByRole('heading', { level: 1, name: 'Moments' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Snap' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Rank: Visitor\. 3 more cards to Explorer/ })).toBeInTheDocument();
  expect(screen.getByText(/No stamps yet\. Check in at a place in/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Chinatown: no stamp yet. See its cards.' })).toBeInTheDocument();
  expect(screen.getByText('Nothing collected yet')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open a card' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: /Recap/ })).toBeDisabled();
});

test('a check-in collects the stamp at once; ink counts the opened cards of that place', () => {
  openedCardsStore.set(['chicken-rice', 'laksa']);
  renderPage();
  act(() => {
    markVisited('curated:sg-thian-hock-keng-temple', 'Thian Hock Keng Temple', true);
  });
  expect(screen.getByRole('button', { name: 'Chinatown, 1 of 3 cards opened. Open this stamp.' })).toBeInTheDocument();
  // Katong has an opened card but no check-in: still an outline
  expect(screen.getByRole('button', { name: 'Katong: no stamp yet. See its cards.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /1 of 100 places checked in/ })).toBeInTheDocument();
});

test('tapping a stamp fans out its cards; opening a locked one marks it opened and opens the card', async () => {
  checkIn('curated:sg-thian-hock-keng-temple');
  openedCardsStore.set(['chicken-rice']);
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: /^Chinatown, 1 of 3/ }));
  const sheet = screen.getByRole('dialog', { name: 'Chinatown' });
  expect(within(sheet).getByText(/Checked in 2 Nov 2026/)).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: /Hainanese chicken rice.*: opened/i })).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: /^Add ink:/ })).toBeInTheDocument();
  expect(within(sheet).getByRole('link', { name: 'Open place' })).toHaveAttribute('href', '/place/sg-chinatown');
  await user.click(within(sheet).getByRole('button', { name: /^Thian Hock Keng.*not opened yet/ }));
  expect(openedCardsStore.get()).toContain('thian-hock-keng');
  expect(await screen.findByTestId('probe')).toHaveTextContent('card thian-hock-keng');
});

test('an outline stamp sends you to Nearby to check in', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Chinatown: no stamp yet. See its cards.' }));
  const sheet = screen.getByRole('dialog', { name: 'Chinatown' });
  expect(within(sheet).getByText(/Not checked in yet/)).toBeInTheDocument();
  expect(within(sheet).getByRole('link', { name: 'Check in in Nearby' })).toHaveAttribute('href', '/nearby?area=sg-chinatown');
  expect(within(sheet).queryByRole('button', { name: /Add ink/ })).not.toBeInTheDocument();
});

test('Collected: filters by topic; a saved insight asks the question again in Ask', async () => {
  openedCardsStore.set(['chicken-rice', 'thian-hock-keng']);
  tipsStore.set([{ id: 't1', cardId: 'chicken-rice', questionId: 'q1', text: 'Go early.', by: 'Mei', createdAt: 1, cited: 0, sample: true }]);
  insightsStore.set([{ id: 'i1', question: 'Why is Thian Hock Keng important?', kind: 'card', title: 'Thian Hock Keng', summary: 'Old temple.', cardId: 'thian-hock-keng', savedAt: 2 }]);
  const user = userEvent.setup();
  renderPage();
  expect(screen.queryByText('Example')).toBeNull();
  await user.click(screen.getByRole('button', { name: /^Food, 2/ }));
  expect(screen.getByRole('button', { name: /^Food, 2/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Open Hainanese chicken rice/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Mei’s tip/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Open Thian Hock Keng/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^Ask, 1/ }));
  await user.click(screen.getByRole('button', { name: 'Ask again: Why is Thian Hock Keng important?' }));
  expect(screen.getByTestId('probe')).toHaveTextContent('ask Why is Thian Hock Keng important?');
});

test('phrases keep their source; an AI-generated one can go to a local', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: /^Phrases, 3/ }));
  expect(within(screen.getByRole('article', { name: 'Phrase: chope' })).getByText('Confirmed by a local')).toBeInTheDocument();
  expect(within(screen.getByRole('article', { name: 'Phrase: sabo' })).getByText('AI-generated')).toBeInTheDocument();
  await user.click(screen.getAllByRole('button', { name: /not sure/i })[0]);
  expect(screen.getByTestId('probe')).toHaveTextContent('community What does “sabo” mean here?');
});

test('a phrase sheet deletes with Undo', async () => {
  const user = userEvent.setup();
  renderPage();
  await user.click(within(screen.getByRole('article', { name: 'Phrase: chope' })).getAllByRole('button')[0]);
  await user.click(within(screen.getByRole('dialog', { name: 'chope' })).getByRole('button', { name: 'Delete phrase' }));
  expect(lookupsStore.get().map((l) => l.id)).not.toContain('chope');
});

test('rank sheet: rank from opened cards and badges with progress', async () => {
  openedCardsStore.set(['chicken-rice', 'thian-hock-keng', 'temasek-singapura']);
  checkIn('curated:sg-thian-hock-keng-temple');
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: /^Rank: Explorer/ }));
  const sheet = screen.getByRole('dialog', { name: 'Your rank: Explorer' });
  expect(within(sheet).getByText('5 more cards to Insider')).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: 'First stamp: earned' })).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: 'Historian: earned' })).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: /^Two districts: 1 of 2/ })).toBeInTheDocument();
  expect(within(sheet).getByRole('listitem', { name: /^Full set: 2 of 3/ })).toBeInTheDocument();
});

test('recap: sort the facts, then a score; results are stored', async () => {
  const user = userEvent.setup();
  renderPage();
  expect(screen.getByText('3 facts · about 1 min')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Recap/ }));
  const recap = screen.getByRole('dialog', { name: 'Recap' });
  await user.click(within(recap).getByRole('button', { name: 'Show the answer' }));
  await user.click(within(recap).getByRole('button', { name: 'I knew it' }));
  await user.click(within(recap).getByRole('button', { name: 'See it again' }));
  await user.click(within(recap).getByRole('button', { name: 'I knew it' }));
  expect(within(recap).getByRole('heading', { name: 'You knew 2 of 3' })).toBeInTheDocument();
  expect(Object.values(recapStore.get().results).sort()).toEqual(['again', 'knew', 'knew']);
  expect(recapStore.get().last).toMatchObject({ knew: 2, total: 3 });
});

test('snap: picking a card photo opens that card (no match percentage)', async () => {
  checkIn('curated:sg-thian-hock-keng-temple');
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Snap' }));
  const sheet = screen.getByRole('dialog', { name: 'Snap a moment' });
  await user.click(within(sheet).getByRole('button', { name: 'Thian Hock Keng Temple' }));
  expect(openedCardsStore.get()).toContain('thian-hock-keng');
  const found = screen.getByRole('dialog', { name: /Thian Hock Keng/ });
  expect(within(found).getByText('CARD FOUND')).toBeInTheDocument();
  expect(within(found).getByText('+1 card · ink added to your stamp')).toBeInTheDocument();
  expect(within(found).queryByText(/%/)).not.toBeInTheDocument();
  expect(within(found).getByRole('link', { name: /Open card/ })).toHaveAttribute('href', '/card/thian-hock-keng');
});

test('Community conversations saved to Moments: the live thread while it exists, the snapshot after', async () => {
  const snap = (threadId: string, title: string) => ({ threadId, title, body: 'Body text.', topic: 'Food', replies: [{ author: 'A local', text: 'Try the stall at the corner.' }], savedAt: 5 });
  questionsStore.set([]);
  communitySocialStore.set({ ...EMPTY_SOCIAL, saved: [snap('gone', 'Where is good laksa?')] });
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: /^Community, 1/ }));
  await user.click(screen.getByRole('button', { name: 'Open saved conversation: Where is good laksa?' }));
  const sheet = screen.getByRole('dialog', { name: 'Where is good laksa?' });
  expect(within(sheet).getByText('Try the stall at the corner.')).toBeInTheDocument();
  expect(within(sheet).getByText(/no longer in Community/)).toBeInTheDocument();
});

test('a saved conversation whose question still exists opens the question', async () => {
  questionsStore.set([{ id: 'q-live', text: 'Is chope rude?', status: 'posted', postedAt: 1 } as never]);
  communitySocialStore.set({ ...EMPTY_SOCIAL, saved: [{ threadId: 'q-live', title: 'Is chope rude?', body: '', topic: 'Phrases', replies: [], savedAt: 5 }] });
  const user = userEvent.setup();
  renderPage();
  await user.click(screen.getByRole('button', { name: 'Open saved conversation: Is chope rude?' }));
  expect(screen.getByTestId('probe')).toHaveTextContent('question');
});
