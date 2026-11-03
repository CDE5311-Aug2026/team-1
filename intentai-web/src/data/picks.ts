// Editor's Pick on Home (owner, 31 Oct 2026): the walks (the team's story walks and the atlas editor routes) and the
// curated lists, each a deck of stops. Walks keep their order, visit times and Google Maps directions; lists are sets
// of places (no order, no directions).
import { atlasRoutes } from './atlas/atlasRoutes';
import { teamRoutes } from './routes/teamRoutes';
import { COLLECTIONS, collectionTitle, members } from '../features/nearby/catalogue';
import type { CuratedPlace } from '../features/nearby/domain';
import type { MapsLink } from '../features/nearby/routes/engine';
import { editorRoute } from '../features/nearby/routes/model';

export interface PickStop {
  place: CuratedPlace;
  /** Walks: minutes to spend there (atlas time, or the team's estimate). */
  minutes?: number;
  estimate?: boolean;
  warnings: string[];
}

export interface EditorPick {
  id: string;
  kind: 'walk' | 'list';
  title: string;
  subtitle: string;
  stops: PickStop[];
  /** Walks: total visit minutes and the straight-line km between stops. */
  minutes?: number;
  km?: number;
  /** Walks: Google Maps directions, in parts when a walk has many stops. */
  links?: MapsLink[];
  mode?: 'walking' | 'transit';
  duration?: string;
}

function walk(id: string, date: string): EditorPick | undefined {
  const v = editorRoute(id, date);
  if (!v) return undefined;
  const stops = v.stops.flatMap((s) => (s.curated ? [{ place: s.curated, minutes: s.visitMinutes, estimate: s.visitEstimate, warnings: s.warnings }] : []));
  if (stops.length < 2) return undefined;
  return {
    id: v.id,
    kind: 'walk',
    title: v.title.text,
    subtitle: v.subtitle?.text ?? '',
    stops,
    minutes: v.stats.visitMinutes,
    km: v.stats.km,
    links: v.links,
    mode: v.mode,
    duration: v.duration?.text,
  };
}

export function editorPicks(date: string): EditorPick[] {
  const walks = [...teamRoutes.map((r) => r.id), ...atlasRoutes.map((r) => r.id)].flatMap((id) => walk(id, date) ?? []);
  const lists: EditorPick[] = COLLECTIONS.map((c) => ({
    id: `list:${c.id}`,
    kind: 'list',
    title: collectionTitle(c),
    subtitle: `${members(c).length} places`,
    stops: members(c).map((place) => ({ place, warnings: [] })),
  }));
  return [...walks, ...lists];
}

export function editorPick(id: string, date: string): EditorPick | undefined {
  return editorPicks(date).find((p) => p.id === id);
}

export { formatMinutes } from './pickFormat';
