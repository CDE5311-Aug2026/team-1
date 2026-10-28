import { isOnboardingComplete, type Onboarding } from '../../data/domain';
import { onboardingStore, profileStore } from '../../data/stores';
import { roleLabel, timeLabel } from './options';
import type { StepDef } from './steps/types';

/**
 * Merges an answer into the record. A finished record that stops being complete (an answer
 * edited on the way back from the stamp) loses `done` and `completedAt` in the same write,
 * so the store never holds an invalid finished record.
 */
export function applyPatch(previous: Onboarding, patch: Partial<Onboarding>): Onboarding {
  const next = { ...previous, ...patch };
  if (next.done && !isOnboardingComplete(next)) return { ...next, done: false, completedAt: null };
  return next;
}

/** Where a (re)opened flow starts: welcome before any answer, else the first unanswered question (topics if none). */
export function resumeStep(steps: readonly StepDef[], data: Onboarding): number {
  const questions = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.shell === 'question');
  if (!questions.some(({ s }) => s.answered(data))) return 0;
  const open = questions.find(({ s }) => !s.answered(data));
  return (open ?? questions[questions.length - 1]).i;
}

/** Stamps the passport: done + date, and the profile My Space shows (from, time, role labels). */
export function finishOnboarding(now: Date = new Date()) {
  const current = onboardingStore.get();
  if (!isOnboardingComplete(current)) return;
  onboardingStore.set({ ...current, done: true, completedAt: now.toISOString() });
  profileStore.set((profile) => ({
    ...profile,
    from: current.from!,
    time: timeLabel(current.time!),
    role: roleLabel(current.role!),
  }));
}
