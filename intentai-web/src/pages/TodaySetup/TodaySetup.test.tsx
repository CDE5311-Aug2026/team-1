import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import App from '../../App';
import { DEFAULT_PREFS, type CulturePrefs } from '../../data/culturePrefs';
import { culturePrefsStore } from '../../data/stores';
import { dismissToast } from '../../hooks/useToast';

function Probe() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

function renderAt(...entries: string[]) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={entries} initialIndex={entries.length - 1}>
      <App />
      <Probe />
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;
const tile = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}\\b`) });
const CUSTOM: CulturePrefs = { categories: ['unesco', 'ich', 'history'] };

afterEach(() => {
  act(() => dismissToast());
});

test('shows all six topics in survey rank order with nothing selected, and names the top 3 default', () => {
  renderAt('/today-setup');
  expect(screen.getByRole('heading', { level: 1, name: 'Pick 3 topics for Today' })).toBeInTheDocument();
  for (const label of ['Foods', 'Monuments', 'Festivals', 'UNESCO', 'Heritage', 'History']) {
    expect(tile(label)).toHaveAttribute('aria-pressed', 'false');
  }
  expect(tile('Foods')).toHaveTextContent('Iconic dishes and where they come from');
  expect(screen.getByText('0 of 3 picked')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Default' })).toHaveAccessibleDescription('Foods, Monuments, Festivals');
  expect(screen.getByText('Foods, Monuments, Festivals')).toBeVisible();
  expect(screen.getByText('You can change these anytime in My Space.')).toBeInTheDocument();
  expect(screen.queryByText(/Not sure\?/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Use the top 3' })).toBeNull();
  expect(screen.queryByRole('radio')).toBeNull();
});

test('Default saves the default picks and opens Today', async () => {
  culturePrefsStore.set(CUSTOM);
  renderAt('/today-setup');
  await userEvent.click(screen.getByRole('button', { name: 'Default' }));
  expect(culturePrefsStore.get()).toEqual(DEFAULT_PREFS);
  expect(location()).toBe('/');
});

test('toggles and caps at three', async () => {
  renderAt('/today-setup');
  await userEvent.click(tile('Foods'));
  await userEvent.click(tile('Foods'));
  expect(screen.getByText('0 of 3 picked')).toBeInTheDocument();

  await userEvent.click(tile('Foods'));
  await userEvent.click(tile('UNESCO'));
  await userEvent.click(tile('History'));
  expect(screen.getByText('3 of 3 picked')).toBeInTheDocument();

  await userEvent.click(tile('Heritage'));
  expect(screen.getByRole('status')).toHaveTextContent('You’ve picked 3. Tap one to swap it.');
  expect(tile('Heritage')).toHaveAttribute('aria-pressed', 'false');
});

test('show my Today needs three picks', async () => {
  renderAt('/today-setup');
  await userEvent.click(tile('Foods'));
  await userEvent.click(screen.getByRole('button', { name: 'Show my Today' }));
  expect(screen.getByRole('status')).toHaveTextContent('Pick 3 topics, or tap Default.');
  expect(location()).toBe('/today-setup');
});

test('finishing saves the picks in survey rank order and opens Today', async () => {
  renderAt('/today-setup');
  await userEvent.click(tile('History'));
  await userEvent.click(tile('Foods'));
  await userEvent.click(tile('UNESCO'));
  await userEvent.click(screen.getByRole('button', { name: 'Show my Today' }));

  expect(culturePrefsStore.get()).toEqual({ categories: ['foods', 'unesco', 'history'] });
  expect(location()).toBe('/');
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Foods', 'UNESCO', 'History']);
});

test('Back during onboarding returns to the result without saving', async () => {
  culturePrefsStore.set(CUSTOM);
  renderAt('/onboarding/result?score=2', '/today-setup');
  await userEvent.click(tile('Foods'));
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));

  expect(location()).toBe('/onboarding/result?score=2');
  expect(culturePrefsStore.get()).toEqual(CUSTOM);
});

test('retake from My Space pre-fills the saved picks, and Cancel returns without saving', async () => {
  culturePrefsStore.set(CUSTOM);
  renderAt('/today-setup?from=my-space');
  for (const label of ['UNESCO', 'Heritage', 'History']) expect(tile(label)).toHaveAttribute('aria-pressed', 'true');
  // Default and the "change later" note are for first-time onboarding only.
  expect(screen.queryByRole('button', { name: 'Default' })).toBeNull();
  expect(screen.queryByText('You can change these anytime in My Space.')).toBeNull();

  await userEvent.click(tile('History'));
  await userEvent.click(tile('Foods'));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(location()).toBe('/my-space');
  expect(culturePrefsStore.get()).toEqual(CUSTOM);
});

test('keyboard selects tiles', async () => {
  const user = userEvent.setup();
  renderAt('/today-setup');
  tile('Foods').focus();
  await user.keyboard(' ');
  await user.tab();
  await user.keyboard(' ');
  await user.tab();
  await user.keyboard('{Enter}');
  expect(screen.getByText('3 of 3 picked')).toBeInTheDocument();
});
