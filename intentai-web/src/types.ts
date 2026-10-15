import type { Topic } from './data/domain';

export type IconName =
  | 'sunrise'
  | 'wifi'
  | 'spark'
  | 'bell'
  | 'fire'
  | 'wave'
  | 'live-dot'
  | 'chevron'
  | 'chair'
  | 'bowl'
  | 'speaker'
  | 'think'
  | 'work'
  | 'grim'
  | 'metro'
  | 'tab-today'
  | 'tab-ask'
  | 'tab-community'
  | 'tab-moments'
  | 'tab-my-space';

export interface ExpressionContext {
  icon: IconName;
  label: string;
}

/** A phrase in the lesson bank. Today's three are picked from it by onboarding topic. */
export interface LessonPhrase {
  id: string;
  topic: Topic;
  icon: IconName;
  context: ExpressionContext;
  title: string;
  phonetic?: string;
  description: string;
  /** Example sentence (from v0), used by dialogs, Ask and Nearby. */
  example?: string;
  photo?: string;
}

/** A phrase placed in one of Today's three slots. */
export interface Expression extends LessonPhrase {
  number: string;
  nodeId?: string;
}
