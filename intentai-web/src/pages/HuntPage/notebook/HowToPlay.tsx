// The desk's "?": a field card with the three moves every stop asks for.
import { Overlay } from './Overlay';
import styles from './props.module.css';

const MOVES: [string, string][] = [
  ['Go there', 'Walk to the real place and check in.'],
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
        <button type="button" className={styles.waxButton} onClick={onClose}>
          <span>Open a volume</span>
        </button>
      </article>
    </Overlay>
  );
}
