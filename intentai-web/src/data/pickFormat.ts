// Kept apart from picks.ts (which loads the atlas) so Home can show times before the picks arrive.
export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
}
