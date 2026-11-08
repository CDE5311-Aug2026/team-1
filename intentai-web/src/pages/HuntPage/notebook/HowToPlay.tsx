// The desk's "?": a field card with the three moves every stop asks for. It opens by itself on the first visit; it
// closes with the round × up top or with "Got it" across its foot.
import { Overlay } from './Overlay';
import styles from './props.module.css';

const MOVES: [string, string][] = [
  ['Go there', 'Walk to the real place and check in, or play remotely from anywhere.'],
  ['Look, then solve', 'Spot the detail on the building, then work the 3D model with it.'],
  ['Keep the clue', 'The find joins your clues and the story moves on.'],
];

export function HowToPlay({ onClose }: { onClose(): void }) {
  return (
    <Overlay label="How to play" onClose={onClose}>
      <article className={styles.readLetter}>
        <p className={styles.readDate}>Field rules</p>
        <h2 className={styles.howTitle}>Every stop, three moves.</h2>
        <ol className={styles.howMoves}>
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
        <p className={styles.howFine}>Real places and history; the story and its characters are fiction.</p>
        {/* the same as the × up top: closes the card onto the field archive (kept in sight on a short screen) */}
        <button type="button" className={styles.howGotIt} onClick={onClose}>
          Got it
        </button>
      </article>
    </Overlay>
  );
}
