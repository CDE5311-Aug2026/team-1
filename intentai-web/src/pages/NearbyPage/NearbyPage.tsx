import { useNavigate } from 'react-router-dom';
import locationDot from '../../assets/nearby/location-dot.svg';
import youHalo from '../../assets/nearby/you-halo.svg';
import youMarker from '../../assets/nearby/you-marker.svg';
import HomeLink from '../../components/HomeLink/HomeLink';
import AppShell from '../../components/AppShell/AppShell';
import ContextChip from '../../components/ContextChip/ContextChip';
import Icon from '../../components/Icon/Icon';
import PlayAudioButton from '../../components/PlayAudioButton/PlayAudioButton';
import { addLookup } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { lookupsStore, placeStore, settingsStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths, type AskHandoff } from '../../routes';
import { askContextForPlace } from '../AskPage/answer';
import { nearbyContent } from './nearbyContent';
import styles from './NearbyPage.module.css';

// Decorative city blocks of the stylized map (Figma 11:1733), as [x, y, width, height] in px of a 350px-wide map.
const MAP_BLOCKS: [number, number, number, number][] = [
  [13, 11, 70, 46],
  [99, 11, 90, 28],
  [99, 51, 90, 30],
  [285, 11, 70, 48],
  [285, 73, 70, 40],
  [99, 97, 90, 70],
  [205, 97, 64, 30],
  [205, 137, 64, 30],
  [285, 127, 70, 40],
];
const MAP_WIDTH = 350;
const pct = (px: number) => `${(px / MAP_WIDTH) * 100}%`;

/** Figma 11:1414 "Nearby — Heads up". */
export default function NearbyPage() {
  const navigate = useNavigate();
  const [place] = usePersistentStore(placeStore);
  const [settings] = usePersistentStore(settingsStore);
  const [, setLookups] = usePersistentStore(lookupsStore);
  const content = nearbyContent(place);
  const { headsUp } = content;
  const openPlaces = () => navigate(paths.places);
  const askHandoff: AskHandoff = { prompt: `What does ${headsUp.title.toLowerCase()} mean?`, context: askContextForPlace(place) };

  const handleGotIt = () => {
    // Set inside the updater so Undo removes exactly the entry this click added (none if it was already saved).
    let addedId = undefined as string | undefined;
    setLookups((prev) => {
      const next = addLookup(prev, { word: headsUp.title, meaning: headsUp.meaning });
      addedId = next !== prev ? next[0].id : undefined;
      return next;
    });
    if (addedId === undefined) {
      showToast(`${headsUp.title} is already in Moments`);
      return;
    }
    showToast(`${headsUp.title} saved to Moments`, {
      undo: () => setLookups((prev) => prev.filter((item) => item.id !== addedId)),
    });
  };

  return (
    <AppShell background="var(--bg-screen-b)" tabBarNodeId="11:1550">
      <div className={styles.screen}>
        <header className={styles.header}>
          <HomeLink className={styles.logo} />
          <h1 className={styles.title}>Nearby</h1>
          <button type="button" className={styles.locationChip} onClick={openPlaces} data-node-id="11:1730">
            {settings.location ? (
              <img src={locationDot} alt="" width={8} height={8} />
            ) : (
              <span className={styles.dotOff} aria-hidden="true" />
            )}
            {settings.location ? 'Location on' : 'Manual place'}
          </button>
        </header>

        <div className={styles.map} data-node-id="11:1733">
          <span className={styles.park} aria-hidden="true" />
          {MAP_BLOCKS.map(([x, y, width, height]) => (
            <span
              key={`${x}-${y}`}
              className={styles.block}
              style={{ left: pct(x), top: y, width: pct(width), height }}
              aria-hidden="true"
            />
          ))}
          <span className={styles.roadH} aria-hidden="true" />
          <span className={styles.roadV} style={{ left: pct(85), width: 8 }} aria-hidden="true" />
          <span className={styles.roadV} style={{ left: pct(189), width: 10 }} aria-hidden="true" />
          <span className={styles.roadV} style={{ left: pct(271), width: 8 }} aria-hidden="true" />
          <span className={styles.foodCentre} aria-hidden="true" />
          <img src={youHalo} alt="" width={40} height={40} className={styles.youHalo} />
          <img src={youMarker} alt="" width={16} height={16} className={styles.you} />
          <span className={styles.pin} aria-hidden="true">
            {content.pinEmoji ?? <Icon name="bowl" size={18} />}
          </span>
          <p className={styles.placeChip}>
            <span className={styles.placeName}>{content.mapLabel}</span>
            {settings.location && <span className={styles.distance}>· 120 m</span>}
          </p>
          <button type="button" className={styles.change} onClick={openPlaces} data-node-id="11:1781">
            Change
          </button>
        </div>

        <div className={styles.columns}>
          <section className={styles.headsUp} aria-labelledby="nearby-heads-up-title" data-node-id="11:1783">
            <div className={styles.headsUpTop}>
              <span className={styles.iconTile}>
                <Icon name={headsUp.icon} size={36} />
              </span>
              <div className={styles.headsUpText}>
                <ContextChip icon={content.chipIcon} label={content.chipLabel} />
                <div className={styles.wordLine}>
                  <h2 id="nearby-heads-up-title" className={styles.word}>
                    {headsUp.title}
                  </h2>
                  {headsUp.phonetic && <span className={styles.phonetic}>{headsUp.phonetic}</span>}
                </div>
                <p className={styles.meaning}>{headsUp.meaning}</p>
              </div>
              <span className={styles.play}>
                <PlayAudioButton text={headsUp.title} />
              </span>
            </div>
            <div className={styles.tip}>
              <p className={styles.tipTitle}>✦&nbsp;&nbsp;Heads up · you’ll likely see this here</p>
              <p className={styles.tipText}>{headsUp.tip}</p>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={handleGotIt} data-node-id="11:1851">
                Got it
              </button>
              <button type="button" className={styles.secondary} onClick={() => navigate(paths.ask, { state: askHandoff })} data-node-id="11:1853">
                Ask IntentAI
              </button>
            </div>
          </section>

          <section className={styles.also} aria-labelledby="nearby-also-title">
            <div className={styles.alsoHeader}>
              <h2 id="nearby-also-title" className={styles.alsoTitle}>
                Also heard here
              </h2>
              <span className={styles.count} aria-label={`${content.alsoHeard.length} phrases`}>
                {content.alsoHeard.length}
              </span>
            </div>
            <ul className={styles.phraseList}>
              {content.alsoHeard.map((phrase, index) => (
                <li key={phrase.id} className={styles.phrase} data-node-id={index === 0 ? '11:1858' : '11:1867'}>
                  <span className={styles.phraseTile} aria-hidden="true">
                    {phrase.emoji}
                  </span>
                  <div className={styles.phraseText}>
                    <div className={styles.phraseLine}>
                      <h3 className={styles.phraseWord}>{phrase.title}</h3>
                      {phrase.phonetic && <span className={styles.phrasePhonetic}>{phrase.phonetic}</span>}
                    </div>
                    <p className={styles.phraseMeaning}>{phrase.meaning}</p>
                  </div>
                  <PlayAudioButton text={phrase.title} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
