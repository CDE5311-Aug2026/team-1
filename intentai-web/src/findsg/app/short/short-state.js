// Beneath the Golden Dome keeps its own progress, one step after another. Only the start is known at first: the
// second building is earned by reading the parcel's clue (deduce), never given away. Paper and films never create a visit.
export const SHORT_ID = 'gold-under-glass';
const modeOf = value => value === 'manual' ? 'manual' : 'preview';
export const shortKey = mode => `findsg-short-v2:${SHORT_ID}:${modeOf(mode)}`;

/** The steps, in the order they must happen; each needs the one before it. */
export const SHORT_STEPS = ['ticket', 'letter', 'arrival1', 'photo1', 'shutter', 'parcel', 'mirror', 'deduce', 'arrival2', 'photo2', 'bottle', 'ending'];

export function emptyShort(mode = 'preview') {
  const s = {version: 2, episodeId: SHORT_ID, mode: modeOf(mode)};
  for (const step of SHORT_STEPS) s[step] = false;
  return s;
}
export function normalizeShort(raw, mode = 'preview') {
  const s = emptyShort(mode), r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (r.episodeId !== SHORT_ID || r.mode !== s.mode) return s;
  let before = true;
  for (const step of SHORT_STEPS) { s[step] = before && r[step] === true; before = s[step]; }
  return s;
}
// the actions the book sends; the two check-ins keep their names
const ACTION_STEP = {checkin1: 'arrival1', checkin2: 'arrival2'};
export function shortTransition(state, action) {
  const s = normalizeShort(state, state?.mode), type = typeof action === 'string' ? action : action?.type;
  if (type === 'reset') return emptyShort(s.mode);
  const step = ACTION_STEP[type] ?? type, i = SHORT_STEPS.indexOf(step);
  if (i < 0 || s[step] || (i > 0 && !s[SHORT_STEPS[i - 1]])) return s;
  return {...s, [step]: true};
}
export function readShort(mode = 'preview', storage) {
  try { return normalizeShort(JSON.parse((storage || window.localStorage).getItem(shortKey(mode)) || 'null'), mode); } catch { return emptyShort(mode); }
}
export function saveShort(state, storage) {
  const s = normalizeShort(state, state?.mode);
  try { (storage || window.localStorage).setItem(shortKey(s.mode), JSON.stringify(s)); return true; } catch { return false; }
}
/** Stops solved: the first once its clue is worked out, the second once the glass is set. */
export function shortCount(s) { return Number(!!s.deduce) + Number(!!s.bottle); }
