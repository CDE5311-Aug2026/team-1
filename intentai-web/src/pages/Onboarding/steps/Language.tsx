import QuestionHeader from '../QuestionHeader/QuestionHeader';
import type { StepDef } from './types';

// Stub: heading only, so the flow runs end to end. The Language step task replaces this file.
function Body() {
  return <QuestionHeader title="Which language do you prefer?" helpers={[{ icon: 'info', text: 'Used for translations on cards and in Ask' }]} />;
}

export const step: StepDef = {
  id: 'language',
  shell: 'question',
  Body,
  answered: (data) => data.language !== null,
  blockedToast: 'Pick one to continue',
};
