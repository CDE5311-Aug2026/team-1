// The top of Hunt's first screen (user tests, 10 Nov 2026):
// - UT02-3 "tell me what this is, with a video demo": a short "What is Hunt?" card with a muted, looping clip. It closes
//   with ×, and stays closed (huntIntroStore); the "?" tile after the boards brings it back. With motion reduced the clip
//   waits on its first frame until you press play.
// - UT02-4 "public and personal leaderboards should be more directly visible": two tiles, My rank (your real places on the
//   Explorers board) and Public board (its leader on this weekend's Fastest board); each opens its board. The other
//   players are Hunt's SAMPLE players (stories.ts), said so under the tiles. A third tile opens your medals.
import { useReducedMotionConfig } from 'motion/react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar/Avatar';
import { rankAmong, SAMPLE_EXPLORERS, SAMPLE_SPEED } from '../../data/hunt/stories';
import { usePersistentStore } from '../../data/persistentStore';
import { huntIntroStore } from '../../data/v2Stores';
import { paths } from '../../routes';
import Icon from '../OnboardingPage/v3/icons';
import type { HuntGo } from './HuntPage';
import styles from './HuntIntro.module.css';

export const HUNT_DEMO = { src: '/hunt/intro/hunt-demo.mp4', poster: '/hunt/intro/hunt-demo-poster.jpg' };

export function HuntIntro() {
  const [intro, setIntro] = usePersistentStore(huntIntroStore);
  const reduce = useReducedMotionConfig();
  if (intro.dismissed) return null;
  return (
    <section className={styles.intro} aria-labelledby="hunt-intro-h">
      <video
        className={styles.video}
        src={HUNT_DEMO.src}
        poster={HUNT_DEMO.poster}
        muted
        loop
        playsInline
        autoPlay={!reduce}
        controls={!!reduce}
        preload="metadata"
        aria-label="Demo: Hunt's story hunts"
      />
      <div className={styles.body}>
        <p className={styles.kicker}>What is Hunt?</p>
        <h2 id="hunt-intro-h" className={styles.title}>
          Story hunts on real streets
        </h2>
        <p className={styles.text}>Walk to each stop and photograph the detail it asks for. AI checks the photo, and the story moves on.</p>
      </div>
      <button type="button" className={styles.close} aria-label="Close What is Hunt?" onClick={() => setIntro({ dismissed: true })}>
        <Icon name="close" size={16} />
      </button>
    </section>
  );
}

/** My rank, the public board and your medals, side by side; with the intro closed, a "?" square after them brings it back. */
export function BoardTiles({ go, explored, medals }: { go: HuntGo; explored: number; medals: { won: number; total: number } }) {
  const [intro, setIntro] = usePersistentStore(huntIntroStore);
  const rank = rankAmong(SAMPLE_EXPLORERS, explored);
  const top = SAMPLE_SPEED[0];
  return (
    <div className={styles.tilesWrap}>
      <div className={styles.tiles}>
        <button
          type="button"
          className={styles.tile}
          onClick={() => go({ board: 'explore' })}
          aria-label={explored ? `My rank: number ${rank}, ${explored} places. Open the Explorers board` : 'My rank: not ranked yet. Open the Explorers board'}
        >
          <span className={styles.tileKicker}>My rank</span>
          <span className={styles.tileMain}>
            <span className={styles.youFace} aria-hidden="true">
              <Avatar name="You" size={26} />
            </span>
            <b className={styles.tileValue}>{explored ? `#${rank}` : '#–'}</b>
          </span>
          <span className={styles.tileSub}>{explored ? `${explored} places` : 'Not ranked yet'}</span>
        </button>
        <button
          type="button"
          className={styles.tile}
          onClick={() => go({ board: 'speed' })}
          aria-label={`Public board: number 1 is ${top.name}, ${top.value} minutes. Open the Fastest board`}
        >
          <span className={styles.tileKicker}>Public board</span>
          <span className={styles.tileMain}>
            <span className={styles.leaderFace} aria-hidden="true">
              <Avatar name={top.name} size={26} />
              <span className={styles.leaderRank}>1</span>
            </span>
            <b className={styles.tileName}>{top.name}</b>
          </span>
          <span className={styles.tileSub}>{top.value} min · Fastest</span>
        </button>
        <Link className={styles.tile} to={paths.huntMedals} aria-label={`Medals: ${medals.won} of ${medals.total} won. Open your medals`}>
          <span className={styles.tileKicker}>Medals</span>
          <span className={styles.tileMain}>
            <span className={styles.medalFace} aria-hidden="true">
              <Icon name="trophy" size={16} />
            </span>
            <b className={styles.tileValue}>{medals.won}</b>
          </span>
          <span className={styles.tileSub}>of {medals.total} won</span>
        </Link>
        {intro.dismissed && (
          <button type="button" className={styles.help} aria-label="What is Hunt?" title="What is Hunt?" onClick={() => setIntro({ dismissed: false })}>
            <Icon name="help" size={20} />
          </button>
        )}
      </div>
      <p className={styles.sample}>Other players are samples until the live boards open.</p>
    </div>
  );
}
