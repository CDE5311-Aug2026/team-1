import type { ComponentType } from 'react';
import type { OnbField, Onboarding } from '../../../data/domain';

/** Step ids in flow order: the welcome screen, the six questions (named after their passport field), the stamp. */
export type StepId = 'welcome' | OnbField | 'done';

/** What the flow passes to every step component. */
export interface StepProps {
  /** The onboarding record (draft answers so far). */
  data: Onboarding;
  /** Merges a patch into the store. If a finished record stops being complete, `done` and `completedAt` clear too. */
  update: (patch: Partial<Onboarding>) => void;
  /** Shows the app toast. */
  toast: (msg: string) => void;
  /** Same as tapping the flow CTA: checks `answered`, then moves on (welcome calls it after the cover opens). */
  next: () => void;
}

/**
 * none: the step's Body is the whole screen (welcome).
 * question: top bar + passport card + Body + Preview (in the shared preview slot) + the flow CTA.
 * done: top bar + passport card (with the step's Stamp) + Body; no preview, no flow CTA (Footer instead).
 */
export type StepShell = 'none' | 'question' | 'done';

export interface StepDef {
  id: StepId;
  shell: StepShell;
  Body: ComponentType<StepProps>;
  /** question shell: rendered inside the shared preview section, under Body. */
  Preview?: ComponentType<StepProps>;
  /** Rendered over the passport card's photo (done shell). */
  Stamp?: ComponentType<StepProps>;
  /** done shell: rendered in the bottom CTA bar in place of the flow CTA (outbound links). */
  Footer?: ComponentType<StepProps>;
  /** Whether the flow CTA may move on. */
  answered: (data: Onboarding) => boolean;
  /** Toast when the CTA is tapped before `answered`. */
  blockedToast: string;
  /** Flow CTA label; defaults to "Continue". */
  ctaLabel?: string;
}
