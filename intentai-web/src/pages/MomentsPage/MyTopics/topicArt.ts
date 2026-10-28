import bowl from '../../../assets/onboarding/icon-bowl.svg';
import sun from '../../../assets/onboarding/icon-sun.svg';
import train from '../../../assets/onboarding/icon-train.svg';
import work from '../../../assets/onboarding/icon-work.svg';
import type { Topic } from '../../../data/domain';

/** Topic icons from Figma 17:160/173/185/195 (also used, smaller, on the quiz context chip). */
export const TOPIC_ICON: Record<Topic, string> = {
  Work: work,
  Food: bowl,
  'Daily life': sun,
  'Getting around': train,
};
