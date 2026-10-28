import { isOnboarding, isOnboardingComplete, type Onboarding } from '../../data/domain';
import { onboardingStore, profileStore } from '../../data/stores';
import { roleLabel, timeLabel } from './options';
import type { StepDef } from './steps/types';

/**
 * Merges an answer into the record. The result is always a record the store accepts: a finished
 * one is complete and dated, an unfinished one has no date. A finished record that stops being
 * complete (an answer edited on the way back from the stamp) loses `done` and `completedAt` in
 * the same write.
 */
export function applyPatch(previous: Onboarding, patch: Partial<Onboarding>): Onboarding {
  let next = { ...previous, ...patch };
  if (!next.done) next = next.completedAt === null ? next : { ...next, completedAt: null };
  else if (!isOnboardingComplete(next) || next.completedAt === null) next = { ...next, done: false, completedAt: null };
  // A patch carrying a value the store would reject on load (bad date, repeated topic, base off the map) is dropped.
  return isOnboarding(next) ? next : previous;
}

/** Where a (re)opened flow starts: welcome before any answer, else the first unanswered question (topics if none). */
export function resumeStep(steps: readonly StepDef[], data: Onboarding): number {
  const questions = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.shell === 'question');
  if (!questions.some(({ s }) => s.answered(data))) return 0;
  const open = questions.find(({ s }) => !s.answered(data));
  return (open ?? questions[questions.length - 1]).i;
}

/** Stamps the passport: done + date, and the profile My Space shows (from, time, role labels). False (nothing written) if an answer is missing. */
export function finishOnboarding(now: Date = new Date()): boolean {
  const current = onboardingStore.get();
  if (!isOnboardingComplete(current)) return false;
  const finished = { ...current, done: true, completedAt: now.toISOString() };
  onboardingStore.set(finished);
  syncProfile(finished);
  return true;
}

/** Writes the profile My Space shows (from, time, role labels) from a complete onboarding record. */
export function syncProfile(record: Onboarding): void {
  if (!isOnboardingComplete(record)) return;
  profileStore.set((profile) => ({
    ...profile,
    from: record.from!,
    time: timeLabel(record.time!),
    role: roleLabel(record.role!),
  }));
}
