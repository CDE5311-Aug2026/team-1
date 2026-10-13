import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import App from './App';
import { STORAGE_PREFIX } from './data/persistentStore';
import { DEFAULT_SETTINGS } from './data/domain';
import { todayKey } from './data/progress';
import { lookupsStore, placeStore, progressStore, settingsStore, streakStore } from './data/stores';

// Cross-page contracts: flows that hand data from one page to another. Fix the pages, not these tests.

function Pathname() {
  return <output data-testid="pathname">{useLocation().pathname}</output>;
}

function renderApp(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <App />
      <Pathname />
    </MemoryRouter>,
  );
}

test('"Near you" opens Nearby only when location is on', async () => {
  const first = renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby\/places$/);
  first.unmount();

  settingsStore.set({ ...DEFAULT_SETTINGS, location: true });
  renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /near you/i }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/nearby$/);
});

test('finishing a lesson phrase adds it to the lookups Moments shows', async () => {
  lookupsStore.set([]);
  renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  expect(lookupsStore.get().map((l) => l.word)).toEqual(['Chope']);
});

test('[Ask + Moments] a phrase asked about in Ask appears in Moments', async () => {
  const user = userEvent.setup();
  const first = renderApp('/ask');
  await user.type(screen.getByRole('textbox', { name: /ask intentai/i }), 'What does paiseh mean?{Enter}');
  first.unmount();
  renderApp('/moments');
  expect(screen.getAllByText(/paiseh/i).length).toBeGreaterThan(0);
});

test('[Onboarding + Today + My Space] Today teaches the chosen topic; the time shows in My Space', async () => {
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  const user = userEvent.setup();
  const first = renderApp('/');
  await user.click(screen.getByRole('button', { name: /get started/i }));
  await user.click(screen.getByRole('button', { name: /1 – 3 years/i }));
  await user.click(screen.getByRole('button', { name: /^continue/i }));
  await user.click(screen.getByRole('button', { name: /^Food/ }));
  await user.click(screen.getByRole('button', { name: /^continue/i }));
  for (let i = 0; i < 3; i += 1) {
    await user.click(screen.getByRole('button', { name: /skip/i }));
  }
  await user.click(screen.getByRole('button', { name: /start learning/i }));
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Tapau', 'Shiok', 'Makan']);
  first.unmount();
  renderApp('/my-space');
  expect(screen.getByText(/1 – 3 years/)).toBeInTheDocument();
});

test('reaching the last card via Detail does not claim all three were learned', async () => {
  renderApp('/');
  await userEvent.click(screen.getAllByRole('button', { name: /^detail$/i })[2]);
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  expect(screen.queryByRole('dialog', { name: 'Can! You did it.' })).not.toBeInTheDocument();
  expect(screen.getByText('1 of 3 learned today')).toBeInTheDocument();
});

test('learning all three shows the completion pop-up', async () => {
  renderApp('/');
  await userEvent.click(screen.getByRole('button', { name: /^start$/i }));
  for (let i = 0; i < 3; i += 1) await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  expect(screen.getByRole('dialog', { name: 'Can! You did it.' })).toBeInTheDocument();
});

test('Nearby "Ask IntentAI" asks about the shown phrase on arrival, once', async () => {
  const plain = renderApp('/ask');
  const seeded = screen.getAllByRole('article').length;
  plain.unmount();

  renderApp('/nearby');
  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/ask$/);
  expect(screen.getByRole('article', { name: /IntentAI answer: What does chope mean\?/ })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(seeded + 1);
});

test('Nearby "Ask IntentAI" carries the place as an Ask context the answer understands', async () => {
  placeStore.set('Office');
  renderApp('/nearby');
  await userEvent.click(screen.getByRole('button', { name: 'Ask IntentAI' }));
  expect(screen.getAllByText(/Office · work/).length).toBeGreaterThan(0);
});

test('Today resets its learned count when the date rolls over, without a reload', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    vi.setSystemTime(new Date(2026, 9, 13, 23, 59));
    progressStore.set({ date: todayKey(), learnedIds: ['chope'] });
    renderApp('/');
    expect(screen.getByText('1 of 3 learned today')).toBeInTheDocument();

    vi.setSystemTime(new Date(2026, 9, 14, 0, 1));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByText('0 of 3 learned today')).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test('Moments "Not sure" opens Ask a local with the phrase drafted', async () => {
  renderApp('/moments');
  await userEvent.click(screen.getAllByRole('button', { name: /not sure/i })[0]);
  const dialog = screen.getByRole('dialog', { name: 'Ask a local' });
  expect(within(dialog).getByRole('textbox', { name: 'Your message' })).toHaveValue('What does “sabo” mean here?');
});

test('[Today + streak] opening the app does not add a day; learning a phrase does', async () => {
  const now = new Date();
  const yesterday = todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  streakStore.set({ date: yesterday, count: 2 });
  renderApp('/');
  expect(screen.getByLabelText('2 day streak')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Start' }));
  await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
  expect(screen.getByLabelText('3 day streak')).toBeInTheDocument();
  expect(streakStore.get()).toEqual({ date: todayKey(), count: 3 });
});
