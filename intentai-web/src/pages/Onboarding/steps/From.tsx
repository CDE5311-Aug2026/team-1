import QuestionHeader from '../QuestionHeader/QuestionHeader';
import type { StepDef } from './types';

// Stub: heading only, so the flow runs end to end. The From step task replaces this file.
function Body() {
  return <QuestionHeader title="Where are you from?" helpers={[{ icon: 'info', text: 'Used to compare customs with home' }, { icon: 'eye', text: 'Private by default · tap the eye to show it' }]} />;
}

export const step: StepDef = {
  id: 'from',
  shell: 'question',
  Body,
  answered: (data) => data.from !== null,
  blockedToast: 'Pick one to continue',
};
