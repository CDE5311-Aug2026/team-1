import { isOneOf, isRecord } from './validate';

/** 0 = the permission's first (allowed) state on the Privacy page, 1 = the second. */
export type PermState = 0 | 1;

/** My Space settings and privacy choices that have no older home in `Settings`. */
export interface Preferences {
  notify: { answers: boolean; recap: boolean; occasions: boolean; near: boolean };
  recapTime: 'morning' | 'evening';
  /** Whole kilometres, 1 to 10. */
  radiusKm: number;
  motion: 'full' | 'reduced';
  textSize: 0 | 1 | 2 | 3 | 4;
  captions: boolean;
  haptics: boolean;
  permissions: { calendar: PermState; notifications: PermState; camera: PermState };
  /** Anonymous page timing may leave the phone. */
  usageTiming: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  notify: { answers: true, recap: true, occasions: false, near: true },
  recapTime: 'evening',
  radiusKm: 3,
  motion: 'full',
  textSize: 1,
  captions: true,
  haptics: true,
  permissions: { calendar: 0, notifications: 0, camera: 0 },
  usageTiming: true,
};

/** Root font scale per text size step. */
export const TEXT_SCALE = [0.9, 1, 1.1, 1.2, 1.3] as const;
export const TEXT_SIZE_LABELS = ['Small', 'Default', 'Large', 'Larger', 'Largest'] as const;

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isPerm = (v: unknown): v is PermState => v === 0 || v === 1;

export function isPreferences(value: unknown): value is Preferences {
  if (!isRecord(value)) return false;
  const { notify, permissions, radiusKm, textSize } = value;
  return (
    isRecord(notify) &&
    isBool(notify.answers) &&
    isBool(notify.recap) &&
    isBool(notify.occasions) &&
    isBool(notify.near) &&
    isOneOf(['morning', 'evening'] as const, value.recapTime) &&
    typeof radiusKm === 'number' &&
    Number.isInteger(radiusKm) &&
    radiusKm >= 1 &&
    radiusKm <= 10 &&
    isOneOf(['full', 'reduced'] as const, value.motion) &&
    typeof textSize === 'number' &&
    Number.isInteger(textSize) &&
    textSize >= 0 &&
    textSize <= 4 &&
    isBool(value.captions) &&
    isBool(value.haptics) &&
    isRecord(permissions) &&
    isPerm(permissions.calendar) &&
    isPerm(permissions.notifications) &&
    isPerm(permissions.camera) &&
    isBool(value.usageTiming)
  );
}

/** Keeps each valid field of a damaged record and defaults the rest, so a choice like `usageTiming: false` is never silently undone. */
export function repairPreferences(value: unknown): Preferences | null {
  if (!isRecord(value)) return null;
  const d = DEFAULT_PREFERENCES;
  const notify = isRecord(value.notify) ? value.notify : {};
  const perms = isRecord(value.permissions) ? value.permissions : {};
  const bool = (v: unknown, fallback: boolean) => (isBool(v) ? v : fallback);
  const perm = (v: unknown, fallback: PermState) => (isPerm(v) ? v : fallback);
  const { radiusKm, textSize } = value;
  return {
    notify: {
      answers: bool(notify.answers, d.notify.answers),
      recap: bool(notify.recap, d.notify.recap),
      occasions: bool(notify.occasions, d.notify.occasions),
      near: bool(notify.near, d.notify.near),
    },
    recapTime: isOneOf(['morning', 'evening'] as const, value.recapTime) ? value.recapTime : d.recapTime,
    radiusKm: typeof radiusKm === 'number' && Number.isInteger(radiusKm) && radiusKm >= 1 && radiusKm <= 10 ? radiusKm : d.radiusKm,
    motion: isOneOf(['full', 'reduced'] as const, value.motion) ? value.motion : d.motion,
    textSize:
      typeof textSize === 'number' && Number.isInteger(textSize) && textSize >= 0 && textSize <= 4 ? (textSize as Preferences['textSize']) : d.textSize,
    captions: bool(value.captions, d.captions),
    haptics: bool(value.haptics, d.haptics),
    permissions: {
      calendar: perm(perms.calendar, d.permissions.calendar),
      notifications: perm(perms.notifications, d.permissions.notifications),
      camera: perm(perms.camera, d.permissions.camera),
    },
    usageTiming: bool(value.usageTiming, d.usageTiming),
  };
}
