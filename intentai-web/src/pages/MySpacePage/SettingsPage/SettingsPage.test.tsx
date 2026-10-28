import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../data/domain';
import { onboardingStore, preferencesStore, settingsStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import { FEEDBACK_TOAST } from '../MySpacePage';
import { currentPath, renderAt } from '../testUtils';
import { NEEDS_LOCAL, NEEDS_OCCASIONS } from './SettingsPage';

const setup = () => {
  onboardingStore.set(COMPLETED_ONBOARDING);
  return userEvent.setup();
};

test('notification switches save and explain', async () => {
  const user = setup();
  renderAt(paths.mySpaceSettings);
  await user.click(screen.getByRole('switch', { name: 'Local answers' }));
  expect(preferencesStore.get().notify.answers).toBe(false);
  expect(screen.getByText('Local answers off')).toBeInTheDocument();
  await user.click(screen.getByRole('switch', { name: 'Recap reminders' }));
  expect(screen.queryByRole('radiogroup', { name: 'Recap reminder time' })).toBeNull();
  await user.click(screen.getByRole('switch', { name: 'Recap reminders' }));
  await user.click(screen.getByRole('radio', { name: 'Morning' }));
  expect(preferencesStore.get().recapTime).toBe('morning');
});

test.each([
  ['Occasions', NEEDS_OCCASIONS],
  ['Questions near you', NEEDS_LOCAL],
] as const)('%s waits for its My Space switch', async (label, message) => {
  const user = setup();
  renderAt(paths.mySpaceSettings);
  const sw = screen.getByRole('switch', { name: label });
  const before = preferencesStore.get().notify;
  expect(sw).toHaveAttribute('aria-disabled', 'true');
  await user.click(sw);
  sw.focus();
  await user.keyboard(' ');
  expect(preferencesStore.get().notify).toEqual(before);
  expect(screen.getByText(message)).toBeInTheDocument();
});

test('with its parent on, the dependent switch works', async () => {
  settingsStore.set({ ...DEFAULT_SETTINGS, occasions: true });
  const user = setup();
  renderAt(paths.mySpaceSettings);
  const sw = screen.getByRole('switch', { name: 'Occasions' });
  expect(sw).not.toHaveAttribute('aria-disabled');
  await user.click(sw);
  expect(preferencesStore.get().notify.occasions).toBe(true);
});

test('language is the onboarding answer, changed in place', async () => {
  const user = setup();
  renderAt(paths.mySpaceSettings);
  await user.click(screen.getByRole('button', { name: /^Language/ }));
  await user.click(within(screen.getByRole('radiogroup', { name: 'Language' })).getByRole('radio', { name: /^中文/ }));
  expect(onboardingStore.get().language).toBe('zh');
  expect(screen.getByText('Cards will use 中文')).toBeInTheDocument();
});

test('radius, motion and text size', async () => {
  const user = setup();
  renderAt(paths.mySpaceSettings);
  const radius = screen.getByLabelText('Nearby radius');
  fireEvent.change(radius, { target: { value: '7' } });
  expect(preferencesStore.get().radiusKm).toBe(7);
  expect(radius).toHaveAttribute('aria-valuetext', '7 kilometres');
  await user.click(screen.getByRole('radio', { name: 'Reduced' }));
  expect(preferencesStore.get().motion).toBe('reduced');
  const size = screen.getByLabelText('Text size');
  fireEvent.change(size, { target: { value: '4' } });
  expect(preferencesStore.get().textSize).toBe(4);
  expect(screen.getByText('Largest')).toBeInTheDocument();
});

test('More: privacy, Today’s topics, licences, feedback', async () => {
  const user = setup();
  renderAt(paths.mySpaceSettings);
  await user.click(screen.getByRole('button', { name: /Send feedback/ }));
  expect(screen.getByText(FEEDBACK_TOAST)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Terms & licences/ }));
  expect(currentPath()).toBe(paths.licences);
  await user.click(screen.getByRole('button', { name: 'Back to My Space' }));
  await user.click(screen.getAllByRole('button', { name: 'Settings' })[0]);
  await user.click(screen.getByRole('button', { name: /Today’s topics/ }));
  expect(currentPath()).toBe(paths.todaySetup);
});

test('opening Today’s topics never names the saved picks in usage timings', async () => {
  const { render } = await import('@testing-library/react');
  const { MemoryRouter } = await import('react-router-dom');
  const { createTracker } = await import('../../../usage/tracker');
  const { default: PageTracker } = await import('../../../usage/PageTracker');
  const { default: SettingsPage } = await import('./SettingsPage');
  const { culturePrefsStore } = await import('../../../data/stores');
  const names: string[] = [];
  const tracker = createTracker({
    now: () => 0,
    send: (events) => names.push(...events.map((e) => e.name)),
    uid: () => 'me',
    newId: () => 's',
    doc: { visibilityState: 'visible', addEventListener: () => {} } as never,
    win: { addEventListener: () => {} } as never,
  });
  culturePrefsStore.set({ categories: ['history', 'unesco', 'ich'] });
  const user = setup();
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.mySpaceSettings]}>
      <PageTracker t={tracker} />
      <SettingsPage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: /Today’s topics/ }));
  await user.click(screen.getByRole('button', { name: /Send feedback/ }));
  tracker.flush();
  expect(names.some((n) => n.includes('Send feedback'))).toBe(true);
  expect(names.join(' | ')).not.toMatch(/History|UNESCO|Heritage/i);
});
