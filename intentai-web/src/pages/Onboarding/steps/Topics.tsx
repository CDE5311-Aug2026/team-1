import { CULTURE_TOPICS } from '../../../data/domain';
import QuestionHeader from '../QuestionHeader/QuestionHeader';
import type { StepDef } from './types';

// Stub: heading only, so the flow runs end to end. The Topics step task replaces this file.
function Body() {
  return <QuestionHeader title="Rank the topics you enjoy most" helpers={[{ icon: 'info', text: 'Tap in order. Home shows your #1 first' }]} />;
}

export const step: StepDef = {
  id: 'topics',
  shell: 'question',
  Body,
  answered: (data) => data.topics.length === CULTURE_TOPICS.length,
  blockedToast: 'Tap all 4 topics to set the order',
  ctaLabel: 'Stamp my passport',
};
