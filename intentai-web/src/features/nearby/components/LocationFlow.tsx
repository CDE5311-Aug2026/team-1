// "Use my location": explain first, then ask the browser once (NBR 03). Shared by Explore, Location and
// the phrase-setting selector so the disclosure and the states are identical everywhere.
// Keep this module light (no catalogue import): the eager phrase-setting page uses it.
import { useState } from 'react';
import Dialog from '../../../components/Dialog/Dialog';
import { usePersistentStore } from '../../../data/persistentStore';
import { explorePersonalStore, settingsStore } from '../../../data/stores';
import { showToast } from '../../../hooks/useToast';
import outlines from '../../../data/explore/outlines.json';
import { inSingapore, type Ring } from '../geo';
import { APPROXIMATE_ACCURACY_M, isPrecise, requestLocation, stopLocation, type LocationState } from '../location';
import styles from './Nearby.module.css';

export const LOCATION_DISCLOSURE =
  'Use your location to sort places by distance. Your position stays in this browser tab: it is not saved, ' +
  'not put in links, and not sent to any server. You can choose an area instead.';

const SG_RINGS = (outlines as unknown as { countries: { SG: Ring[] } }).countries.SG;

export function fixInSingapore(state: LocationState): boolean {
  return state.status === 'active' && !!state.fix && inSingapore(state.fix, SG_RINGS);
}

/** Plain-language state line (null when nothing needs saying). */
export function locationStatusText(state: LocationState): string | null {
  switch (state.status) {
    case 'requesting':
      return 'Finding your location…';
    case 'denied':
      return 'Location permission is off for this site. Choose an area instead, or allow location in your browser settings.';
    case 'unavailable':
      return 'Your location is not available right now. Choose an area instead.';
    case 'timeout':
      return 'Finding your location took too long. Try again, or choose an area.';
    case 'unsupported':
      return 'This browser cannot share a location. Choose an area instead.';
    case 'active':
      if (!fixInSingapore(state)) return 'Nearby works in Singapore. You seem to be elsewhere, so choose an area to explore.';
      if (!isPrecise(state.fix)) return `Approximate location (accuracy worse than ${APPROXIMATE_ACCURACY_M} m). Distances are rough.`;
      return null;
    default:
      return null;
  }
}

/** Returns a `start()` that shows the explanation when needed, plus the dialog element to render. */
export function useLocationFlow(onActive?: () => void) {
  const [settings, setSettings] = usePersistentStore(settingsStore);
  const [personal] = usePersistentStore(explorePersonalStore);
  const [asking, setAsking] = useState(false);

  // The preference turns on only once a position was actually found; a refusal leaves it off.
  const run = () => {
    void requestLocation().then((state) => {
      if (state.status === 'active') {
        setSettings((s) => ({ ...s, location: true }));
        const note = locationStatusText(state);
        if (note) showToast(note);
        onActive?.();
      } else if (state.status !== 'manual') {
        showToast(locationStatusText(state) ?? 'Location is not available. Choose an area instead.');
      }
    });
  };

  const start = () => {
    if (personal.locationDisclosureAcceptedAt) run();
    else setAsking(true);
  };

  const turnOff = () => {
    setSettings((s) => ({ ...s, location: false }));
    stopLocation();
  };

  const dialog = asking ? (
    <Dialog title="Use your location?" onClose={() => setAsking(false)}>
      <p className={styles.body}>{LOCATION_DISCLOSURE}</p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            explorePersonalStore.set((d) => ({ ...d, locationDisclosureAcceptedAt: new Date().toISOString() }));
            setAsking(false);
            run();
          }}
        >
          Continue
        </button>
        <button type="button" className={styles.secondary} onClick={() => setAsking(false)}>
          Not now
        </button>
      </div>
    </Dialog>
  ) : null;

  return { start, turnOff, dialog, enabled: settings.location };
}
