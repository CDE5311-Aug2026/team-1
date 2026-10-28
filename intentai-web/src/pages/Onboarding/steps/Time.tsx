import QuestionHeader from '../QuestionHeader/QuestionHeader';
import type { StepDef } from './types';

// Stub: heading only, so the flow runs end to end. The Time step task replaces this file.
function Body() {
  return <QuestionHeader title="How long have you been in Singapore?" helpers={[{ icon: 'info', text: 'Used to decide how much background each card gives' }]} />;
}

export const step: StepDef = {
  id: 'time',
  shell: 'question',
  Body,
  answered: (data) => data.time !== null,
  blockedToast: 'Pick one to continue',
};
