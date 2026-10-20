import { useNavigate } from 'react-router-dom';
import backChevron from '../../assets/nearby/back-chevron.svg';
import check from '../../assets/nearby/check.svg';
import AppShell from '../../components/AppShell/AppShell';
import Toggle from '../../components/Toggle/Toggle';
import { PLACES } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { placeStore } from '../../data/stores';
import { useLocationFlow } from '../../features/nearby/components/LocationFlow';
import { paths } from '../../routes';
import { PLACE_INFO, phrasePreview } from './nearbyContent';
import styles from './PlacesPage.module.css';

/** Figma 11:1571 "Nearby — Where are you?": the nine language settings ("Phrases for a setting"). */
export default function PlacesPage() {
  const navigate = useNavigate();
  const [place, setPlace] = usePersistentStore(placeStore);
  // Location is used only by Nearby Explore for distances; the switch shares its explanation and states.
  const flow = useLocationFlow();
  const handleLocation = (on: boolean) => (on ? flow.start() : flow.turnOff());

  const count = PLACE_INFO[place].phraseCount;

  return (
    <AppShell background="var(--bg-screen-b)" tabBarNodeId="11:1707">
      <div className={styles.screen}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.back}
            onClick={() => navigate(paths.nearby)}
            aria-label="Back to Nearby"
            data-node-id="11:1876"
          >
            <img src={backChevron} alt="" width={16} height={16} />
          </button>
          <h1 className={styles.title}>Where are you?</h1>
        </header>
        <p className={styles.intro}>Pick a place, and we’ll show what people say there.</p>

        <div className={styles.setting} data-node-id="11:1880">
          <span className={styles.settingTile} aria-hidden="true">
            📍
          </span>
          <span className={styles.settingText}>
            <span className={styles.settingTitle}>Use my location</span>
            <span className={styles.settingHint}>For distances in Nearby · only on this device, off by default</span>
          </span>
          <Toggle label="Use my location" checked={flow.enabled} onChange={handleLocation} nodeId="11:1889" />
        </div>

        <div className={styles.placesHeader}>
          <h2 className={styles.placesTitle}>Places</h2>
          <span className={styles.count} aria-label={`${PLACES.length} places`}>
            {PLACES.length}
          </span>
        </div>
        <ul className={styles.grid}>
          {PLACES.map((name) => {
            const selected = name === place;
            const info = PLACE_INFO[name];
            return (
              <li key={name}>
                <button
                  type="button"
                  className={selected ? `${styles.place} ${styles.selected}` : styles.place}
                  aria-pressed={selected}
                  onClick={() => setPlace(name)}
                  data-node-id={name === 'Hawker centre' ? '11:1895' : name === 'Mall' ? '11:1938' : undefined}
                >
                  <span className={styles.placeTile} aria-hidden="true">
                    {info.emoji}
                  </span>
                  <span className={styles.placeName}>{name}</span>
                  <span className={styles.placeCount}>{info.phraseCount} phrases</span>
                  {selected && (
                    <span className={styles.check} aria-hidden="true">
                      <img src={check} alt="" width={10} height={10} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" className={styles.cta} onClick={() => navigate(paths.phrases)} data-node-id="11:1943">
          Show {count} phrases for {place}
        </button>
        <p className={styles.preview}>{phrasePreview(place)}</p>
      </div>
      {flow.dialog}
    </AppShell>
  );
}
