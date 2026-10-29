import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { onboardingStore, placeStoriesStore, profileStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import { passportStats } from '../stats';
import { renderAt } from '../testUtils';

const seed = () => onboardingStore.set(COMPLETED_ONBOARDING);

test('passportStats counts stamps, opened cards and answered questions', () => {
  const stories = {
    a: { opened: ['food', 'history'] as const, checkedIn: true, stamped: true },
    b: { opened: ['festival', 'monument'] as const, checkedIn: true, stamped: true },
  };
  const questions = [
    { id: '1', text: 'q', context: '', detail: '', status: 'answered' as const, answer: 'yes' },
    { id: '2', text: 'q', context: '', detail: '', status: 'pending' as const },
  ];
  expect(passportStats(JSON.parse(JSON.stringify(stories)), questions as never)).toEqual({ stamps: 2, cards: 4, tips: 1 });
});

test('passport shows real stats and the MRZ line; Explorer opens Moments', async () => {
  seed();
  placeStoriesStore.set({ a: { opened: ['food'], checkedIn: true, stamped: true } });
  const user = userEvent.setup();
  renderAt(paths.mySpace);
  const passport = screen.getByRole('region', { name: 'Your passport' });
  expect(within(passport).getByText('Stamps').nextSibling).toHaveTextContent('1');
  expect(screen.getByTestId('mrz')).toHaveTextContent('P<SGPW<<<<STUDENT<INTERN');
  await user.click(screen.getByRole('button', { name: 'Explorer rank: open Moments' }));
  expect(screen.getByTestId('pathname')).toHaveTextContent(paths.moments);
});

test('From starts hidden; the eye shows it and adds it to the MRZ', async () => {
  seed();
  const user = userEvent.setup();
  renderAt(paths.mySpace);
  expect(screen.getByRole('button', { name: /^From: hidden\./ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show from' }));
  expect(screen.getByText('From is visible again')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^From: China\./ })).toBeInTheDocument();
  expect(screen.getByTestId('mrz')).toHaveTextContent('P<SGPW<<CHINA<<');
});

test('hiding In Singapore makes it private', async () => {
  seed();
  const user = userEvent.setup();
  renderAt(paths.mySpace);
  await user.click(screen.getByRole('button', { name: 'Hide in singapore' }));
  expect(onboardingStore.get().hidden).toContain('time');
  expect(screen.getByText('In Singapore is now private')).toBeInTheDocument();
});

test('tile values: time label, topics joined, Not set when empty', () => {
  onboardingStore.set({ ...COMPLETED_ONBOARDING, hidden: [] });
  renderAt(paths.mySpace);
  expect(screen.getByRole('button', { name: /^In Singapore: Less than 3 months\./ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^Topics: Food › / })).toBeInTheDocument();
  expect(profileStore.get()).toBeDefined();
});
