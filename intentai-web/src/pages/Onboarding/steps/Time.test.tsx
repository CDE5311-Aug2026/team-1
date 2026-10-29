import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DEFAULT_ONBOARDING } from '../../../data/domain';
import { PHOTOS, PREVIEW_KICKER, TIMES, TIME_PREVIEW_EMPTY, TIME_PREVIEW_TITLE } from '../options';
import { passportValue } from '../PassportCard/passport';
import { onboardingStore } from '../../../data/stores';
import { passportText, pressKey, radioStates, renderFlowAt, renderStep } from './choiceHarness';
import { step } from './Time';

test('shows the title, helper and four options with sub-labels', () => {
  renderStep(step);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How long have you been in Singapore?');
  expect(screen.getByText('Used to decide how much background each card gives')).toBeInTheDocument();
  const group = screen.getByRole('radiogroup', { name: 'Time in Singapore' });
  expect(within(group).getAllByRole('radio')).toHaveLength(4);
  for (const t of TIMES) {
    const radio = within(group).getByRole('radio', { name: `${t.label} ${t.sub}` });
    expect(radio).toHaveAttribute('aria-checked', 'false');
  }
});

test('empty preview has no meter', () => {
  renderStep(step);
  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(PREVIEW_KICKER.time)).toBeInTheDocument();
  expect(within(preview).getByText(TIME_PREVIEW_EMPTY)).toBeInTheDocument();
  expect(within(preview).queryByTestId('time-meter')).toBeNull();
});

test.each(TIMES.map((t, i) => [t.label, t, i] as const))('picking %s writes the store, fills the passport and previews its copy', (_label, t, i) => {
  const { data } = renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name: `${t.label} ${t.sub}` }));
  expect(screen.getByRole('radio', { name: `${t.label} ${t.sub}` })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  expect(data().time).toBe(t.code);
  expect(step.answered(data())).toBe(true);
  expect(passportValue(data(), 'time')).toBe(t.passport);

  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(TIME_PREVIEW_TITLE)).toBeInTheDocument();
  expect(within(preview).getByText(t.body)).toBeInTheDocument();
  expect(preview.querySelector('img')!.getAttribute('src')).toBe(PHOTOS.monument.src);
  const bars = within(within(preview).getByTestId('time-meter')).getAllByRole('generic', { hidden: true });
  expect(bars.map((b) => (b as HTMLElement).style.width)).toEqual([100, 80, 64, 50].map((w, b) => (b < 4 - i ? `${w}%` : '0px')));
});

test('shortened passport labels', () => {
  const { data } = renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name: 'Less than 3 months Just arrived' }));
  expect(passportValue(data(), 'time')).toBe('< 3 months');
  fireEvent.click(screen.getByRole('radio', { name: 'More than 3 years Almost a local' }));
  expect(passportValue(data(), 'time')).toBe('3+ years');
});

test('answered and blocked toast', () => {
  expect(step.answered(DEFAULT_ONBOARDING)).toBe(false);
  expect(step.blockedToast).toBe('Pick one to continue');
});

test('roving tabindex: only the selected option (or the first) is a tab stop', () => {
  renderStep(step);
  const tabs = () => screen.getAllByRole('radio').map((r) => r.tabIndex);
  expect(tabs().filter((t) => t === 0)).toHaveLength(1);
  expect(tabs()[0]).toBe(0);
  fireEvent.click(screen.getAllByRole('radio')[2]);
  expect(tabs().indexOf(0)).toBe(2);
  expect(tabs().filter((t) => t === 0)).toHaveLength(1);
});

test('arrow keys move focus and selection, wrapping at both ends; Home and End jump', () => {
  const { data } = renderStep(step);
  const radios = () => screen.getAllByRole('radio');
  const last = radios().length - 1;
  radios()[0].focus();
  pressKey('ArrowLeft');
  expect(radios()[last]).toHaveFocus();
  expect(radioStates().indexOf(true)).toBe(last);
  pressKey('ArrowRight');
  expect(radios()[0]).toHaveFocus();
  expect(radioStates().indexOf(true)).toBe(0);
  pressKey('ArrowDown');
  expect(radios()[1]).toHaveFocus();
  expect(radioStates().filter(Boolean)).toHaveLength(1);
  pressKey('ArrowUp');
  expect(radios()[0]).toHaveFocus();
  pressKey('End');
  expect(radios()[last]).toHaveFocus();
  pressKey('Home');
  expect(radios()[0]).toHaveFocus();
  expect(step.answered(data())).toBe(true);
});

test('in the real flow, picking writes the code to the store and the passport shows the label', () => {
  renderFlowAt({ from: 'India' });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('How long have you been in Singapore?');
  expect(passportText('time')).not.toContain('1–3 years');
  fireEvent.click(screen.getByRole('radio', { name: '1–3 years Feeling at home' }));
  expect(onboardingStore.get().time).toBe('1to3y');
  expect(passportText('time')).toContain('1–3 years');
});
