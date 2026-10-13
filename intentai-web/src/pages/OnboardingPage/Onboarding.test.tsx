import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from '../../App';
import { DEFAULT_PROFILE } from '../../data/domain';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { onboardingStore, profileStore } from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';
import { quizFor } from './quiz';

function Pathname() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <App />
      <Pathname />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
const h1 = () => screen.getByRole('heading', { level: 1 });

beforeEach(() => {
  // Tests start as a returning user (src/test/setup.ts); onboarding is the first-run flow.
  localStorage.removeItem(`${STORAGE_PREFIX}onboarding`);
});

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => dismissToast());
});

test('a first-run user lands on Welcome and Get started opens the time step', async () => {
  renderAt('/');
  expect(location()).toBe('/onboarding');
  expect(h1()).toHaveTextContent(/^Hello, W!\s*Welcome to IntentAI$/);
  await userEvent.click(screen.getByRole('button', { name: 'Get started' }));
  expect(location()).toBe('/onboarding/time');
  expect(h1()).toHaveTextContent('How long have you been in Singapore?');
});

test('Welcome phrase pills read the phrase aloud, or explain when audio is unavailable', async () => {
  const speak = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', function Utterance(this: { text: string }, text: string) {
    this.text = text;
  });
  const first = renderAt('/onboarding');
  await userEvent.click(screen.getByRole('button', { name: 'Hear “Chope”' }));
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Chope' }));
  first.unmount();

  vi.unstubAllGlobals();
  vi.stubGlobal('speechSynthesis', undefined);
  renderAt('/onboarding');
  await userEvent.click(screen.getByRole('button', { name: 'Hear “Shiok!”' }));
  expect(screen.getByRole('status')).toHaveTextContent("Audio isn't available on this device.");
});

test('time step: nothing is pre-selected, and Continue needs a choice', async () => {
  renderAt('/onboarding/time');
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  expect(onboardingStore.get().duration).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('status')).toHaveTextContent('Pick how long you have been here.');
  expect(location()).toBe('/onboarding/time');
});

test('time step: one option is selected at a time, saved, and reflected in the hint', async () => {
  renderAt('/onboarding/time');
  expect(screen.getByText('STEP 1 OF 3')).toBeInTheDocument();
  const middle = screen.getByRole('button', { name: /3 months – 1 year/ });
  const long = screen.getByRole('button', { name: /1 – 3 years/ });
  await userEvent.click(middle);
  expect(middle).toHaveAttribute('aria-pressed', 'true');
  expect(long).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText(/most people learn fastest with phrases they hear every day/)).toBeInTheDocument();

  await userEvent.click(long);
  expect(long).toHaveAttribute('aria-pressed', 'true');
  expect(middle).toHaveAttribute('aria-pressed', 'false');
  expect(onboardingStore.get().duration).toBe('1 – 3 years');
  expect(screen.queryByText(/most people learn fastest/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(location()).toBe('/onboarding/topics');
});

test('time step Back returns to Welcome', async () => {
  renderAt('/onboarding/time');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding');
});

test('topics step: multi-select with a live count and hint, and at least one topic required', async () => {
  onboardingStore.set((prev) => ({ ...prev, duration: '3 months – 1 year' }));
  renderAt('/onboarding/topics');
  expect(screen.getByText('STEP 2 OF 3')).toBeInTheDocument();
  // Nothing is pre-selected.
  expect(screen.getByRole('button', { name: 'Continue · 0 selected' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Work/ }));
  await userEvent.click(screen.getByRole('button', { name: /^Food/ }));
  expect(screen.getByRole('button', { name: /^Work/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Food/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Continue · 2 selected' })).toBeInTheDocument();
  expect(
    screen.getByText("Since you've been here under a year, I'll start with Work and Food basics."),
  ).toBeInTheDocument();
  // Each tile shows its sample phrase.
  expect(screen.getByText('“Mee siam, tapau”')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^Daily life/ }));
  expect(screen.getByRole('button', { name: 'Continue · 3 selected' })).toBeInTheDocument();
  expect(onboardingStore.get().topics).toEqual(['Work', 'Food', 'Daily life']);
  expect(screen.getByText(/I'll start with Work, Food and Daily life basics\./)).toBeInTheDocument();

  for (const name of [/^Work/, /^Food/, /^Daily life/]) {
    await userEvent.click(screen.getByRole('button', { name }));
  }
  await userEvent.click(screen.getByRole('button', { name: 'Continue · 0 selected' }));
  expect(screen.getByRole('status')).toHaveTextContent('Pick at least one topic.');
  expect(location()).toBe('/onboarding/topics');

  await userEvent.click(screen.getByRole('button', { name: /^Getting around/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue · 1 selected' }));
  expect(location()).toBe('/onboarding/quiz');
});

test('topics step Back returns to the time step', async () => {
  renderAt('/onboarding/topics');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding/time');
});

test('quiz asks three questions from the chosen topics and scores the correct answers', async () => {
  onboardingStore.set((prev) => ({ ...prev, topics: ['Work', 'Food'] }));
  const quiz = quizFor(['Work', 'Food']);
  renderAt('/onboarding/quiz');
  expect(screen.getByText('STEP 3 OF 3')).toBeInTheDocument();
  expect(h1()).toHaveTextContent('Test your Singlish level');

  // Q1 correct, Q2 wrong, Q3 correct → 2 of 3.
  const picks = [quiz[0].correct, (quiz[1].correct + 1) % 3, quiz[2].correct];
  for (const [index, question] of quiz.entries()) {
    expect(screen.getByText(`Question ${index + 1} of 3`)).toBeInTheDocument();
    expect(screen.getByText(question.phrase)).toBeInTheDocument();
    expect(screen.getByText(question.context)).toBeInTheDocument();
    const choice = screen.getByRole('button', { name: new RegExp(`^${'ABC'[picks[index]]} `) });
    expect(choice).toHaveAccessibleName(`${'ABC'[picks[index]]} ${question.answers[picks[index]]}`);
    await userEvent.click(choice);
    expect(choice).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  }
  expect(location()).toBe('/onboarding/result?score=2');
  expect(h1()).toHaveTextContent("You're Intermediate");
});

test('Check answer without a choice asks the user to choose or skip', async () => {
  renderAt('/onboarding/quiz');
  await userEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(screen.getByRole('status')).toHaveTextContent('Choose an answer or skip.');
  expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
});

test('skipping a question moves on without scoring it', async () => {
  renderAt('/onboarding/quiz');
  await userEvent.click(screen.getByRole('button', { name: /skip/i }));
  expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
  expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
});

test('quiz context chip follows the chosen topic', async () => {
  onboardingStore.set((prev) => ({ ...prev, topics: ['Daily life'] }));
  renderAt('/onboarding/quiz');
  expect(screen.getByText(quizFor(['Daily life'])[0].context)).toBeInTheDocument();
});

test('quiz play button reads the phrase aloud, or explains when audio is unavailable', async () => {
  const speak = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', function Utterance(this: { text: string }, text: string) {
    this.text = text;
  });
  const first = renderAt('/onboarding/quiz');
  await userEvent.click(screen.getByRole('button', { name: 'Play question' }));
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Paiseh ah, can help me check this report?' }));
  first.unmount();

  vi.unstubAllGlobals();
  vi.stubGlobal('speechSynthesis', undefined);
  renderAt('/onboarding/quiz');
  await userEvent.click(screen.getByRole('button', { name: 'Play question' }));
  expect(screen.getByRole('status')).toHaveTextContent("Audio isn't available on this device.");
});

test('quiz Back returns to topics', async () => {
  renderAt('/onboarding/quiz');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(location()).toBe('/onboarding/topics');
});

test.each([
  [3, 'Experienced'],
  [2, 'Intermediate'],
  [1, 'Beginner'],
  [0, 'Beginner'],
])('result for %i of 3 is %s, with the matching level highlighted', (score, level) => {
  renderAt(`/onboarding/result?score=${score}`);
  expect(h1()).toHaveTextContent(`You're ${level}`);
  expect(screen.getByText(`${score}/3`)).toBeInTheDocument();
  expect(screen.getByText(new RegExp(`^${score} of 3 correct — `))).toBeInTheDocument();
  const meter = screen.getByRole('list', { name: 'Singlish levels' });
  expect(within(meter).getByRole('listitem', { current: true })).toHaveTextContent(level);
});

test('result plan reflects the chosen topics and stay length', () => {
  onboardingStore.set((prev) => ({ ...prev, duration: '1 – 3 years', topics: ['Food', 'Getting around'] }));
  renderAt('/onboarding/result?score=1');
  expect(screen.getByText('Focus: Food & Getting around')).toBeInTheDocument();
  expect(screen.getByText('Tuned for 1 – 3 years')).toBeInTheDocument();
  expect(screen.getByText(/I'll start with hawker and MRT and bus phrases/)).toBeInTheDocument();
});

test('Retake the quiz starts the quiz again from question 1', async () => {
  renderAt('/onboarding/result?score=2');
  await userEvent.click(screen.getByRole('button', { name: 'Retake the quiz' }));
  expect(location()).toBe('/onboarding/quiz');
  expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
});

test('Start learning finishes onboarding, saves the profile, and opens Today', async () => {
  profileStore.set(DEFAULT_PROFILE);
  onboardingStore.set((prev) => ({ ...prev, duration: 'Less than 3 months', topics: ['Daily life'] }));
  renderAt('/onboarding/result?score=3');
  await userEvent.click(screen.getByRole('button', { name: 'Start learning' }));
  expect(onboardingStore.get().done).toBe(true);
  expect(profileStore.get()).toEqual({
    ...DEFAULT_PROFILE,
    time: 'Less than 3 months',
    level: 'Experienced',
    topics: ['Daily life'],
  });
  expect(location()).toBe('/');
  expect(screen.getByText("Today's three expressions, Can or cannot learn?")).toBeInTheDocument();
});

test('cross-page contract: the whole first-run flow by skipping saves the stay length', async () => {
  const user = userEvent.setup();
  renderAt('/');
  await user.click(screen.getByRole('button', { name: /get started/i }));
  await user.click(screen.getByRole('button', { name: /1 – 3 years/i }));
  await user.click(screen.getByRole('button', { name: /^continue/i }));
  await user.click(screen.getByRole('button', { name: /^Work/ }));
  await user.click(screen.getByRole('button', { name: /^continue/i }));
  for (let i = 0; i < 3; i += 1) {
    await user.click(screen.getByRole('button', { name: /skip/i }));
  }
  expect(h1()).toHaveTextContent("You're Beginner");
  await user.click(screen.getByRole('button', { name: /start learning/i }));
  expect(profileStore.get().time).toBe('1 – 3 years');
  expect(profileStore.get().level).toBe('Beginner');
  expect(location()).toBe('/');
});
