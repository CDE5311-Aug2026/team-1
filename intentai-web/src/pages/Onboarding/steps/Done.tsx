import type { StepDef } from './types';

// Stub: heading and an empty stamp, so the done shell is testable. The done step task replaces this file.
function Body() {
  return <h1>Your passport is ready</h1>;
}

function Stamp() {
  return <svg width="74" height="74" viewBox="0 0 80 80" />;
}

export const step: StepDef = {
  id: 'done',
  shell: 'done',
  Body,
  Stamp,
  answered: () => true,
  blockedToast: '',
};
