import iconAll from '../../assets/v3/moments/filter-all.svg';
import iconAsk from '../../assets/v3/moments/topic-ask.svg';
import iconFestival from '../../assets/v3/moments/topic-festival.svg';
import iconFood from '../../assets/v3/moments/topic-food.svg';
import iconHistory from '../../assets/v3/moments/topic-history.svg';
import iconMonument from '../../assets/v3/moments/topic-monument.svg';
import iconPhrase from '../../assets/v3/moments/phrase.svg';
import iconCommunity from '../../assets/v3/moments/community.svg';
import type { CardTopic, CollectedFilter } from '../../data/moments/moments';
import type { StampShape } from './Stamp/Stamp';

export const TOPIC_ICONS: Record<CardTopic, string> = {
  food: iconFood,
  monument: iconMonument,
  festival: iconFestival,
  history: iconHistory,
};

export const FILTERS: readonly { id: CollectedFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: iconAll },
  { id: 'food', label: 'Food', icon: iconFood },
  { id: 'monument', label: 'Monument', icon: iconMonument },
  { id: 'festival', label: 'Festival', icon: iconFestival },
  { id: 'history', label: 'History', icon: iconHistory },
  { id: 'ask', label: 'Ask', icon: iconAsk },
  { id: 'community', label: 'Community', icon: iconCommunity },
  { id: 'phrases', label: 'Phrases', icon: iconPhrase },
];

/** Stamps alternate a card-shaped and a round print, like the Figma passport. */
export function shapeAt(index: number): StampShape {
  return index % 2 === 0 ? 'card' : 'round';
}

/** "02 NOV 2026" for the stamp print. */
export function stampDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}
