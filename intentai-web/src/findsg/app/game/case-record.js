/* Hunt (3 Nov 2026): the record on a closed case, from the saved game alone. The game keeps check-in times but no
 * finish time, so the moment the closed case is first shown is kept here, per route and mode (Start over clears it). */
const key = (routeId, mode) => `findsg-finished:${routeId}:${mode}`;

export function clearFinish(routeId, mode) {
  try {localStorage.removeItem(key(routeId, mode));} catch { /* private mode */ }
}

/** Started (first check-in), finished, how long between, stops found, and how many a decode card completed. */
export function caseRecord(game, stops, now = new Date()) {
  let finished = null;
  try {
    finished = localStorage.getItem(key(game.routeId, game.mode));
    if (!finished) {finished = now.toISOString(); localStorage.setItem(key(game.routeId, game.mode), finished);}
  } catch {finished = now.toISOString();}
  const checks = stops.map(s => game.stops?.[s.id]?.checkin).filter(Boolean);
  const times = checks.map(c => Date.parse(c.confirmedAt)).filter(Number.isFinite);
  const started = times.length ? Math.min(...times) : null, end = Date.parse(finished);
  return {
    started,
    finished: Number.isFinite(end) ? end : null,
    took: started != null && Number.isFinite(end) && end >= started ? end - started : null,
    found: game.completed.length,
    total: stops.length,
    decoded: checks.filter(c => c.method === 'decode-card').length,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayOf = t => {const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]}`;};
export function tookOf(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${String(min % 60).padStart(2, '0')}`;
  return `${Math.round(h / 24)} days`;
}
