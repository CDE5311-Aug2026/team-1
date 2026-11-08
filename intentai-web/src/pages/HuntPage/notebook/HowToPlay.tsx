// The desk's "?": the field rules, the three moves every stop asks for. It opens by itself on the first visit; it
// closes with the round × up top or with "Got it" across its foot. v2 (owner, 8 Nov 2026): a sheet of the archive's
// chart paper (survey grid, rhumb lines) with ChartPaper's brass rose turning slowly in its corner (still when motion is
// reduced: chartPaper.module.css), v2 type, and a v2 primary button.
import { CompassRose } from './ChartPaper';
import { Overlay } from './Overlay';
import styles from './howToPlay.module.css';

const MOVES: [string, string][] = [
  ['Go there', 'Walk to the real place and check in, or play remotely from anywhere.'],
  ['Look, then solve', 'Spot the detail on the building, then work the 3D model with it.'],
  ['Keep the clue', 'The find joins your clues and the story moves on.'],
];

export function HowToPlay({ onClose }: { onClose(): void }) {
  return (
    <Overlay label="How to play" onClose={onClose} tone="sheet">
      <article className={styles.sheet} aria-labelledby="how-to-play-title">
        <span className={styles.rays} aria-hidden="true" />
        <CompassRose size={92} spin="slow" className={styles.rose} />
        <p className={styles.kicker}>Field rules</p>
        <h2 id="how-to-play-title" className={styles.title}>
          Every stop, three moves.
        </h2>
        <ol className={styles.moves}>
          {MOVES.map(([title, text], i) => (
            <li key={title}>
              <b aria-hidden="true">{i + 1}</b>
              <span>
                <strong>{title}</strong>
                {text}
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.fine}>Real places and history; the story and its characters are fiction.</p>
        {/* the same as the × up top: closes the card onto the field archive (kept in sight on a short screen) */}
        <button type="button" className={styles.gotIt} onClick={onClose}>
          Got it
        </button>
      </article>
    </Overlay>
  );
}
