// "You as a local": the tags that help others decide whether you can help (Community map profile, the avatar next to
// the Local switch). Prefilled from onboarding (From, Language); every tag is optional and the background tag is
// private unless the user chooses to show it. Stored on this device only.
import { createPersistentStore } from '../persistentStore';
import { onDataDeleted } from '../stores';
import { isRecord } from '../validate';
import { countryOf, languageOf, type ProfileV3 } from './profile';

export const CULTURE_TAGS = [
  'Chinese', 'Malay', 'Indian', 'Peranakan', 'Eurasian', 'Hokkien', 'Cantonese', 'Teochew', 'Hakka', 'Tamil',
  'Malaysian', 'Indonesian', 'Filipino', 'Korean', 'Japanese', 'Western',
] as const;

export const NATIVE_LANGUAGES = [
  'English', 'Mandarin', 'Malay', 'Tamil', 'Hokkien', 'Cantonese', 'Teochew', 'Hindi', 'Bahasa Indonesia', 'Korean',
  'Japanese', 'Tagalog', 'Vietnamese', 'Thai',
] as const;

export const HELP_TOPICS = ['Food', 'Festivals', 'Temples & mosques', 'Singlish', 'Family visits', 'Work life', 'Getting around'] as const;

export interface LocalProfile {
  /** Cultures the user feels part of. */
  culture: string[];
  nativeLanguages: string[];
  /** Where they grew up (free text, e.g. "Penang" or "Toa Payoh"). */
  grewUp: string;
  /** Ethnic background: optional, never shown unless showBackground. */
  background: string;
  showBackground: boolean;
  helpWith: string[];
  /** True once the user saved the sheet (before that, prefills come from onboarding). */
  edited: boolean;
}

export const EMPTY_LOCAL_PROFILE: LocalProfile = {
  culture: [],
  nativeLanguages: [],
  grewUp: '',
  background: '',
  showBackground: false,
  helpWith: [],
  edited: false,
};

const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');

export function isLocalProfile(v: unknown): v is LocalProfile {
  return (
    isRecord(v) &&
    strings(v.culture) &&
    strings(v.nativeLanguages) &&
    typeof v.grewUp === 'string' &&
    typeof v.background === 'string' &&
    typeof v.showBackground === 'boolean' &&
    strings(v.helpWith) &&
    typeof v.edited === 'boolean'
  );
}

export const localProfileStore = createPersistentStore<LocalProfile>({
  key: 'local-profile',
  fallback: EMPTY_LOCAL_PROFILE,
  isValid: isLocalProfile,
});

onDataDeleted(() => localProfileStore.set(EMPTY_LOCAL_PROFILE));

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', zh: 'Mandarin', ms: 'Malay', ta: 'Tamil', id: 'Bahasa Indonesia', ko: 'Korean' };

/** The profile as shown: what the user saved, or (before they save) what onboarding already told us. */
export function withPrefill(local: LocalProfile, profile: ProfileV3): LocalProfile {
  if (local.edited) return local;
  const lang = languageOf(profile.language);
  const from = countryOf(profile.from);
  return {
    ...local,
    nativeLanguages: local.nativeLanguages.length ? local.nativeLanguages : lang ? [LANGUAGE_NAMES[lang.id] ?? lang.english] : [],
    grewUp: local.grewUp || (from ? from.name : ''),
  };
}

/** The public tags (what other people see on the map): never the background unless chosen. */
export function publicTags(local: LocalProfile): string[] {
  return [
    ...local.culture,
    ...local.nativeLanguages.map((l) => `Speaks ${l}`),
    ...(local.grewUp ? [`Grew up in ${local.grewUp}`] : []),
    ...(local.showBackground && local.background ? [local.background] : []),
  ];
}

export const toggle = (list: readonly string[], value: string) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
