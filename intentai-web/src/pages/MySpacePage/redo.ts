import { DEFAULT_ONBOARDING } from '../../data/domain';
import { onboardingStore } from '../../data/stores';

/** "Redo onboarding": clears the answers (privacy choices stay) so the flow opens at its welcome screen. */
export function redoOnboarding(): void {
  const { hidden } = onboardingStore.get();
  onboardingStore.set({ ...DEFAULT_ONBOARDING, hidden });
}
