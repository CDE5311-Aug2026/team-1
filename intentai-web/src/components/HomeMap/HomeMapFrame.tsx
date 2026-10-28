import { Component, Suspense, lazy, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { PINNED_COUNT, type HomePlace } from '../../data/homePlaces';
import type { LatLng } from '../../features/nearby/types';
import type { MapCommand } from './camera';
import type { HomeMapProps } from './HomeMap';
import styles from './HomeMapFrame.module.css';

type MapModule = { default: ComponentType<HomeMapProps> };

export interface HomeMapFrameProps {
  pins: HomePlace[];
  selectedId: string;
  command: MapCommand;
  lastFocus: LatLng;
  zoom: number;
  /** Height (px) of the carousel covering the bottom of the map. */
  bottomInset: number;
  onPinActivate(id: string): void;
  onLocate(): void;
  /** The "places to explore" chip opens Nearby Explore. */
  onExplore(): void;
  /** Locate was just pressed: the button shows a radar ring. */
  locating?: boolean;
  onZoom(delta: 1 | -1): void;
  onUserZoom(zoom: number): void;
  /** Loads the map chunk; injectable for tests. */
  loadMap?: () => Promise<MapModule>;
}

const defaultLoadMap = () => import('./HomeMap');

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

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

function ZoomIcon({ plus }: { plus: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d={plus ? 'M12 5v14M5 12h14' : 'M5 12h14'} />
    </svg>
  );
}

/** Home's map card: static chrome (count chip, controls, attribution) around the lazily loaded map. */
export default function HomeMapFrame({ onLocate, onExplore, onZoom, locating = false, loadMap = defaultLoadMap, ...mapProps }: HomeMapFrameProps) {
  // A fresh lazy() per attempt, so Retry does not reuse a cached rejected import.
  const [LazyMap, setLazyMap] = useState(() => lazy(loadMap));
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const retry = () => {
    setLazyMap(() => lazy(loadMap));
    setAttempt((a) => a + 1);
    setFailed(false);
  };

  return (
    <div className={styles.frame} style={{ '--map-inset': `${mapProps.bottomInset}px` } as CSSProperties} data-map-frame="">
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
              <LazyMap {...mapProps} onTilesFailed={() => setFailed(true)} />
            </Suspense>
          </MapErrorBoundary>
        )}
      </div>

      <button type="button" className={`press ${styles.count}`} onClick={onExplore} data-map-obstacle="">
        <strong>{PINNED_COUNT}</strong> places to explore
      </button>

      <div className={styles.zoom} data-map-obstacle="">
        <button type="button" className={`press ${styles.zoomButton}`} aria-label="Zoom in" onClick={() => onZoom(1)}>
          <ZoomIcon plus />
        </button>
        <span className={styles.zoomDivider} aria-hidden="true" />
        <button type="button" className={`press ${styles.zoomButton}`} aria-label="Zoom out" onClick={() => onZoom(-1)}>
          <ZoomIcon plus={false} />
        </button>
      </div>

      <button type="button" className={`press ${styles.locate}`} aria-label="Show my location" onClick={onLocate} data-map-obstacle="">
        {locating && <span className={`radar ${styles.radar}`} aria-hidden="true" data-testid="locating" />}
        <LocateIcon />
      </button>

      <p className={styles.attribution} data-map-obstacle="">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors
        </a>
      </p>
    </div>
  );
}
