import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { DEFAULT_ONBOARDING, isOnboarding, type Onboarding } from '../../data/domain';
import { STORAGE_PREFIX, resetPersistentStores } from '../../data/persistentStore';
import { onboardingStore, profileStore } from '../../data/stores';
import { paths } from '../../routes';
import { setReducedMotion } from '../../test/media';
import { COMPLETED_ONBOARDING } from '../../test/onboardingFixture';
import OnboardingFlow from './OnboardingFlow';
import { COVER_OPEN_MS } from './steps/Welcome';

const ALL_ANSWERS: Onboarding = { ...COMPLETED_ONBOARDING, done: false, completedAt: null };

afterEach(() => {
  vi.useRealTimers();
});

/** Seeds the onboarding record (null = first launch, no record) and opens /onboarding. */
function renderFlow(seed: Onboarding | null) {
  if (seed === null) window.localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
  else window.localStorage.setItem(`${STORAGE_PREFIX}onboarding`, JSON.stringify(seed));
  resetPersistentStores();
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.onboarding]}>
      <Routes>
        <Route path={paths.onboarding} element={<OnboardingFlow />} />
        <Route path={paths.today} element={<p>today page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const heading = () => screen.getByRole('heading', { level: 1 });
const cta = (name: string | RegExp = /continue/i) => screen.getByRole('button', { name });
const segmentFills = () => Array.from(document.querySelectorAll('[data-fill]')).map((el) => Number(el.getAttribute('data-fill')));
const toastText = () => screen.getByRole('status').textContent;

test('O1 welcome: no top bar, no passport, no flow CTA; only Start the hunt', () => {
  renderFlow(null);
  expect(heading()).toHaveTextContent('Welcome to the Singapore Treasure Hunt');
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Your passport' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Start the hunt']);
});

test('Start the hunt opens the cover, then shows the first question after 850 ms', () => {
  vi.useFakeTimers();
  renderFlow(null);
  fireEvent.click(cta('Start the hunt'));
  expect(screen.getByTestId('passport-cover')).toHaveAttribute('data-state', 'opening');
  // A second tap while opening is ignored.
  fireEvent.click(cta('Start the hunt'));
  act(() => vi.advanceTimersByTime(COVER_OPEN_MS - 1));
  expect(heading()).toHaveTextContent('Welcome to the');
  act(() => vi.advanceTimersByTime(1));
  expect(heading()).toHaveTextContent('Where are you from?');
  act(() => vi.advanceTimersByTime(COVER_OPEN_MS * 2));
  expect(heading()).toHaveTextContent('Where are you from?');
});

test('with reduced motion Start the hunt goes straight to the first question', async () => {
  setReducedMotion(true);
  renderFlow(null);
  await userEvent.click(cta('Start the hunt'));
  expect(heading()).toHaveTextContent('Where are you from?');
});

test('question shell: back, progress 1/6 with a 35% partial fill, passport, disabled CTA', () => {
  setReducedMotion(true);
  renderFlow({ ...DEFAULT_ONBOARDING });
  fireEvent.click(cta('Start the hunt'));
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  const bar = screen.getByRole('progressbar');
  expect(bar).toHaveAttribute('aria-valuenow', '1');
  expect(bar).toHaveAttribute('aria-valuemax', '6');
  expect(screen.getByText('1/6')).toBeInTheDocument();
  expect(segmentFills()).toEqual([35, 0, 0, 0, 0, 0]);
  expect(screen.getByRole('region', { name: 'Your passport' })).toBeInTheDocument();
  expect(cta()).toHaveAttribute('aria-disabled', 'true');
});

test('blocked Continue stays on the step and toasts the canvas copy', async () => {
  renderFlow({ ...DEFAULT_ONBOARDING, from: 'India', time: 'lt3m', role: 'student', language: 'en' });
  expect(heading()).toHaveTextContent('Where do you spend most of your time?');
  await userEvent.click(cta());
  expect(heading()).toHaveTextContent('Where do you spend most of your time?');
  expect(toastText()).toBe('Tap the map to drop your pin');
});

test('blocked toasts: Pick one to continue on a choice step, Tap all 4 topics on topics', async () => {
  const { unmount } = renderFlow({ ...DEFAULT_ONBOARDING, from: 'India' });
  expect(heading()).toHaveTextContent('How long have you been in Singapore?');
  await userEvent.click(cta());
  expect(toastText()).toBe('Pick one to continue');
  unmount();
  renderFlow({ ...ALL_ANSWERS, topics: ['food'] });
  expect(heading()).toHaveTextContent('Rank the topics you enjoy most');
  await userEvent.click(cta('Stamp my passport'));
  expect(toastText()).toBe('Tap all 4 topics to set the order');
  expect(onboardingStore.get().done).toBe(false);
});

test('resumes at the first unanswered step with earlier segments full', () => {
  renderFlow({ ...DEFAULT_ONBOARDING, from: 'India', time: '1to3y' });
  expect(heading()).toHaveTextContent('What brings you to Singapore?');
  expect(screen.getByText('3/6')).toBeInTheDocument();
  expect(segmentFills()).toEqual([100, 100, 35, 0, 0, 0]);
});

test('Continue on an answered step moves forward; Back moves one step back, down to welcome', async () => {
  renderFlow({ ...DEFAULT_ONBOARDING, from: 'India', time: '1to3y' });
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(heading()).toHaveTextContent('How long have you been in Singapore?');
  expect(document.querySelector('[data-step="time"]')).toHaveAttribute('data-dir', 'back');
  // Answered: full fill, CTA enabled, Continue moves on.
  expect(segmentFills()).toEqual([100, 100, 0, 0, 0, 0]);
  expect(cta()).not.toHaveAttribute('aria-disabled');
  await userEvent.click(cta());
  expect(heading()).toHaveTextContent('What brings you to Singapore?');
  expect(document.querySelector('[data-step="role"]')).toHaveAttribute('data-dir', 'fwd');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(heading()).toHaveTextContent('Welcome to the');
});

test('the current step field is the active one on the passport', () => {
  renderFlow({ ...DEFAULT_ONBOARDING, from: 'India' });
  const time = screen.getByText('IN SINGAPORE').closest('[data-field]')!;
  expect(time.querySelector('[data-caret]')).not.toBeNull();
});

test('eye toggle writes hidden to the store and toasts', async () => {
  renderFlow({ ...DEFAULT_ONBOARDING, from: 'India' });
  const passport = screen.getByRole('region', { name: 'Your passport' });
  expect(within(passport).queryByText('India')).not.toBeInTheDocument();
  await userEvent.click(within(passport).getByRole('button', { name: 'Show home country' }));
  expect(onboardingStore.get().hidden).toEqual([]);
  expect(within(passport).getByText('India')).toBeInTheDocument();
  expect(toastText()).toBe('Home country shown on your passport');
  await userEvent.click(within(passport).getByRole('button', { name: 'Hide home country' }));
  expect(onboardingStore.get().hidden).toEqual(['from']);
  expect(toastText()).toBe('Home country hidden on your passport');
  // Persisted, not just in memory.
  expect(JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}onboarding`)!).hidden).toEqual(['from']);
});

test('Stamp my passport finishes: done + date + profile, then the done shell with a stamp and no flow CTA', async () => {
  renderFlow(ALL_ANSWERS);
  await userEvent.click(cta('Stamp my passport'));
  const saved = onboardingStore.get();
  expect(saved.done).toBe(true);
  expect(saved.completedAt).not.toBeNull();
  expect(isOnboarding(saved)).toBe(true);
  expect(profileStore.get()).toMatchObject({ from: 'China', time: 'Less than 3 months', role: 'Student intern' });
  // Stays on the flow (no redirect home after finishing inside it).
  expect(heading()).toHaveTextContent('Your passport is ready');
  expect(screen.queryByText('today page')).not.toBeInTheDocument();
  expect(screen.getByText('6/6')).toBeInTheDocument();
  expect(segmentFills()).toEqual([100, 100, 100, 100, 100, 100]);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'All questions answered');
  expect(within(screen.getByRole('region', { name: 'Your passport' })).getByTestId('passport-stamp')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /continue|stamp my passport/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
});

test('Back from the stamp returns to topics with answers kept and still done', async () => {
  renderFlow(ALL_ANSWERS);
  await userEvent.click(cta('Stamp my passport'));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(heading()).toHaveTextContent('Rank the topics you enjoy most');
  expect(onboardingStore.get()).toMatchObject({ done: true, topics: ALL_ANSWERS.topics });
  // Re-stamping is allowed and lands on the stamp again.
  await userEvent.click(cta('Stamp my passport'));
  expect(heading()).toHaveTextContent('Your passport is ready');
});

test('already onboarded when the flow mounts: goes home', () => {
  renderFlow(COMPLETED_ONBOARDING);
  expect(screen.getByText('today page')).toBeInTheDocument();
});
