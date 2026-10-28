import { Component, Suspense, lazy, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { HOME_BASE_LABEL, PINNED_COUNT, type HomePlace } from '../../data/homePlaces';
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
  onSearch(): void;
  onLocate(): void;
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m12.6 12.6 4.4 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Home's map card: static chrome (pill, count chip, controls, attribution) around the lazily loaded map. */
export default function HomeMapFrame({ onSearch, onLocate, onZoom, loadMap = defaultLoadMap, ...mapProps }: HomeMapFrameProps) {
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
    <div className={styles.frame} style={{ '--map-inset': `${mapProps.bottomInset}px` } as CSSProperties}>
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

      <div className={styles.top}>
        <button type="button" className={styles.pill} onClick={onSearch}>
          <span className={styles.pillText}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.near}>Near you</span> · <span className={styles.base}>{HOME_BASE_LABEL}</span>
          </span>
          <span className={styles.search}>
            <SearchIcon />
          </span>
        </button>
        <p className={styles.count}>
          <strong>{PINNED_COUNT}</strong> places to explore
        </p>
      </div>

      <div className={styles.zoom}>
        <button type="button" className={styles.zoomButton} aria-label="Zoom in" onClick={() => onZoom(1)}>
          <span aria-hidden="true">+</span>
        </button>
        <button type="button" className={styles.zoomButton} aria-label="Zoom out" onClick={() => onZoom(-1)}>
          <span aria-hidden="true">−</span>
        </button>
      </div>

      <button type="button" className={styles.locate} aria-label="Show my home base" onClick={onLocate}>
        <LocateIcon />
      </button>

      <p className={styles.attribution}>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors
        </a>
      </p>
    </div>
  );
}
