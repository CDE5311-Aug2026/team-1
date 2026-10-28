import QuestionHeader from '../QuestionHeader/QuestionHeader';
import type { StepDef } from './types';

// Stub: heading only, so the flow runs end to end. The Base step task replaces this file.
function Body() {
  return <QuestionHeader title="Where do you spend most of your time?" helpers={[{ icon: 'info', text: 'Tap the map to set where Nearby searches from' }]} />;
}

export const step: StepDef = {
  id: 'base',
  shell: 'question',
  Body,
  answered: (data) => data.base !== null,
  blockedToast: 'Tap the map to drop your pin',
};
