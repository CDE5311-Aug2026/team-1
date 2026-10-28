import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { onboardingStore, profileStore } from '../../../data/stores';
import { paths } from '../../../routes';
import { COMPLETED_ONBOARDING } from '../../../test/onboardingFixture';
import type { UsageEvent } from '../../../usage/event';
import PageTracker from '../../../usage/PageTracker';
import { createTracker, type TrackerDeps } from '../../../usage/tracker';
import MySpacePage from '../MySpacePage';
import { renderAt } from '../testUtils';
import TimeSlider from './TimeSlider';

const seed = () => onboardingStore.set({ ...COMPLETED_ONBOARDING, hidden: [] });
const sheet = () => screen.getByRole('dialog');

async function openRole() {
  const user = userEvent.setup();
  seed();
  renderAt(paths.mySpace);
  await user.click(screen.getByRole('button', { name: /^Here as:/ }));
  return user;
}

test('the sheet has its own title and no onboarding question heading', async () => {
  await openRole();
  expect(within(sheet()).getByRole('heading', { name: 'Role' })).toBeInTheDocument();
  expect(within(sheet()).queryByRole('heading', { level: 1 })).toBeNull();
});

test('Cancel leaves the record unchanged', async () => {
  const user = await openRole();
  await user.click(within(sheet()).getByRole('radio', { name: /Working/ }));
  await user.click(within(sheet()).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onboardingStore.get().role).toBe('intern');
});

test('Save writes only the edited field and syncs the profile', async () => {
  const user = await openRole();
  await user.click(within(sheet()).getByRole('radio', { name: /Working/ }));
  // Changed elsewhere while the sheet is open: Save must not put the old values back.
  act(() => onboardingStore.set((c) => ({ ...c, language: 'zh', hidden: ['base'] })));
  await user.click(within(sheet()).getByRole('button', { name: 'Save' }));
  const o = onboardingStore.get();
  expect(o.role).toBe('working');
  expect(o.language).toBe('zh');
  expect(o.hidden).toEqual(['base']);
  expect(profileStore.get().role).toBe('Working');
  expect(screen.getByText('Role updated')).toBeInTheDocument();
});

test('Escape and a backdrop click close without saving', async () => {
  const user = await openRole();
  await user.click(within(sheet()).getByRole('radio', { name: /Working/ }));
  sheet().dispatchEvent(new Event('cancel', { cancelable: true }));
  expect(await screen.findByRole('button', { name: /^Here as: Student intern/ })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getByRole('button', { name: /^Here as:/ }));
  await user.click(sheet());
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(onboardingStore.get().role).toBe('intern');
});

test('Topics with three ranked explains inside the sheet and stays open', async () => {
  const user = userEvent.setup();
  seed();
  renderAt(paths.mySpace);
  await user.click(screen.getByRole('button', { name: /^Topics:/ }));
  await user.click(within(sheet()).getByRole('button', { name: /^History, ranked 4/ }));
  await user.click(within(sheet()).getByRole('button', { name: 'Save' }));
  expect(within(sheet()).getByRole('status')).toHaveTextContent('Tap all 4 topics to set the order');
  expect(onboardingStore.get().topics).toHaveLength(4);
});

test('TimeSlider is a named slider moved by keys', async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(<TimeSlider value="lt3m" onChange={onChange} />);
  const slider = screen.getByRole('slider', { name: 'Time in Singapore' });
  expect(slider).toHaveAttribute('aria-valuetext', 'Less than 3 months');
  slider.focus();
  await user.keyboard('{ArrowRight}');
  expect(onChange).toHaveBeenLastCalledWith('3to12m');
  await user.keyboard('{End}');
  expect(onChange).toHaveBeenLastCalledWith('gt3y');
  rerender(<TimeSlider value="3to12m" onChange={onChange} />);
  expect(slider).toHaveAttribute('aria-valuetext', '3–12 months');
  await user.keyboard('{Home}');
  expect(onChange).toHaveBeenLastCalledWith('lt3m');
});

test('answers never appear in usage tap names', async () => {
  const sent: UsageEvent[] = [];
  const tracker = createTracker({
    now: () => 0,
    send: (events) => sent.push(...events),
    uid: () => 'me',
    newId: () => 's',
    doc: { visibilityState: 'visible', addEventListener: () => {} } as unknown as TrackerDeps['doc'],
    win: { addEventListener: () => {} } as unknown as TrackerDeps['win'],
  });
  seed();
  const user = userEvent.setup();
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.mySpace]}>
      <PageTracker t={tracker} />
      <MySpacePage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: /^From:/ }));
  await user.click(within(sheet()).getByRole('radio', { name: /India/ }));
  await user.click(within(sheet()).getByRole('button', { name: 'Cancel' }));
  await user.click(screen.getByRole('button', { name: /^Home base:/ }));
  tracker.flush();
  const names = sent.map((e) => e.name).join(' | ');
  expect(names).not.toMatch(/China|India|Berlin|UTown/);
});

test.each(['From', 'Language', 'Home base', 'Topics'])('the %s sheet shows no onboarding question heading', async (tile) => {
  const user = userEvent.setup();
  seed();
  renderAt(paths.mySpace);
  await user.click(screen.getByRole('button', { name: new RegExp(`^${tile}:`) }));
  expect(within(sheet()).queryByRole('heading', { level: 1 })).toBeNull();
  expect(within(sheet()).getAllByRole('heading')).toHaveLength(1);
});
