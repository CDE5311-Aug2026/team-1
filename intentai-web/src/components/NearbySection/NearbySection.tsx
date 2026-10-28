import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { HOME_BASE, HOME_PLACES, homePlace, visiblePins, type HomePlace } from '../../data/homePlaces';
import { usePersistentStore } from '../../data/persistentStore';
import { placeStoriesStore } from '../../data/stores';
import { distanceM } from '../../features/nearby/geo';
import type { LatLng } from '../../features/nearby/types';
import { FLY_OVER_M, type MapCommand } from '../HomeMap/camera';
import HomeMapFrame from '../HomeMap/HomeMapFrame';
import { PlaceCarousel } from '../PlaceCarousel/PlaceCarousel';
import styles from './NearbySection.module.css';

const BERLIN_ID = 'berlin-wall-fragments';
const MIN_ZOOM = 12;
const MAX_ZOOM = 19;

export interface NearbyState {
  selectedId: string;
  command: MapCommand;
  /** Where the last focus command pointed; fly distances are measured from here. */
  lastFocus: LatLng;
  zoom: number;
}

export type NearbyAction =
  | { type: 'select'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'locate' }
  | { type: 'zoom'; delta: 1 | -1 }
  | { type: 'userZoom'; zoom: number };

const berlin = homePlace(BERLIN_ID);
if (!berlin) throw new Error(`${BERLIN_ID} missing from HOME_PLACES`);

export const initialNearbyState: NearbyState = {
  selectedId: berlin.id,
  command: { seq: 0, kind: 'focus', target: berlin.point, fly: false },
  lastFocus: berlin.point,
  zoom: 16,
};

function focus(state: NearbyState, selectedId: string, target: LatLng): NearbyState {
  const fly = distanceM(state.lastFocus, target) > FLY_OVER_M;
  return { ...state, selectedId, lastFocus: target, command: { seq: state.command.seq + 1, kind: 'focus', target, fly } };
}

export function nearbyReducer(state: NearbyState, action: NearbyAction): NearbyState {
  switch (action.type) {
    case 'select':
    case 'activate': {
      // Activating the selected place recentres on it; any other place is a plain selection.
      const place = homePlace(action.id);
      return place ? focus(state, place.id, place.point) : state;
    }
    case 'locate':
      return focus(state, BERLIN_ID, HOME_BASE);
    case 'zoom': {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom + action.delta));
      return { ...state, zoom, command: { seq: state.command.seq + 1, kind: 'zoom', delta: action.delta } };
    }
    case 'userZoom':
      return { ...state, zoom: action.zoom };
  }
}

/** One line per distinct credit, naming the places whose photos it covers. */
function creditLines(places: readonly HomePlace[]): { credit: string; names: string[] }[] {
  const byCredit = new Map<string, string[]>();
  for (const p of places) {
    if (!p.photo) continue;
    byCredit.set(p.credit, [...(byCredit.get(p.credit) ?? []), p.name]);
  }
  return [...byCredit].map(([credit, names]) => ({ credit, names }));
}

const CREDITS = creditLines(HOME_PLACES);

interface Props {
  onOpenPlace(id: string): void;
  onSearch(): void;
}

/** Home's Nearby block: the map and the place carousel share one selection and one camera. */
export function NearbySection({ onOpenPlace, onSearch }: Props) {
  const [state, dispatch] = useReducer(nearbyReducer, initialNearbyState);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [inset, setInset] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // The map keeps the selected pin above the cards, so it needs to know how much of it they cover.
  useEffect(() => {
    const map = mapRef.current;
    const carousel = carouselRef.current;
    if (!map || !carousel) return;
    const measure = () => {
      const overlap = map.getBoundingClientRect().bottom - carousel.getBoundingClientRect().top;
      setInset(Math.max(0, Math.round(overlap)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(map);
    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  const select = (id: string) => dispatch({ type: 'select', id });
  const activate = (id: string) => dispatch({ type: 'activate', id });

  return (
    <section className={styles.root} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h2 id={headingId} className={styles.title}>
          Nearby
        </h2>
        <p className={styles.hint}>Swipe a card or tap a pin</p>
      </div>

      <div className={styles.stage}>
        <div ref={mapRef} className={styles.map} data-testid="nearby-map">
          <HomeMapFrame
            pins={visiblePins(state.selectedId)}
            selectedId={state.selectedId}
            command={state.command}
            lastFocus={state.lastFocus}
            zoom={state.zoom}
            bottomInset={inset}
            onPinActivate={activate}
            onSearch={onSearch}
            onLocate={() => dispatch({ type: 'locate' })}
            onZoom={(delta) => dispatch({ type: 'zoom', delta })}
            onUserZoom={(zoom) => dispatch({ type: 'userZoom', zoom })}
          />
        </div>
        <div ref={carouselRef} className={styles.carousel} data-testid="nearby-carousel">
          <PlaceCarousel
            places={HOME_PLACES}
            selectedId={state.selectedId}
            stories={stories}
            onSelect={select}
            onActivate={activate}
            onOpen={onOpenPlace}
          />
        </div>
      </div>

      <details className={styles.credits}>
        <summary className={styles.creditsSummary}>Photo credits</summary>
        <ul className={styles.creditsList}>
          {CREDITS.map(({ credit, names }) => (
            <li key={credit}>
              {names.join(', ')}: {credit}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
