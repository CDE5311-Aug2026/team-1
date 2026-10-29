import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DEFAULT_ONBOARDING } from '../../../data/domain';
import { PHOTOS, PREVIEW_KICKER, ROLES, ROLE_PREVIEW_EMPTY } from '../options';
import { passportValue } from '../PassportCard/passport';
import { onboardingStore } from '../../../data/stores';
import { passportText, pressKey, radioStates, renderFlowAt, renderStep } from './choiceHarness';
import { step } from './Role';

test('shows the title, helper and six options', () => {
  renderStep(step);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What brings you to Singapore?');
  expect(screen.getByText('Used to pick examples that suit your days')).toBeInTheDocument();
  expect(within(screen.getByRole('radiogroup', { name: 'What brings you here' })).getAllByRole('radio')).toHaveLength(6);
});

test('empty preview', () => {
  renderStep(step);
  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(PREVIEW_KICKER.role)).toBeInTheDocument();
  expect(within(preview).getByText(ROLE_PREVIEW_EMPTY)).toBeInTheDocument();
  expect(preview.querySelector('img')!.getAttribute('src')).toBe(PHOTOS.wall.src);
});

test.each(ROLES.map((r) => [r.label, r] as const))('picking %s writes the store, fills the passport and previews its example', (_label, r) => {
  const { data } = renderStep(step);
  fireEvent.click(screen.getByRole('radio', { name: r.label }));
  expect(screen.getByRole('radio', { name: r.label })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getAllByRole('radio').filter((x) => x.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  expect(data().role).toBe(r.code);
  expect(step.answered(data())).toBe(true);
  expect(passportValue(data(), 'role')).toBe(r.label);

  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(r.previewTitle)).toBeInTheDocument();
  expect(within(preview).getByText(r.previewBody)).toBeInTheDocument();
  expect(preview.querySelector('img')!.getAttribute('src')).toBe(PHOTOS[r.photo].src);
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
  renderFlowAt({ from: 'India', time: 'lt3m' });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What brings you to Singapore?');
  expect(passportText('role')).not.toContain('Visiting');
  fireEvent.click(screen.getByRole('radio', { name: 'Visiting' }));
  expect(onboardingStore.get().role).toBe('visiting');
  expect(passportText('role')).toContain('Visiting');
});
