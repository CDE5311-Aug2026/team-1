import QuestionHeader from '../QuestionHeader/QuestionHeader';
import type { StepDef } from './types';

// Stub: heading only, so the flow runs end to end. The Role step task replaces this file.
function Body() {
  return <QuestionHeader title="What brings you to Singapore?" helpers={[{ icon: 'info', text: 'Used to pick examples that suit your days' }]} />;
}

export const step: StepDef = {
  id: 'role',
  shell: 'question',
  Body,
  answered: (data) => data.role !== null,
  blockedToast: 'Pick one to continue',
};
