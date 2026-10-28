import { Component, Suspense, lazy, useRef, useState, type ComponentType, type ReactNode, type SyntheticEvent } from 'react';
import type { HomeBase } from '../../data/domain';
import type { LatLng } from '../../features/nearby/types';
import motion from '../../pages/Onboarding/Onboarding.module.css';
import type { OnboardingMapViewProps } from './OnboardingMapView';
import styles from './OnboardingMapFrame.module.css';

type MapModule = { default: ComponentType<OnboardingMapViewProps> };

export interface OnboardingMapFrameProps {
  base: HomeBase | null;
  /** Bumps on every drop (tap, keyboard or locate); the map recentres on the pin and zooms in. */
  drops: number;
  onDrop(point: LatLng): void;
  onLocate(): void;
  /** Loads the map chunk; injectable for tests. */
  loadMap?: () => Promise<MapModule>;
}

const defaultLoadMap = () => import('./OnboardingMapView');

class MapErrorBoundary extends Component<{ onError(): void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// The controls sit over the map: they must never reach it as a tap.
const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Home-base map card: static chrome (tap hint, locate, zoom out, attribution) around the lazily loaded map. */
export default function OnboardingMapFrame({ base, drops, onDrop, onLocate, loadMap = defaultLoadMap }: OnboardingMapFrameProps) {
  // A fresh lazy() per attempt, so Retry does not reuse a cached rejected import.
  const [LazyMap, setLazyMap] = useState(() => lazy(loadMap));
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const locateRef = useRef<HTMLButtonElement>(null);
  // Two zoom levels only: a drop zooms in on the pin, the zoom-out button goes back to the overview.
  const [view, setView] = useState({ zoomed: base !== null, drops, outSeq: 0 });
  let zoomed = view.zoomed;
  if (view.drops !== drops) {
    zoomed = true;
    setView({ ...view, zoomed, drops });
  }

  const retry = () => {
    setLazyMap(() => lazy(loadMap));
    setAttempt((a) => a + 1);
    setFailed(false);
  };

  return (
    <div className={styles.frame}>
      <div className={styles.canvas}>
        {failed ? (
          <div className={styles.error} role="alert">
            <p className={styles.errorText}>Map unavailable</p>
            <button type="button" className={styles.retry} onClick={retry}>
              Retry
            </button>
          </div>
        ) : (
          <MapErrorBoundary key={attempt} onError={() => setFailed(true)}>
            <Suspense fallback={<div className={styles.placeholder} aria-hidden="true" />}>
              <LazyMap base={base} drops={drops} outSeq={view.outSeq} zoomed={zoomed} onDrop={onDrop} onTilesFailed={() => setFailed(true)} />
            </Suspense>
          </MapErrorBoundary>
        )}
      </div>

      {!base && !failed && (
        <span className={styles.hint} aria-hidden="true" data-testid="tap-hint">
          <span className={`${styles.hand} ${motion.tapHint}`}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l4.6.8a2 2 0 0 1 1.6 2.3L17.4 18a3 3 0 0 1-3 2.5H12a4 4 0 0 1-3.2-1.6L6 15.2a1.5 1.5 0 0 1 2.3-1.9L9 14" />
            </svg>
          </span>
          <span className={styles.hintText}>Tap or drag the map</span>
        </span>
      )}

      <div className={styles.controls}>
        <button
          ref={locateRef}
          type="button"
          className={`${styles.control} ${styles.locate} ${motion.press}`}
          aria-label="Use my location"
          onPointerDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            onLocate();
          }}
        >
          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          </svg>
        </button>
        {zoomed && (
          <button
            type="button"
            className={`${styles.control} ${motion.press}`}
            aria-label="Zoom out"
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              setView((v) => ({ ...v, zoomed: false, outSeq: v.outSeq + 1 }));
              // The button goes away with the zoom; keep keyboard focus in the controls.
              locateRef.current?.focus();
            }}
          >
            <span aria-hidden="true">−</span>
          </button>
        )}
      </div>

      <p className={styles.attribution}>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors
        </a>
      </p>
    </div>
  );
}
