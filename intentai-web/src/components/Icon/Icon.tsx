import type { IconName } from '../../types';
import iconBell from '../../assets/icon-bell.svg';
import iconBowl from '../../assets/icon-bowl.svg';
import iconChair from '../../assets/icon-chair.svg';
import iconChevron from '../../assets/icon-chevron.svg';
import iconFire from '../../assets/icon-fire.svg';
import iconGrim from '../../assets/icon-grim.svg';
import iconLiveDot from '../../assets/icon-live-dot.svg';
import iconMetro from '../../assets/icon-metro.svg';
import iconSpark from '../../assets/icon-spark.svg';
import iconSpeaker from '../../assets/icon-speaker.svg';
import iconSunrise from '../../assets/icon-sunrise.svg';
import iconThink from '../../assets/icon-think.svg';
import iconWave from '../../assets/icon-wave.svg';
import iconWifi from '../../assets/icon-wifi.svg';
import iconWork from '../../assets/icon-work.svg';
import tabAsk from '../../assets/tab-ask.svg';
import tabCommunity from '../../assets/tab-community.svg';
import tabMoments from '../../assets/tab-moments.svg';
import tabMySpace from '../../assets/tab-my-space.svg';
import tabToday from '../../assets/tab-today.svg';

const ICONS: Record<IconName, string> = {
  sunrise: iconSunrise,
  wifi: iconWifi,
  spark: iconSpark,
  bell: iconBell,
  fire: iconFire,
  wave: iconWave,
  'live-dot': iconLiveDot,
  chevron: iconChevron,
  chair: iconChair,
  bowl: iconBowl,
  speaker: iconSpeaker,
  think: iconThink,
  work: iconWork,
  grim: iconGrim,
  metro: iconMetro,
  'tab-today': tabToday,
  'tab-ask': tabAsk,
  'tab-community': tabCommunity,
  'tab-moments': tabMoments,
  'tab-my-space': tabMySpace,
};

/** URL of an icon's SVG, e.g. for use as a CSS mask. */
export function iconSrc(name: IconName): string {
  return ICONS[name];
}

interface IconProps {
  name: IconName;
  size?: number;
}

export default function Icon({ name, size = 18 }: IconProps) {
  return <img src={ICONS[name]} alt="" width={size} height={size} />;
}
