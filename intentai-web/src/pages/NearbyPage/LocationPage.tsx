// Nearby → area and location (NBR 01–06). Geographic areas only; language settings stay on /nearby/places.
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import Toggle from '../../components/Toggle/Toggle';
import { setSelectedArea, useExplorePersonal } from '../../features/nearby/actions';
import { areasIn, regionsIn } from '../../features/nearby/catalogue';
import { BackHeader } from '../../features/nearby/components/NearbyChrome';
import { LOCATION_DISCLOSURE, fixInSingapore, locationStatusText, useLocationFlow } from '../../features/nearby/components/LocationFlow';
import styles from '../../features/nearby/components/Nearby.module.css';
import { isPrecise, useLocationState } from '../../features/nearby/location';
import { paths } from '../../routes';

export default function LocationPage() {
  const navigate = useNavigate();
  const personal = useExplorePersonal();
  const location = useLocationState();
  const flow = useLocationFlow();
  const status = locationStatusText(location);
  const regions = regionsIn('SG');
  const areas = areasIn('SG');

  const choose = (areaId: string | null) => {
    setSelectedArea(areaId ?? undefined);
    navigate(areaId ? `${paths.nearby}?area=${encodeURIComponent(areaId)}` : paths.nearby, { state: { manual: true } });
  };

  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={styles.screen}>
        <BackHeader title="Where to explore" fallback={paths.nearby} />
        <p className={styles.note}>Nearby covers Singapore. Pick an area, or use your location to sort places by distance.</p>

        <section className={styles.panel} aria-labelledby="loc-title">
          <h2 id="loc-title" className={styles.panelTitle}>
            Your location
          </h2>
          <p className={styles.body}>{LOCATION_DISCLOSURE}</p>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                flow.start();
              }}
            >
              📍 Use my location
            </button>
            <span className={styles.spacer} />
            <span className={styles.label} id="loc-toggle-label">
              Location in Nearby
            </span>
            <Toggle label="Location in Nearby" checked={flow.enabled} onChange={(on) => (on ? flow.start() : flow.turnOff())} />
          </div>
          <p className={styles.note} role="status">
            {status ??
              (location.status === 'active' && fixInSingapore(location)
                ? isPrecise(location.fix)
                  ? 'Location found. Explore now sorts by distance from you.'
                  : 'Approximate location found.'
                : flow.enabled
                  ? 'Location is allowed. Press “Use my location” to find places near you.'
                  : 'Location is off. Choose an area below.')}
          </p>
          {location.status === 'active' && fixInSingapore(location) && (
            <button type="button" className={styles.secondary} onClick={() => navigate(paths.nearby)}>
              Back to the map
            </button>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="area-title">
          <h2 id="area-title" className={styles.panelTitle}>
            Choose an area
          </h2>
          <button type="button" className={styles.secondary} onClick={() => choose(null)} aria-pressed={!personal.selectedAreaId}>
            All of Singapore
          </button>
          {regions.map((region) => {
            const list = areas.filter((a) => a.regionId === region.id);
            if (list.length === 0) return null;
            return (
              <div key={region.id}>
                <h3 className={styles.groupTitle}>{region.name}</h3>
                <ul className={styles.chips} style={{ marginTop: '0.5rem' }}>
                  {list.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={styles.filterChip}
                        aria-pressed={personal.selectedAreaId === a.id}
                        onClick={() => choose(a.id)}
                      >
                        {a.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <p className={styles.note}>Area centres come from each area’s Wikipedia article (OpenStreetMap-based coordinates).</p>
        </section>
      </div>
      {flow.dialog}
    </AppShell>
  );
}
