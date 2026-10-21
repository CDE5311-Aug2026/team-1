// Save / Visited actions with exact Undo, milestone detection and the "not saved on this device" check.
// Undo closures check the data generation: after My Space deletion they can never write data back.
import { usePersistentStore } from '../../data/persistentStore';
import { dataGeneration, explorePersonalStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { COLLECTIONS, collectionProgress, collectionsContaining, collectionTitle } from './catalogue';
import { MILESTONES, type ExplorePersonalData, type PlaceKey } from './domain';
import { restore, setSaved, setVisited, stateOf, VisitDateError, type Change } from './personal';

export function useExplorePersonal() {
  return usePersistentStore(explorePersonalStore)[0];
}

/** False after a storage write failed: the UI says changes will not be saved on this device. */
export function isPersisting(): boolean {
  return explorePersonalStore.persisting();
}

function commit(change: Change, message: string) {
  const generation = dataGeneration();
  const milestonesBefore = explorePersonalStore.get().milestonesSeen;
  explorePersonalStore.set(change.data);
  showToast(message, {
    undo: () => {
      if (dataGeneration() !== generation) return; // deleted meanwhile: nothing comes back
      // Undo puts back the place record and any milestone this change marked as seen.
      explorePersonalStore.set((d) => {
        const next = restore(d, change.key, change.previous);
        if (milestonesBefore === undefined) {
          const { milestonesSeen: _drop, ...rest } = next;
          void _drop;
          return rest as ExplorePersonalData;
        }
        return { ...next, milestonesSeen: milestonesBefore };
      });
    },
  });
}

export function toggleSave(key: PlaceKey, name: string) {
  const current = explorePersonalStore.get();
  const saved = !stateOf(current, key)?.saved;
  const change = setSaved(current, key, saved);
  if (change.unchanged) return;
  commit(change, saved ? `${name} saved` : `${name} removed from Saved`);
}

export interface Milestone {
  collectionId: string;
  title: string;
  percent: number;
}

/** A shown milestone disappears again if the visit that reached it is undone. */
export function stillReached(m: Milestone, data: ExplorePersonalData): boolean {
  const c = COLLECTIONS.find((x) => x.id === m.collectionId);
  return !!c && collectionProgress(c, data).percent >= m.percent;
}

/** Newly reached milestones (10 / 25 / 50 / 100 %) for collections containing the place; records them as seen. */
function milestonesAfter(before: ExplorePersonalData, after: ExplorePersonalData, key: PlaceKey): Milestone[] {
  const out: Milestone[] = [];
  const seen = { ...(after.milestonesSeen ?? {}) };
  for (const c of collectionsContaining(key)) {
    const was = collectionProgress(c, before).percent;
    const now = collectionProgress(c, after).percent;
    const reached = MILESTONES.filter((m) => was < m && now >= m && !(seen[c.id] ?? []).includes(m));
    if (reached.length) {
      const top = reached[reached.length - 1];
      seen[c.id] = [...(seen[c.id] ?? []), ...reached];
      out.push({ collectionId: c.id, title: collectionTitle(c), percent: top });
    }
  }
  if (out.length) explorePersonalStore.set((d) => ({ ...d, milestonesSeen: seen }));
  return out;
}

/** Self-reported visit (default today). Returns any milestone reached, or an error message. */
export function markVisited(key: PlaceKey, name: string, visited: boolean, date?: string): { milestones: Milestone[]; error?: string } {
  const before = explorePersonalStore.get();
  let change: Change;
  try {
    change = setVisited(before, key, visited, { date });
  } catch (error) {
    if (error instanceof VisitDateError) return { milestones: [], error: error.message };
    throw error;
  }
  if (change.unchanged) return { milestones: [] };
  const message = visited
    ? date && stateOf(before, key)?.visited
      ? `Check-in date changed`
      : `Checked in at ${name}`
    : `Check-in removed: ${name}`;
  commit(change, message);
  return { milestones: visited ? milestonesAfter(before, change.data, key) : [] };
}

export function setSelectedArea(areaId: string | undefined) {
  explorePersonalStore.set((d) => {
    const next = { ...d };
    if (areaId) next.selectedAreaId = areaId;
    else delete next.selectedAreaId;
    return next;
  });
}
