// Canvas copy and values for onboarding steps O2–O7 (labels, sub-labels, passport abbreviations,
// preview copy, photos). The store keeps codes; labels live here, keyed by code.
import deepavaliPhoto from '../../assets/holiday/deepavali.jpg';
import { STORY_IMAGES } from '../../assets/stories';
import {
  CULTURE_TOPICS,
  ONB_COUNTRIES,
  ONB_LANGS,
  ONB_ROLES,
  ONB_TIMES,
  type CultureTopic,
  type OnbCountry,
  type OnbField,
  type OnbLang,
  type OnbRole,
  type OnbTime,
} from '../../data/domain';

/** A photo with its alt text and licence credit, as the story images carry them. */
export interface OnbPhoto {
  src: string;
  alt: string;
  credit: string;
}

/** Photos reused from the story/holiday assets (same files as the canvas, resized there). */
export const PHOTOS = {
  food: STORY_IMAGES.bakKwa,
  monument: STORY_IMAGES.thianHockKeng,
  festival: STORY_IMAGES.lanterns,
  history: STORY_IMAGES.plan1822,
  wall: STORY_IMAGES.wallPanels,
  spread: STORY_IMAGES.spreadWindow,
  chinatown: STORY_IMAGES.pagodaStreet,
  deepavali: {
    src: deepavaliPhoto,
    alt: 'The Deepavali light-up on Serangoon Road: lit peacocks and lotus flowers arch over the street at night',
    credit: 'Photo: Cpgfella · CC BY-SA 4.0 · cropped',
  },
} satisfies Record<string, OnbPhoto>;
export type PhotoKey = keyof typeof PHOTOS;

/** Icon outlines (24px grid) used by the time and role tiles and the done screen. */
export const ICON_PATHS = {
  plane: 'M10.5 13.5 3 11l1.5-1.5 7 1 4-4.5c1-1 2.6-1.2 3.2-.6s.4 2.2-.6 3.2l-4.5 4 1 7L13 21l-2.5-7.5Z',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11ZM12 7.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  star: 'M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 8.8l6.1-.7Z',
  cap: 'M2 9l10-5 10 5-10 5ZM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6',
  badge: 'M9 4h6v3H9ZM5 7h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM9 14h6M12 11v6',
  brief: 'M4 8h16v11H4ZM9 8V5h6v3M4 13h16',
  bag: 'M6 8h12l-1 12H7ZM9 8a3 3 0 0 1 6 0',
  family: 'M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 20a5 5 0 0 1 10 0M13 20a3.5 3.5 0 0 1 7 0',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2ZM4 19V5',
  bowl: 'M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z',
  spark: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8Z',
} as const;
export type IconKey = keyof typeof ICON_PATHS;

/** Kicker above each step's preview card; `empty` is the line shown before an answer. */
export const PREVIEW_KICKER = {
  from: 'PREVIEW · HOW CARDS COMPARE',
  time: 'PREVIEW · HOW MUCH CARDS EXPLAIN',
  role: 'PREVIEW · EXAMPLES FOR YOU',
  language: 'PREVIEW · CARDS IN YOUR LANGUAGE',
  base: 'PREVIEW · NEARBY FROM HERE',
  topics: 'PREVIEW · YOUR HOME FEED',
} as const;

/** Passport field labels, in card order (INVENTORY §2.2). */
export const FIELD_LABEL: Record<OnbField, string> = {
  from: 'FROM',
  time: 'IN SINGAPORE',
  role: 'HERE AS',
  language: 'LANGUAGE',
  base: 'HOME BASE',
  topics: 'TOPICS',
};

/* ---------- O2 from ---------- */

export interface CountryOption {
  name: OnbCountry;
  /** Two-letter chip text. */
  code: string;
  /** Flag colour of the chip. */
  color: string;
  /** The first six sit in the grid; the rest are pills under it. */
  primary: boolean;
}

export const COUNTRIES: readonly CountryOption[] = [
  { name: 'China', code: 'CN', color: '#C8102E', primary: true },
  { name: 'India', code: 'IN', color: '#E07B00', primary: true },
  { name: 'Malaysia', code: 'MY', color: '#0032A0', primary: true },
  { name: 'Indonesia', code: 'ID', color: '#A3410B', primary: true },
  { name: 'South Korea', code: 'KR', color: '#23211D', primary: true },
  { name: 'United States', code: 'US', color: '#3C3B6E', primary: true },
  { name: 'Philippines', code: 'PH', color: '#0038A8', primary: false },
  { name: 'Vietnam', code: 'VN', color: '#B31B1B', primary: false },
  { name: 'Myanmar', code: 'MM', color: '#2E7D32', primary: false },
  { name: 'Thailand', code: 'TH', color: '#2D2A4A', primary: false },
  { name: 'United Kingdom', code: 'GB', color: '#012169', primary: false },
  { name: 'Australia', code: 'AU', color: '#00247D', primary: false },
];

export interface Preview {
  photo: OnbPhoto;
  title?: string;
  chip?: string;
  body: string;
}

export const FROM_EMPTY = 'Pick a country to see how cards compare with home.';

export function fromPreview(from: OnbCountry | null): Preview {
  if (from === null) return { photo: PHOTOS.festival, body: FROM_EMPTY };
  if (from === 'India') {
    return { photo: PHOTOS.deepavali, chip: 'Compare with India', body: 'Little India’s light-up, side by side with Diwali at home.' };
  }
  return { photo: PHOTOS.festival, chip: `Compare with ${from}`, body: 'How Singapore celebrates it, next to how it’s done back home.' };
}

/* ---------- O3 time ---------- */

export interface TimeOption {
  code: OnbTime;
  label: string;
  sub: string;
  icon: IconKey;
  /** Shown on the passport card (two labels are shortened). */
  passport: string;
  /** Preview text: how much background a card gives at this stay length. */
  body: string;
}

export const TIMES: readonly TimeOption[] = [
  {
    code: 'lt3m',
    label: 'Less than 3 months',
    sub: 'Just arrived',
    icon: 'plane',
    passport: '< 3 months',
    body: 'A Hokkien temple to Mazu, goddess of the sea, where sailors gave thanks after the voyage from China.',
  },
  {
    code: '3to12m',
    label: '3–12 months',
    sub: 'Settling in',
    icon: 'pin',
    passport: '3–12 months',
    body: 'A Hokkien temple to Mazu. Sailors gave thanks here after the long voyage from China.',
  },
  {
    code: '1to3y',
    label: '1–3 years',
    sub: 'Feeling at home',
    icon: 'home',
    passport: '1–3 years',
    body: 'Mazu temple, built 1839–42. Look up at the dragon ridges.',
  },
  {
    code: 'gt3y',
    label: 'More than 3 years',
    sub: 'Almost a local',
    icon: 'star',
    passport: '3+ years',
    body: 'New this month: restored murals, open until 5 pm.',
  },
];

export const TIME_PREVIEW_TITLE = 'Thian Hock Keng';
export const TIME_PREVIEW_EMPTY = 'Pick how long you’ve been here.';
/** Meter bar widths (percent) of the four bars; the first `4 - index` are filled. */
export const TIME_METER_WIDTHS = [100, 80, 64, 50] as const;

/* ---------- O4 role ---------- */

export interface RoleOption {
  code: OnbRole;
  label: string;
  icon: IconKey;
  previewTitle: string;
  previewBody: string;
  photo: PhotoKey;
}

export const ROLES: readonly RoleOption[] = [
  { code: 'student', label: 'Student', icon: 'cap', previewTitle: 'Between lectures', previewBody: 'The Wall panels are a 3-minute walk from UTown.', photo: 'wall' },
  { code: 'intern', label: 'Student intern', icon: 'badge', previewTitle: 'Lunch break', previewBody: 'The Spread is quiet after 1:30 pm and close to the Wall.', photo: 'spread' },
  { code: 'working', label: 'Working', icon: 'brief', previewTitle: 'After work', previewBody: 'Chinatown’s lanterns light up from 7 pm.', photo: 'festival' },
  { code: 'visiting', label: 'Visiting', icon: 'bag', previewTitle: 'One free morning', previewBody: 'Pair Thian Hock Keng with Chinatown on foot.', photo: 'chinatown' },
  { code: 'family', label: 'Family', icon: 'family', previewTitle: 'With kids', previewBody: 'The temple courtyard is calm before 10 am.', photo: 'monument' },
  { code: 'researcher', label: 'Researcher', icon: 'book', previewTitle: 'Sources first', previewBody: 'Each card links the archive it draws on.', photo: 'food' },
];

export const ROLE_PREVIEW_EMPTY = 'Pick what brings you here.';

/* ---------- O5 language ---------- */

export interface LangOption {
  code: OnbLang;
  /** Native label, shown on the tile and the passport. */
  label: string;
  /** Glyph in the tile chip. */
  glyph: string;
  sub: string;
  /** The preview's temple name in this language. */
  previewTitle: string;
}

export const LANGS: readonly LangOption[] = [
  { code: 'en', label: 'English', glyph: 'EN', sub: 'Cards in English', previewTitle: 'Thian Hock Keng Temple' },
  { code: 'zh', label: '中文', glyph: '中', sub: 'Chinese, simplified', previewTitle: '天福宫' },
  { code: 'ms', label: 'Bahasa Melayu', glyph: 'MS', sub: 'Malay', previewTitle: 'Tokong Thian Hock Keng' },
  { code: 'ta', label: 'தமிழ்', glyph: 'த', sub: 'Tamil', previewTitle: 'தியான் ஹோக் கெங் கோயில்' },
  { code: 'id', label: 'Bahasa Indonesia', glyph: 'ID', sub: 'Indonesian', previewTitle: 'Kuil Thian Hock Keng' },
  { code: 'ko', label: '한국어', glyph: '한', sub: 'Korean', previewTitle: '천복궁 사원' },
];

export const LANG_PREVIEW_BODY = 'Monument · Telok Ayer Street';
export const LANG_PREVIEW_EMPTY = 'Pick a language for your cards.';

/* ---------- O6 base ---------- */

export const BASE_PREVIEW_EMPTY = 'Drop a pin to see what’s closest.';

/* ---------- O7 topics ---------- */

export interface TopicOption {
  id: CultureTopic;
  label: string;
  photo: PhotoKey;
}

export const TOPIC_OPTIONS: readonly TopicOption[] = [
  { id: 'food', label: 'Food', photo: 'food' },
  { id: 'monument', label: 'Monuments', photo: 'monument' },
  { id: 'festival', label: 'Festivals', photo: 'festival' },
  { id: 'history', label: 'History', photo: 'history' },
];

export const TOPICS_PREVIEW_EMPTY = 'Tap a topic to start your ranking.';

/** Preview for the ranked topics so far: #1 photo, "<Topic> first" and what comes next. */
export function topicsPreview(topics: readonly CultureTopic[]): Preview {
  if (topics.length === 0) return { photo: PHOTOS.food, body: TOPICS_PREVIEW_EMPTY };
  const [first, ...rest] = topics.map((id) => TOPIC_OPTIONS.find((t) => t.id === id)!);
  return {
    photo: PHOTOS[first.photo],
    chip: '1',
    title: `${first.label} first`,
    body: rest.length === 0 ? 'Keep tapping to rank the rest.' : `Then ${rest.map((t) => t.label).join(', ')}.`,
  };
}

/* ---------- lookups for the passport card and the profile write ---------- */

const byCode = <T extends { code: string }>(list: readonly T[], code: string): T | undefined => list.find((o) => o.code === code);

export const timeLabel = (code: OnbTime): string => byCode(TIMES, code)!.label;
export const roleLabel = (code: OnbRole): string => byCode(ROLES, code)!.label;
export const langLabel = (code: OnbLang): string => byCode(LANGS, code)!.label;
export const topicLabel = (id: CultureTopic): string => TOPIC_OPTIONS.find((t) => t.id === id)!.label;

/** Every code the store accepts, so a test can prove each has a label. */
export const ALL_CODES = { from: ONB_COUNTRIES, time: ONB_TIMES, role: ONB_ROLES, language: ONB_LANGS, topics: CULTURE_TOPICS } as const;
