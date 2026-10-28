import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { isOnboarding, type Onboarding } from '../../data/domain';
import { STORAGE_PREFIX, resetPersistentStores } from '../../data/persistentStore';
import { onboardingStore } from '../../data/stores';
import { paths } from '../../routes';
import { COMPLETED_ONBOARDING } from '../../test/onboardingFixture';
import OnboardingFlow from './OnboardingFlow';
import type { StepDef, StepProps } from './steps/types';

// The topics stub has no controls; this double adds one that edits through the flow's `update`.
vi.mock('./steps/Topics', async (importOriginal) => {
  const original = await importOriginal<{ step: StepDef }>();
  const Stub = original.step.Body;
  function Body(props: StepProps) {
    return (
      <>
        <Stub {...props} />
        <button type="button" onClick={() => props.update({ topics: props.data.topics.slice(1) })}>
          Unrank first
        </button>
        <button type="button" onClick={() => props.update({ topics: ['food', 'festival', 'monument', 'history'] })}>
          Rank all
        </button>
      </>
    );
  }
  return { step: { ...original.step, Body } };
});

function renderFlow(seed: Onboarding) {
  window.localStorage.setItem(`${STORAGE_PREFIX}onboarding`, JSON.stringify(seed));
  resetPersistentStores();
  render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.onboarding]}>
      <Routes>
        <Route path={paths.onboarding} element={<OnboardingFlow />} />
        <Route path={paths.today} element={<p>today page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const ALL_ANSWERS: Onboarding = { ...COMPLETED_ONBOARDING, done: false, completedAt: null };

test('editing an answer after the stamp clears done and completedAt together; re-finishing stamps again', async () => {
  renderFlow(ALL_ANSWERS);
  await userEvent.click(screen.getByRole('button', { name: 'Stamp my passport' }));
  const firstStamp = onboardingStore.get().completedAt;
  expect(onboardingStore.get().done).toBe(true);

  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await userEvent.click(screen.getByRole('button', { name: 'Unrank first' }));
  const edited = onboardingStore.get();
  expect(edited).toMatchObject({ done: false, completedAt: null, topics: ['festival', 'monument', 'history'] });
  // The persisted record is valid, so a reload does not throw the answers away.
  expect(isOnboarding(JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}onboarding`)!))).toBe(true);
  // Still in the flow (the route guard only decides at mount).
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rank the topics you enjoy most');
  expect(screen.getByRole('button', { name: 'Stamp my passport' })).toHaveAttribute('aria-disabled', 'true');

  await userEvent.click(screen.getByRole('button', { name: 'Rank all' }));
  expect(onboardingStore.get().done).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Stamp my passport' }));
  expect(onboardingStore.get().done).toBe(true);
  expect(onboardingStore.get().completedAt).not.toBeNull();
  expect(firstStamp).not.toBeNull();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your passport is ready');
});
