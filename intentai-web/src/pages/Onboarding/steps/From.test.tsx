import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DEFAULT_ONBOARDING } from '../../../data/domain';
import { COUNTRIES, FROM_EMPTY, PREVIEW_KICKER, fromPreview } from '../options';
import { passportValue } from '../PassportCard/passport';
import { onboardingStore } from '../../../data/stores';
import { passportText, pressKey, radioStates, renderFlowAt, renderStep } from './choiceHarness';
import { step } from './From';

test('shows the title, both helper lines and 6 tiles + 6 pills in one radiogroup', () => {
  renderStep(step);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Where are you from?');
  expect(screen.getByText('Used to compare customs with home')).toBeInTheDocument();
  expect(screen.getByText('Private by default · tap the eye to show it')).toBeInTheDocument();
  expect(screen.getAllByRole('radiogroup')).toHaveLength(1);
  expect(within(screen.getByRole('radiogroup', { name: 'Where you are from' })).getAllByRole('radio')).toHaveLength(12);
  expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
});

test('starts with the dashed empty preview', () => {
  renderStep(step);
  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(PREVIEW_KICKER.from)).toBeInTheDocument();
  expect(within(preview).getByText(FROM_EMPTY)).toBeInTheDocument();
  expect(within(preview).getByText('Your preview')).toBeInTheDocument();
});

test.each(COUNTRIES.map((c) => [c.name, c] as const))('picking %s selects it, writes the store and updates the preview', (name) => {
  const { data } = renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name }));
  expect(screen.getByRole('radio', { name })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  expect(data().from).toBe(name);
  expect(step.answered(data())).toBe(true);
  expect(passportValue(data(), 'from')).toBe(name);

  const expected = fromPreview(name);
  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(expected.title!)).toBeInTheDocument();
  expect(within(preview).getByText(expected.chip!)).toBeInTheDocument();
  expect(within(preview).getByText(expected.body)).toBeInTheDocument();
});

test('India previews Deepavali; other countries preview Lunar New Year', () => {
  renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name: 'India' }));
  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText('Deepavali')).toBeInTheDocument();
  expect(within(preview).getByText('Compare with India')).toBeInTheDocument();
  expect(preview.querySelector('img')!.getAttribute('src')).toBe(fromPreview('India').photo.src);
  fireEvent.click(screen.getByRole('radio', { name: 'Thailand' }));
  expect(within(preview).getByText('Lunar New Year')).toBeInTheDocument();
  expect(within(preview).getByText('Compare with Thailand')).toBeInTheDocument();
  expect(preview.querySelector('img')!.getAttribute('src')).toBe(fromPreview('Thailand').photo.src);
});

test('tapping the selected option keeps it selected and changing moves the check', () => {
  const { data } = renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name: 'China' }));
  fireEvent.click(screen.getByRole('radio', { name: 'China' }));
  expect(screen.getByRole('radio', { name: 'China' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('radio', { name: 'Vietnam' }));
  expect(screen.getByRole('radio', { name: 'China' })).toHaveAttribute('aria-checked', 'false');
  expect(data().from).toBe('Vietnam');
});

test('reflects an existing answer on mount', () => {
  renderStep(step, { from: 'Malaysia' });
  expect(screen.getByRole('radio', { name: 'Malaysia' })).toHaveAttribute('aria-checked', 'true');
});

test('answered and blocked toast', () => {
  expect(step.answered(DEFAULT_ONBOARDING)).toBe(false);
  expect(step.blockedToast).toBe('Pick one to continue');
  expect(step.shell).toBe('question');
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
  renderFlowAt({ time: 'lt3m' });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Where are you from?');
  expect(passportText('from')).not.toContain('Vietnam');
  fireEvent.click(screen.getByRole('radio', { name: 'Vietnam' }));
  expect(onboardingStore.get().from).toBe('Vietnam');
  expect(passportText('from')).toContain('Vietnam');
});

test('arrow keys cross from the last tile into the pills and back', () => {
  renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name: 'United States' }));
  screen.getByRole('radio', { name: 'United States' }).focus();
  pressKey('ArrowRight');
  expect(screen.getByRole('radio', { name: 'Philippines' })).toHaveFocus();
  expect(screen.getByRole('radio', { name: 'Philippines' })).toHaveAttribute('aria-checked', 'true');
  pressKey('ArrowLeft');
  expect(screen.getByRole('radio', { name: 'United States' })).toHaveFocus();
});
