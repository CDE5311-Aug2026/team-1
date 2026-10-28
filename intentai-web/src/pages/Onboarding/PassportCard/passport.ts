import { ONB_FIELDS, type OnbField, type Onboarding } from '../../../data/domain';
import { LANGS, ROLES, TIMES, roleLabel, topicLabel } from '../options';

/** Passport fields in card order (row-major, two columns). */
export const PASSPORT_FIELDS = ONB_FIELDS;

/** Names used by the eye toggle's label and toast ("Hide home country", "Role hidden on your passport"). */
export const FIELD_NAME: Record<OnbField, string> = {
  from: 'Home country',
  time: 'Time in Singapore',
  role: 'Role',
  language: 'Language',
  base: 'Home base',
  topics: 'Topics',
};

/** The passport value of a field, or '' while unanswered. */
export function passportValue(data: Onboarding, field: OnbField): string {
  switch (field) {
    case 'from':
      return data.from ?? '';
    case 'time':
      return TIMES.find((t) => t.code === data.time)?.passport ?? '';
    case 'role':
      return ROLES.find((r) => r.code === data.role)?.label ?? '';
    case 'language':
      return LANGS.find((l) => l.code === data.language)?.label ?? '';
    case 'base':
      return data.base?.label ?? '';
    case 'topics':
      return data.topics.map(topicLabel).join(' › ');
  }
}

export const MRZ_LENGTH = 44;

/** Machine-readable line: from and role (upper case, spaces as '<') unless hidden, padded with '<' to 44. */
export function mrzLine(data: Onboarding): string {
  const part = (value: string | null, field: OnbField) =>
    value && !data.hidden.includes(field) ? value.toUpperCase().replace(/ /g, '<') : '';
  const line = `P<SGPW<<${part(data.from, 'from')}<<${part(data.role && roleLabel(data.role), 'role')}`;
  return (line + '<'.repeat(MRZ_LENGTH)).slice(0, MRZ_LENGTH);
}
