// v2 board 03: "Hunt with others nearby?" + "Choose your hunt region". Shared by onboarding step 2 and Settings (plan A8).
// Together mode only changes what the app shows (leaderboards and example counts); nothing about your location is shared,
// so the board's location-sharing line is left out (owner decision D5). Hunter counts are not drawn here: there is no live
// data; screens that show them pass labelled Example badges to RegionMap themselves.
import { useMemo } from 'react';
import { PUBLISHED_PLACES } from '../../features/nearby/catalogue';
import { TOURISM_INFO, tourismOf, type TourismFilter } from '../../data/tourism';
import type { RegionId } from '../../data/ura/ura';
import type { HuntMode } from '../../data/v2Stores';
import RegionMap, { type RegionMapPin } from '../RegionMap/RegionMap';
import { REGION_NAMES } from '../RegionMap/regionPaths.generated';
import styles from './ProfileEditors.module.css';

const REGIONS = new Set<string>(['central', 'east', 'north', 'north-east', 'west']);

/** Every published, sorted place as a RegionMap pin (planned places are drafts, so never here). */
export function catalogueRegionPins(): RegionMapPin[] {
  return PUBLISHED_PLACES.flatMap((p) => {
    const category = tourismOf(p);
    if (!category || !REGIONS.has(p.regionId)) return [];
    return [
      {
        id: p.id,
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
        category,
        region: p.regionId as RegionId,
        label: p.name,
      },
    ];
  });
}

interface Props {
  mode?: HuntMode;
  region?: RegionId;
  filter?: TourismFilter;
  onMode: (mode: HuntMode) => void;
  onRegion: (region: RegionId) => void;
}

export default function HuntModeEditor({ mode, region, filter = 'all', onMode, onRegion }: Props) {
  const pins = useMemo(catalogueRegionPins, []);
  const inRegion = region ? pins.filter((p) => p.region === region && (filter === 'all' || p.category === filter)) : [];

  return (
    <div className={styles.stack}>
      <div className={styles.modeRow} role="group" aria-label="Hunt with others nearby?">
        <button
          type="button"
          className={mode === 'together' ? `${styles.mode} ${styles.modeOn}` : styles.mode}
          aria-pressed={mode === 'together'}
          onClick={() => onMode('together')}
        >
          <span className={styles.modeIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
            </svg>
          </span>
          <span className={styles.modeText}>
            <span className={styles.modeTitle}>Yes, hunt together</span>
            <span className={styles.modeSub}>See open challenges</span>
          </span>
        </button>
        <button
          type="button"
          className={mode === 'solo' ? `${styles.mode} ${styles.modeOn}` : styles.mode}
          aria-pressed={mode === 'solo'}
          onClick={() => onMode('solo')}
        >
          <span className={styles.modeIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </span>
          <span className={styles.modeText}>
            <span className={styles.modeTitle}>Not now</span>
            <span className={styles.modeSub}>Explore on your own</span>
          </span>
        </button>
      </div>

      <div className={styles.mapHead}>
        <p className={styles.mapTitle}>Choose your hunt region</p>
        <span className={styles.mapNote}>Tap the map or a chip</span>
      </div>
      <RegionMap pins={pins} filter={filter} region={region} onRegion={onRegion} ariaLabel="Hunt region map" />

      {region ? (
        <section className={styles.regionCard} aria-label={`Places in ${REGION_NAMES[region]}`}>
          <p className={styles.regionTitle}>
            {mode === 'together' ? 'Hunting in' : 'Exploring'} {REGION_NAMES[region]}
          </p>
          <p className={styles.regionSub}>
            {inRegion.length} {inRegion.length === 1 ? 'place' : 'places'}
            {filter !== 'all' ? ` · ${TOURISM_INFO[filter].label}` : ''}
          </p>
          <ul className={styles.regionList}>
            {inRegion.slice(0, 3).map((p) => (
              <li key={p.id}>
                <span className={styles.regionDot} style={{ background: TOURISM_INFO[p.category].fill }} aria-hidden="true" />
                <span className={styles.regionName}>{p.label}</span>
                <span className={styles.regionCat}>{TOURISM_INFO[p.category].label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
