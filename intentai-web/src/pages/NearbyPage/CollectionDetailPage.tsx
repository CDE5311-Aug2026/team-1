// One collection (NBR 22–26): progress (visited published members / published members — filters never
// change the denominator), list or map, region / category / visit filters, local search.
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { markVisited, stillReached, useExplorePersonal, type Milestone } from '../../features/nearby/actions';
import { area as areaById, collection as collectionById, collectionProgress, collectionTitle, isDraft, members, regionsIn } from '../../features/nearby/catalogue';
import { BackHeader, StorageWarning } from '../../features/nearby/components/NearbyChrome';
import PlaceCard from '../../features/nearby/components/PlaceCard';
import ShareButton from '../../features/nearby/components/ShareButton';
import { checklistShare } from '../../features/nearby/share';
import { Icon as NearbyIcon } from '../../features/nearby/components/icons';
import styles from '../../features/nearby/components/Nearby.module.css';
import { CATEGORY_INFO } from '../../features/nearby/domain';
import CityMap from '../../features/nearby/map/CityMap';
import { byDistance, matchesQuery, toItem, type Origin } from '../../features/nearby/ranking';
import { CATEGORIES, isCategoryFilter, type CategoryFilter } from '../../features/nearby/types';
import { paths } from '../../routes';
import { ProgressBar } from './CollectionsPage';

type VisitFilter = 'all' | 'todo' | 'done';

export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const c = collectionId ? collectionById(collectionId) : undefined;
  const personal = useExplorePersonal();
  const [params, setParams] = useSearchParams();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!c) {
    return (
      <AppShell background="var(--bg-screen-b)" chrome="status">
        <div className={styles.screen}>
          <BackHeader title="Collection not found" fallback={paths.collections} />
          <p className={styles.empty}>This collection does not exist.</p>
          <Link className={styles.primary} to={paths.collections}>
            All collections
          </Link>
        </div>
      </AppShell>
    );
  }

  const patch = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const view = params.get('view') === 'map' ? 'map' : 'list';
  const rawCat = params.get('category');
  const category: CategoryFilter = isCategoryFilter(rawCat) ? rawCat : 'all';
  const region = params.get('region') ?? '';
  const visit: VisitFilter = params.get('visit') === 'todo' ? 'todo' : params.get('visit') === 'done' ? 'done' : 'all';
  const q = params.get('q') ?? '';
  // filters folded behind "More filters" that are on (its button shows the count)
  const moreCount = (region ? 1 : 0) + (params.get('sort') === 'nearest' ? 1 : 0);

  const progress = collectionProgress(c, personal);
  const title = collectionTitle(c);
  const visited = new Set(personal.places.filter((s) => s.visited).map((s) => s.placeKey as string));
  const stateByKey = new Map(personal.places.map((s) => [s.placeKey, s]));
  const selectedArea = areaById(personal.selectedAreaId);
  const origin: Origin | undefined = selectedArea && !selectedArea.overview ? { kind: 'area', point: selectedArea.center, label: selectedArea.name } : undefined;

  const all = members(c);
  const shown = all.filter(
    (p) =>
      (category === 'all' || p.category === category) &&
      (!region || p.regionId === region) &&
      (visit === 'all' || (visit === 'done' ? visited.has(p.id) : !visited.has(p.id))) &&
      (q.trim().length < 2 || matchesQuery(p, q)),
  );
  const items = shown.map((p) => toItem(p, origin));
  const ordered = origin && params.get('sort') === 'nearest' ? byDistance(items) : items;

  return (
    <AppShell background="var(--bg-screen-b)" chrome="status">
      <div className={styles.screen}>
        <BackHeader
          title={title}
          fallback={paths.collections}
          action={<ShareButton className={styles.headerButton} label="Share this checklist" content={() => checklistShare(c, personal)} />}
        />
        <StorageWarning />
        <p className={styles.body}>
          <strong>
            {progress.visited} of {progress.total} checked in
          </strong>{' '}
          · {progress.percent}%
        </p>
        <ProgressBar percent={progress.percent} label={`${title} progress`} />
        {isDraft(c) && <p className={styles.note}>Draft: still waiting for the team editor’s check.</p>}
        {progress.total > 0 && progress.visited === progress.total && (
          <p className={styles.milestone}>Every place checked in. Well done!</p>
        )}
        {milestones.filter((m) => stillReached(m, personal)).map((m) => (
          <p key={m.collectionId + m.percent} className={styles.milestone} role="status">
            {m.percent}% of this collection checked in.
          </p>
        ))}

        {/* search, with the less used filters (region, order) folded behind one button */}
        <div className={styles.searchRow}>
          <label htmlFor="coll-search" className={styles.srOnly}>
            Search this collection
          </label>
          <input
            id="coll-search"
            className={styles.searchInput}
            type="search"
            maxLength={100}
            placeholder="Search this collection"
            value={q}
            onChange={(e) => patch('q', e.target.value || null)}
          />
          <button
            type="button"
            className={moreCount ? `${styles.moreButton} ${styles.moreActive}` : styles.moreButton}
            aria-expanded={moreOpen}
            aria-controls="coll-more"
            aria-label={`More filters${moreCount ? ` (${moreCount} on)` : ''}`}
            onClick={() => setMoreOpen((o) => !o)}
          >
            <NearbyIcon name="filter" />
            {moreCount > 0 && (
              <span className={styles.moreBadge} aria-hidden="true">
                {moreCount}
              </span>
            )}
          </button>
        </div>
        <ul className={`${styles.chips} ${styles.chipsScroll}`} aria-label="Category">
          {(['all', ...CATEGORIES] as CategoryFilter[]).map((cat) => (
            <li key={cat}>
              <button type="button" className={styles.filterChip} aria-pressed={category === cat} onClick={() => patch('category', cat === 'all' ? null : cat)}>
                {cat === 'all' ? 'All' : CATEGORY_INFO[cat].plural}
              </button>
            </li>
          ))}
        </ul>
        {/* one row of what to show (To do / Checked in, List / Map), one of where and in what order */}
        <div className={styles.row}>
          <div className={styles.segmented} role="group" aria-label="Check-in filter">
            {(
              [
                ['all', 'All'],
                ['todo', 'To do'],
                ['done', 'Checked in'],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" className={styles.segment} aria-pressed={visit === v} onClick={() => patch('visit', v === 'all' ? null : v)}>
                {label}
              </button>
            ))}
          </div>
          <span className={styles.spacer} />
          <div className={styles.segmented} role="group" aria-label="View">
            <button type="button" className={styles.segment} aria-pressed={view === 'list'} onClick={() => patch('view', null)}>
              List
            </button>
            <button type="button" className={styles.segment} aria-pressed={view === 'map'} onClick={() => patch('view', 'map')}>
              Map
            </button>
          </div>
        </div>
        {moreOpen && (
          <div id="coll-more" className={styles.morePanel}>
            <label className={styles.label}>
              Region{' '}
              <select className={styles.select} value={region} onChange={(e) => patch('region', e.target.value || null)}>
                <option value="">All regions</option>
                {regionsIn(c.country).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            {origin ? (
              <label className={styles.label}>
                Order{' '}
                <select className={styles.select} value={params.get('sort') === 'nearest' ? 'nearest' : 'editorial'} onChange={(e) => patch('sort', e.target.value === 'nearest' ? 'nearest' : null)}>
                  <option value="editorial">Editorial order</option>
                  <option value="nearest">Nearest to {origin.label}</option>
                </select>
              </label>
            ) : null}
          </div>
        )}
        <p className={items.length < progress.total ? styles.note : styles.srOnly} aria-live="polite">
          Showing {items.length} of {progress.total}
        </p>

        {view === 'map' && (
          <CityMap
            label={`Map of ${title}`}
            height={300}
            pins={items.map((i) => ({ key: i.key, name: i.name, location: i.location, category: i.category, visited: visited.has(i.key) }))}
            onSelect={(key) => document.querySelector<HTMLElement>(`[data-place="${CSS.escape(key)}"] button, [data-place="${CSS.escape(key)}"] a`)?.focus()}
            focus={{ id: 1, points: all.map((p) => p.coordinates) }}
          />
        )}

        {items.length === 0 ? (
          <p className={styles.empty}>No places match these filters.</p>
        ) : (
          <ul className={styles.rows}>
            {ordered.map((item) => (
              <li key={item.key}>
                <PlaceCard
                  item={item}
                  state={stateByKey.get(item.key)}
                  originKind={origin?.kind}
                  onToggleVisited={() => {
                    const r = markVisited(item.key, item.name, !visited.has(item.key));
                    if (r.milestones.length) setMilestones(r.milestones);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
