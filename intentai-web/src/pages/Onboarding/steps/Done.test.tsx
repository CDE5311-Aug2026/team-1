import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import type { Onboarding } from '../../../data/domain';
import { HOME_PLACES } from '../../../data/homePlaces';
import { STORAGE_PREFIX, resetPersistentStores } from '../../../data/persistentStore';
import { onboardingStore } from '../../../data/stores';
import { distanceM } from '../../../features/nearby/geo';
import { paths } from '../../../routes';
import { setReducedMotion } from '../../../test/media';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import { formatDistance } from '../areas';
import { PHOTOS } from '../options';
import OnboardingFlow from '../OnboardingFlow';
import { FIND_ROTATE_MS, formatStampDate, step } from './Done';

const DONE: Onboarding = { ...COMPLETED_ONBOARDING, completedAt: '2026-10-27T12:00:00.000Z' };
const WALL = HOME_PLACES.find((p) => p.id === 'berlin-wall-fragments')!;

afterEach(() => {
  vi.useRealTimers();
});

function renderDone(data: Onboarding = DONE) {
  const { Body, Stamp, Footer } = step;
  const props = { data, update: () => {}, toast: () => {}, next: () => {} };
  return render(
    <MemoryRouter useTransitions={false}>
      {Stamp && (
        <div data-testid="stamp">
          <Stamp {...props} />
        </div>
      )}
      <Body {...props} />
      {Footer && (
        <nav aria-label="footer">
          <Footer {...props} />
        </nav>
      )}
    </MemoryRouter>,
  );
}

const fan = () => screen.getByRole('group', { name: 'Your first finds' });
const frontLink = () => within(fan()).getByRole('link');
const activeDot = () => Array.from(document.querySelectorAll('[data-dot]')).findIndex((d) => d.getAttribute('data-active') === 'true');

test('shows the heading, helper, kicker and three finds with the Berlin Wall in front', () => {
  renderDone();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your passport is ready');
  expect(screen.getByText('Closed eyes keep a detail private')).toBeInTheDocument();
  expect(screen.getByText('YOUR FIRST FINDS')).toBeInTheDocument();
  expect(within(fan()).getAllByRole('link')).toHaveLength(1);
  expect(frontLink()).toHaveAccessibleName('Open Berlin Wall Fragments');
  expect(frontLink()).toHaveAttribute('href', paths.homePlace('berlin-wall-fragments'));
  expect(within(fan()).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Show Bak kwa', 'Show Lunar New Year']);
  expect(screen.getByText('NUS University Town')).toBeInTheDocument();
  expect(screen.getByText('Chinatown · food')).toBeInTheDocument();
  expect(screen.getByText('Chinatown · festival')).toBeInTheDocument();
  expect(activeDot()).toBe(0);
});

test('reason chips: distance from the saved base to the Berlin Wall, Food rank, compare with home', () => {
  const near = formatDistance(distanceM(DONE.base!, WALL.point));
  renderDone({ ...DONE, topics: ['festival', 'monument', 'food', 'history'] });
  expect(screen.getByText(`${near} from your base`)).toBeInTheDocument();
  expect(screen.getByText('You ranked Food #3')).toBeInTheDocument();
  expect(screen.getByText('Compare with home')).toBeInTheDocument();
});

test('a far base reads in kilometres', () => {
  renderDone({ ...DONE, base: { lat: 1.2836, lng: 103.8443, label: 'Chinatown' } });
  expect(screen.getByText(/^\d+\.\d km from your base$/)).toBeInTheDocument();
});

test('a back card promotes to the front, takes focus, and the dots follow', async () => {
  renderDone();
  await userEvent.click(screen.getByRole('button', { name: 'Show Bak kwa' }));
  expect(frontLink()).toHaveAccessibleName('Open Bak kwa');
  expect(frontLink()).toHaveAttribute('href', paths.placeCard('chinatown', 'food'));
  expect(frontLink()).toHaveFocus();
  expect(activeDot()).toBe(1);
  await userEvent.click(screen.getByRole('button', { name: 'Show Lunar New Year' }));
  expect(frontLink()).toHaveAttribute('href', paths.placeCard('chinatown', 'festival'));
  expect(activeDot()).toBe(2);
  expect(within(fan()).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Show Berlin Wall Fragments', 'Show Bak kwa']);
});

test('auto-rotates every 3400 ms', () => {
  vi.useFakeTimers();
  renderDone();
  expect(FIND_ROTATE_MS).toBe(3400);
  act(() => vi.advanceTimersByTime(3399));
  expect(activeDot()).toBe(0);
  act(() => vi.advanceTimersByTime(1));
  expect(activeDot()).toBe(1);
  act(() => vi.advanceTimersByTime(3400));
  expect(activeDot()).toBe(2);
  act(() => vi.advanceTimersByTime(3400));
  expect(activeDot()).toBe(0);
});

test('pauses while the pointer is over the fan and resumes when it leaves', () => {
  vi.useFakeTimers();
  renderDone();
  fireEvent.pointerEnter(fan());
  act(() => vi.advanceTimersByTime(3400 * 3));
  expect(activeDot()).toBe(0);
  fireEvent.pointerLeave(fan());
  act(() => vi.advanceTimersByTime(3400));
  expect(activeDot()).toBe(1);
});

test('stops for good after a manual tap', () => {
  vi.useFakeTimers();
  renderDone();
  fireEvent.click(screen.getByRole('button', { name: 'Show Lunar New Year' }));
  expect(activeDot()).toBe(2);
  act(() => vi.advanceTimersByTime(3400 * 10));
  expect(activeDot()).toBe(2);
});

test('stops for good once keyboard focus has been inside the fan', () => {
  vi.useFakeTimers();
  renderDone();
  act(() => frontLink().focus());
  act(() => vi.advanceTimersByTime(3400 * 3));
  expect(activeDot()).toBe(0);
  act(() => frontLink().blur());
  act(() => vi.advanceTimersByTime(3400 * 3));
  expect(activeDot()).toBe(0);
});

test('stamp: WELCOME and the completion date, plus the splash ring', () => {
  renderDone();
  const stamp = screen.getByTestId('stamp');
  expect(within(stamp).getByText('WELCOME')).toBeInTheDocument();
  expect(within(stamp).getByText('27 OCT 2026')).toBeInTheDocument();
  expect(stamp.querySelector('[data-splash]')).not.toBeNull();
  expect(document.querySelectorAll('[data-burst]')).toHaveLength(14);
});

test('formatStampDate: D MMM YYYY upper-case, local date', () => {
  expect(formatStampDate('2026-01-05T12:00:00.000Z')).toBe('5 JAN 2026');
  expect(formatStampDate('2026-12-31T12:00:00.000Z')).toBe('31 DEC 2026');
});

test('reduced motion: stamp shown without splash, no confetti, the fan does not auto-rotate', () => {
  vi.useFakeTimers();
  setReducedMotion(true);
  renderDone();
  const stamp = screen.getByTestId('stamp');
  expect(within(stamp).getByText('WELCOME')).toBeInTheDocument();
  expect(stamp.querySelector('[data-splash]')).toBeNull();
  expect(document.querySelectorAll('[data-burst]')).toHaveLength(0);
  act(() => vi.advanceTimersByTime(3400 * 3));
  expect(activeDot()).toBe(0);
  // Manual browsing still works.
  fireEvent.click(screen.getByRole('button', { name: 'Show Bak kwa' }));
  expect(activeDot()).toBe(1);
});

test('footer: See passport goes to Moments, Start exploring goes Home', () => {
  renderDone();
  const footer = within(screen.getByRole('navigation', { name: 'footer' }));
  expect(footer.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
    ['See passport', paths.moments],
    ['Start exploring', paths.today],
  ]);
});

test('in the flow: finishing O7 shows the stamp in the passport and exactly the two outbound CTAs; Back returns to O7', async () => {
  window.localStorage.setItem(`${STORAGE_PREFIX}onboarding`, JSON.stringify({ ...COMPLETED_ONBOARDING, done: false, completedAt: null }));
  resetPersistentStores();
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.onboarding]}>
      <Routes>
        <Route path={paths.onboarding} element={<OnboardingFlow />} />
        <Route path={paths.today} element={<p>today page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rank the topics you enjoy most');
  await userEvent.click(screen.getByRole('button', { name: /stamp my passport/i }));
  expect(onboardingStore.get().done).toBe(true);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your passport is ready');
  expect(screen.queryByText('today page')).not.toBeInTheDocument();
  const passport = screen.getByRole('region', { name: 'Your passport' });
  expect(within(within(passport).getByTestId('passport-stamp')).getByText('WELCOME')).toBeInTheDocument();
  expect(within(passport).getByText(formatStampDate(onboardingStore.get().completedAt!))).toBeInTheDocument();
  const outbound = screen.getAllByRole('link').filter((l) => !fan().contains(l));
  expect(outbound.map((l) => l.textContent)).toEqual(['See passport', 'Start exploring']);
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rank the topics you enjoy most');
  expect(onboardingStore.get()).toMatchObject({ done: true, topics: COMPLETED_ONBOARDING.topics });
});

test('lists the credit of every onboarding photo once, in a closed Photo credits disclosure', () => {
  renderDone();
  const details = screen.getByText('Photo credits').closest('details')!;
  expect(details).not.toHaveAttribute('open');
  const lines = within(details).getAllByRole('listitem', { hidden: true }).map((li) => li.textContent);
  expect(lines).toEqual([...new Set(Object.values(PHOTOS).map((p) => p.credit))]);
});
