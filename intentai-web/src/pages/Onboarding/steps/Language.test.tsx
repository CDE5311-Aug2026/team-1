import { fireEvent, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DEFAULT_ONBOARDING } from '../../../data/domain';
import { LANGS, LANG_PREVIEW_BODY, LANG_PREVIEW_EMPTY, PHOTOS, PREVIEW_KICKER } from '../options';
import { passportValue } from '../PassportCard/passport';
import { onboardingStore } from '../../../data/stores';
import { passportText, pressKey, radioStates, renderFlowAt, renderStep } from './choiceHarness';
import { step } from './Language';

test('shows the title, helper and six options labelled "<label>, <sub>"', () => {
  renderStep(step);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which language do you prefer?');
  expect(screen.getByText('Used for translations on cards and in Ask')).toBeInTheDocument();
  const group = screen.getByRole('radiogroup', { name: 'Language' });
  expect(within(group).getAllByRole('radio')).toHaveLength(6);
  expect(within(group).getByRole('radio', { name: '中文, Chinese, simplified' })).toBeInTheDocument();
});

test('empty preview', () => {
  renderStep(step);
  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(PREVIEW_KICKER.language)).toBeInTheDocument();
  expect(within(preview).getByText(LANG_PREVIEW_EMPTY)).toBeInTheDocument();
});

test.each(LANGS.map((l) => [l.label, l] as const))('picking %s writes the store, fills the passport and previews the temple name', (_label, l) => {
  const { data } = renderStep(step);
  const name = `${l.label}, ${l.sub}`;
  fireEvent.click(screen.getByRole('radio', { name }));
  expect(screen.getByRole('radio', { name })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getAllByRole('radio').filter((x) => x.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  expect(data().language).toBe(l.code);
  expect(step.answered(data())).toBe(true);
  expect(passportValue(data(), 'language')).toBe(l.label);

  const preview = screen.getByLabelText('Preview');
  expect(within(preview).getByText(l.previewTitle)).toBeInTheDocument();
  expect(within(preview).getByText(l.glyph)).toBeInTheDocument();
  expect(within(preview).getByText(LANG_PREVIEW_BODY)).toBeInTheDocument();
  expect(preview.querySelector('img')!.getAttribute('src')).toBe(PHOTOS.monument.src);
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
  renderFlowAt({ from: 'India', time: 'lt3m', role: 'student' });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which language do you prefer?');
  expect(passportText('language')).not.toContain('한국어');
  fireEvent.click(screen.getByRole('radio', { name: '한국어, Korean' }));
  expect(onboardingStore.get().language).toBe('ko');
  expect(passportText('language')).toContain('한국어');
});
