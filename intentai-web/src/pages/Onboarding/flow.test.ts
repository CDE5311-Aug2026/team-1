import { expect, test } from 'vitest';
import { DEFAULT_ONBOARDING, isOnboarding, type Onboarding } from '../../data/domain';
import { STORAGE_PREFIX } from '../../data/persistentStore';
import { onboardingStore, profileStore } from '../../data/stores';
import { COMPLETED_ONBOARDING } from '../../test/onboardingFixture';
import { applyPatch, finishOnboarding, resumeStep } from './flow';
import { STEPS } from './steps';

const draft = (patch: Partial<Onboarding>): Onboarding => ({ ...DEFAULT_ONBOARDING, ...patch });
const ids = STEPS.map((s) => s.id);
const ALL_ANSWERS = { ...COMPLETED_ONBOARDING, done: false, completedAt: null };

test('the step list is the canvas order and every step module is registered', () => {
  expect(ids).toEqual(['welcome', 'from', 'time', 'role', 'language', 'base', 'topics', 'done']);
  expect(STEPS.map((s) => s.shell)).toEqual(['none', 'question', 'question', 'question', 'question', 'question', 'question', 'done']);
});

test('answered follows the canvas rule: welcome/done always, topics needs all 4, others need a value', () => {
  const empty = DEFAULT_ONBOARDING;
  expect(STEPS.map((s) => s.answered(empty))).toEqual([true, false, false, false, false, false, false, true]);
  expect(STEPS.map((s) => s.answered(ALL_ANSWERS))).toEqual(STEPS.map(() => true));
  const topics = STEPS[ids.indexOf('topics')];
  expect(topics.answered(draft({ topics: ['food', 'festival', 'monument'] }))).toBe(false);
});

test('resume: welcome before any answer, then the first unanswered question, topics when all are set', () => {
  expect(resumeStep(STEPS, DEFAULT_ONBOARDING)).toBe(0);
  expect(resumeStep(STEPS, draft({ from: 'India' }))).toBe(ids.indexOf('time'));
  expect(resumeStep(STEPS, draft({ from: 'India', time: 'lt3m', role: 'student' }))).toBe(ids.indexOf('language'));
  // A gap earlier in the list wins over later answers.
  expect(resumeStep(STEPS, draft({ time: 'lt3m' }))).toBe(ids.indexOf('from'));
  expect(resumeStep(STEPS, ALL_ANSWERS)).toBe(ids.indexOf('topics'));
});

test('applyPatch merges a draft answer and leaves an unfinished record unfinished', () => {
  expect(applyPatch(DEFAULT_ONBOARDING, { from: 'China' })).toEqual({ ...DEFAULT_ONBOARDING, from: 'China' });
});

test('applyPatch on a finished record keeps it finished while it stays complete', () => {
  const next = applyPatch(COMPLETED_ONBOARDING, { topics: ['history', 'food', 'festival', 'monument'], hidden: [] });
  expect(next.done).toBe(true);
  expect(next.completedAt).toBe(COMPLETED_ONBOARDING.completedAt);
  expect(isOnboarding(next)).toBe(true);
});

test('applyPatch that makes a finished record incomplete clears done and completedAt in the same write', () => {
  const next = applyPatch(COMPLETED_ONBOARDING, { topics: ['food', 'festival', 'monument'] });
  expect(next).toMatchObject({ done: false, completedAt: null, topics: ['food', 'festival', 'monument'] });
  expect(isOnboarding(next)).toBe(true);
});

test('finishOnboarding stamps the record and writes the profile labels', () => {
  onboardingStore.set(ALL_ANSWERS);
  finishOnboarding(new Date('2026-10-29T08:30:00.000Z'));
  expect(onboardingStore.get()).toEqual({ ...ALL_ANSWERS, done: true, completedAt: '2026-10-29T08:30:00.000Z' });
  expect(isOnboarding(JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}onboarding`)!))).toBe(true);
  expect(profileStore.get()).toMatchObject({ from: 'China', time: 'Less than 3 months', role: 'Student intern' });
});

test('finishOnboarding does nothing while an answer is missing', () => {
  const partial = { ...ALL_ANSWERS, base: null };
  onboardingStore.set(partial);
  const before = profileStore.get();
  finishOnboarding();
  expect(onboardingStore.get()).toEqual(partial);
  expect(profileStore.get()).toEqual(before);
});
