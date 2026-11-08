// Onboarding's board 03 answer (owner, 8 Nov 2026: the two halves did not read as a choice). "Hunt together" or "on
// your own" as two selectable cards in a radiogroup: a radio circle that fills with a check, and a selected card with a
// warm tint and a 2 px ink border (not colour alone); an unselected card keeps its border and shadow, so it still looks
// tappable. Arrow keys move the choice (one Tab stop, as a radio group). Then the region map, as in HuntModeEditor
// (its map half, with the same pins and place list). HuntModeEditor itself is shared and owner-only; Settings keeps it.
import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { catalogueRegionPins } from '../../components/ProfileEditors/HuntModeEditor';
import RegionMap from '../../components/RegionMap/RegionMap';
import { REGION_NAMES } from '../../components/RegionMap/regionPaths.generated';
import { TOURISM_INFO } from '../../data/tourism';
import type { RegionId } from '../../data/ura/ura';
import type { HuntMode } from '../../data/v2Stores';
import editor from '../../components/ProfileEditors/ProfileEditors.module.css';
import styles from './HuntChoice.module.css';

interface Option {
  id: HuntMode;
  title: string;
  sub: string;
  icon: ReactNode;
}

const OPTIONS: readonly Option[] = [
  {
    id: 'together',
    title: 'Yes, hunt together',
    sub: 'See open challenges',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
      </svg>
    ),
  },
  {
    id: 'solo',
    title: 'Not now',
    sub: 'Explore on your own',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

/** The together / solo cards: role="radiogroup" with role="radio" + aria-checked, one Tab stop, arrows to move. */
export function HuntChoice({ mode, onMode }: { mode?: HuntMode; onMode: (mode: HuntMode) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = OPTIONS.findIndex((o) => o.id === mode);
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + OPTIONS.length) % OPTIONS.length;
    onMode(OPTIONS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div className={styles.group} role="radiogroup" aria-label="Hunt with others nearby?">
      {OPTIONS.map((o, i) => {
        const on = o.id === mode;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (at < 0 && i === 0) ? 0 : -1}
            className={on ? `${styles.card} ${styles.on}` : styles.card}
            onClick={() => onMode(o.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={styles.radio} aria-hidden="true">
              {on && (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              )}
            </span>
            <span className={styles.icon} aria-hidden="true">
              {o.icon}
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{o.title}</span>
              <span className={styles.sub}>{o.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  mode?: HuntMode;
  region?: RegionId;
  onMode: (mode: HuntMode) => void;
  onRegion: (region: RegionId) => void;
}

/** Question 2 (and its edit sheet on the review): the choice cards, then the hunt region on the map. */
export default function HuntStepEditor({ mode, region, onMode, onRegion }: Props) {
  const pins = useMemo(catalogueRegionPins, []);
  const inRegion = region ? pins.filter((p) => p.region === region) : [];
  return (
    <div className={editor.stack}>
      <HuntChoice mode={mode} onMode={onMode} />

      <div className={editor.mapHead}>
        <p className={editor.mapTitle}>Choose your hunt region</p>
        <span className={editor.mapNote}>Tap the map or a chip</span>
      </div>
      <RegionMap pins={pins} filter="all" region={region} onRegion={onRegion} ariaLabel="Hunt region map" />

      {region ? (
        <section className={editor.regionCard} aria-label={`Places in ${REGION_NAMES[region]}`}>
          <p className={editor.regionTitle}>
            {mode === 'together' ? 'Hunting in' : 'Exploring'} {REGION_NAMES[region]}
          </p>
          <p className={editor.regionSub}>
            {inRegion.length} {inRegion.length === 1 ? 'place' : 'places'}
          </p>
          <ul className={editor.regionList}>
            {inRegion.slice(0, 3).map((p) => (
              <li key={p.id}>
                <span className={editor.regionDot} style={{ background: TOURISM_INFO[p.category].fill }} aria-hidden="true" />
                <span className={editor.regionName}>{p.label}</span>
                <span className={editor.regionCat}>{TOURISM_INFO[p.category].label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
