// The live PREVIEW under each onboarding question (Figma O2–O7): what the answer changes, shown with real cards and
// places only. Where the app cannot yet do what the answer is for (comparisons, translations), the preview says so.
import { ARTICLE_IMAGES } from '../../../data/articleImages';
import { curatedPlace } from '../../../features/nearby/catalogue';
import { areaById, formatDistance, placesNear, shortArea, topicPhoto } from '../../../data/profile/finds';
import {
  countryOf,
  languageOf,
  roleOf,
  stayOf,
  topicOf,
  type CountryCode,
  type FieldKey,
  type LanguageId,
  type ProfileV3,
  type RoleId,
  type StayId,
} from '../../../data/profile/profile';
import { cardById } from '../../../data/cards';

export interface Preview {
  kicker: string;
  title: string;
  text: string;
  photo?: { src: string; alt: string };
  /** Card-density meter (stay): how many of 4 lines a card shows. */
  lines?: number;
  /** Text in another script, with its language tag. */
  script?: { text: string; lang: string };
  /** Short list (base: the closest places). */
  list?: string[];
}

const KICKERS: Record<FieldKey, string> = {
  from: 'Preview · how cards compare',
  stay: 'Preview · how much cards explain',
  role: 'Preview · examples for you',
  language: 'Preview · cards in your language',
  base: 'Preview · Nearby from here',
  topics: 'Preview · your home feed',
};

const EMPTY: Record<FieldKey, string> = {
  from: 'Pick a country to see how cards compare with home.',
  stay: 'Pick how long you’ve been here.',
  role: 'Pick what brings you here.',
  language: 'Pick a language for your cards.',
  base: 'Drop a pin to see what’s closest.',
  topics: 'Tap choice(s) to start your ranking.',
};

const EMPTY_PHOTO: Record<FieldKey, string> = {
  from: 'lunar-new-year',
  stay: 'thian-hock-keng',
  role: 'botanic-gardens',
  language: 'thian-hock-keng',
  base: 'botanic-gardens',
  topics: 'chicken-rice',
};

/** How many lines of background a card gives for each stay (summary + facts). */
export const STAY_LINES: Record<StayId, number> = { lt3m: 4, '3to12m': 3, '1to3y': 2, '3yplus': 1 };

/** One example card per role: a card that fits those days. A pick, not a claim about the person. */
export const ROLE_CARD: Record<RoleId, string> = {
  student: 'hawker-culture',
  intern: 'chicken-rice',
  working: 'raffles-hotel',
  visiting: 'botanic-gardens',
  family: 'lunar-new-year',
  researcher: 'singapore-treaty-1819',
};

const SAMPLE_PLACE = 'curated:sg-thian-hock-keng-temple';

function title(id: string) {
  return cardById(id)?.article.title ?? '';
}

export function previewFor(field: FieldKey, profile: ProfileV3): Preview {
  const kicker = KICKERS[field];
  const empty: Preview = { kicker, title: 'Your preview', text: EMPTY[field], photo: ARTICLE_IMAGES[EMPTY_PHOTO[field]] };
  switch (field) {
    case 'from': {
      const country = countryOf(profile.from as CountryCode | null);
      if (!country) return empty;
      return {
        kicker,
        title: `Compared with ${country.name}`,
        text: `Where a card covers it, you’ll see how a custom differs from ${country.name}. ${
          profile.hidden.includes('from') ? 'Hidden on your passport.' : 'Shown on your passport.'
        }`,
        photo: ARTICLE_IMAGES['lunar-new-year'],
      };
    }
    case 'stay': {
      const stay = stayOf(profile.stay);
      if (!stay) return empty;
      const lines = STAY_LINES[stay.id];
      return {
        kicker,
        title: title('thian-hock-keng'),
        text: lines === 4 ? 'Full background: the story and three facts.' : lines === 1 ? 'Just the essentials: one line.' : `Less background: ${lines} lines.`,
        photo: ARTICLE_IMAGES['thian-hock-keng'],
        lines,
      };
    }
    case 'role': {
      const role = roleOf(profile.role as RoleId | null);
      if (!role) return empty;
      const id = ROLE_CARD[role.id];
      return { kicker, title: title(id), text: `An example card for your days as ${/^[AEIOU]/.test(role.label) ? 'an' : 'a'} ${role.label.toLowerCase()}.`, photo: ARTICLE_IMAGES[id] };
    }
    case 'language': {
      const language = languageOf(profile.language as LanguageId | null);
      if (!language) return empty;
      const place = curatedPlace(SAMPLE_PLACE);
      if (language.id === 'en') return { kicker, title: place?.name ?? title('thian-hock-keng'), text: 'Cards in English.', photo: ARTICLE_IMAGES['thian-hock-keng'] };
      const native = language.id === 'zh' ? place?.nameZh : language.id === 'ko' ? place?.nameKo : undefined;
      return {
        kicker,
        title: place?.name ?? title('thian-hock-keng'),
        text: native ? `Cards in English for now. Place names in ${language.name} where we have them.` : 'Cards in English for now.',
        photo: ARTICLE_IMAGES['thian-hock-keng'],
        script: native ? { text: native, lang: language.lang } : undefined,
      };
    }
    case 'base': {
      const area = areaById(profile.base);
      if (!area) return empty;
      const near = placesNear(area.id, 3);
      return {
        kicker,
        title: `Nearby from ${shortArea(area)}`,
        text: 'Closest to your base:',
        list: near.map((n) => `${n.place.name} · ${formatDistance(n.distance)}`),
      };
    }
    case 'topics': {
      if (profile.topics.length === 0) return empty;
      const [first, ...rest] = profile.topics;
      return {
        kicker,
        title: `Home leads with ${topicOf(first).label}`,
        text: rest.length ? `Then ${rest.map((t) => topicOf(t).label).join(', ')}.` : 'Tap the next topic to keep ranking.',
        photo: topicPhoto(first),
      };
    }
  }
}
