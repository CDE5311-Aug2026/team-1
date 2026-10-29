import { step as base } from './Base';
import { step as done } from './Done';
import { step as from } from './From';
import { step as language } from './Language';
import { step as role } from './Role';
import { step as time } from './Time';
import { step as topics } from './Topics';
import type { StepDef } from './types';
import { step as welcome } from './Welcome';

/** Flow order (canvas STEPS). Index 0 is welcome; 1-6 are the questions; 7 is the stamp. */
export const STEPS: readonly StepDef[] = [welcome, from, time, role, language, base, topics, done];

/** Number of question steps (the progress bar's segments). */
export const QUESTION_COUNT = STEPS.filter((s) => s.shell === 'question').length;
