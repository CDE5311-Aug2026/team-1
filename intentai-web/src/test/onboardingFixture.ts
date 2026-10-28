import type { Onboarding } from '../data/domain';

/** A finished onboarding: unit-test seeds and the Playwright storage state share it. */
export const COMPLETED_ONBOARDING: Onboarding = {
  done: true,
  from: 'China',
  time: 'lt3m',
  role: 'intern',
  language: 'en',
  base: { lat: 1.3049, lng: 103.7735, label: 'NUS UTown' },
  topics: ['food', 'festival', 'monument', 'history'],
  hidden: ['from'],
  completedAt: '2026-10-28T00:00:00.000Z',
};
