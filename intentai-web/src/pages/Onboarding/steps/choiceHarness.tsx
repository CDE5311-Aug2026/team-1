import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_ONBOARDING, type Onboarding } from '../../../data/domain';
import { STORAGE_PREFIX, resetPersistentStores } from '../../../data/persistentStore';
import { paths } from '../../../routes';
import OnboardingFlow from '../OnboardingFlow';
import type { StepDef } from './types';

/** Test harness: mounts a step's Body and Preview over real state, so picking updates the preview. */
export function renderStep(def: StepDef, initial: Partial<Onboarding> = {}) {
  const seen: Onboarding[] = [];
  function Harness() {
    const [data, setData] = useState<Onboarding>({ ...DEFAULT_ONBOARDING, ...initial });
    seen[0] = data;
    const props = { data, update: (p: Partial<Onboarding>) => setData((d) => ({ ...d, ...p })), toast: () => {}, next: () => {} };
    return (
      <>
        <def.Body {...props} />
        {def.Preview && (
          <section aria-label="Preview">
            <def.Preview {...props} />
          </section>
        )}
      </>
    );
  }
  const view = render(<Harness />);
  return { ...view, data: () => seen[0] };
}

/** Mounts the real flow at the first unanswered question of a seeded onboarding record. */
export function renderFlowAt(seed: Partial<Onboarding>) {
  window.localStorage.setItem(`${STORAGE_PREFIX}onboarding`, JSON.stringify({ ...DEFAULT_ONBOARDING, hidden: [], ...seed }));
  resetPersistentStores();
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[paths.onboarding]}>
      <Routes>
        <Route path={paths.onboarding} element={<OnboardingFlow />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The visible text of a passport field's value ('' sections included), e.g. passportText('from'). */
export function passportText(field: string): string {
  return document.querySelector(`[data-field="${field}"] dd`)?.textContent ?? '';
}

/** Fires ArrowX on the focused element, as a keyboard user would. */
export function pressKey(key: string) {
  fireEvent.keyDown(document.activeElement!, { key });
}

/** Radios in DOM order with their checked state, as [name, checked]. */
export function radioStates() {
  return screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked') === 'true');
}
