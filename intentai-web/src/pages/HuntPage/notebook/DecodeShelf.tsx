// Under a story's clue cards (owner, 3 Nov 2026): the decode cards (解密卡) you hold, and the night race ticket that wins
// one. A card completes the stop you are on, check-in, look and mechanism, so it asks twice: the first tap lifts it and
// says which stop, the second spends it. Both are objects to tap, as everything on the book is.
import { useState } from 'react';
import type { FindSGStop } from '../../../findsg';
import styles from './decode.module.css';

export function DecodeShelf({ stop, onRace, onDecode }: { stop: FindSGStop; onRace(): void; onDecode(): void }) {
  const [armed, setArmed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const have = stop.cards;
  const open = stop.phase !== 'ending';
  function card() {
    if (!have) return;
    if (!stop.canDecode) {
      setNudge(true);
      setTimeout(() => setNudge(false), 500);
      return;
    }
    if (armed) onDecode();
    else setArmed(true);
  }
  const caption = armed
    ? `Tap again to complete ${stop.stopName}`
    : nudge
      ? 'Spend it on a stop you have not finished'
      : have
        ? `${have} decode card${have > 1 ? 's' : ''} · completes a stop`
        : 'Win a decode card in the night race';
  return (
    <div className={styles.shelf}>
      <div className={styles.objects}>
        <button
          type="button"
          className={`${styles.card} ${have ? '' : styles.empty} ${armed ? styles.armed : ''} ${nudge ? styles.nudge : ''} ${have && stop.canDecode && !armed ? styles.glow : ''}`}
          onClick={card}
          disabled={!have}
          aria-label={have ? (armed ? `Spend a decode card to complete ${stop.stopName}` : `Decode cards: ${have}`) : 'No decode card yet'}
        >
          <span className={styles.wheel} aria-hidden="true" />
          <small aria-hidden="true">Decode</small>
          {have > 0 && (
            <b className={styles.count} aria-hidden="true">
              ×{have}
            </b>
          )}
        </button>
        {open && (
          <button type="button" className={`${styles.ticket} ${have ? '' : styles.glow}`} onClick={onRace} aria-label="Night race: win a decode card">
            <span className={styles.flag} aria-hidden="true" />
            <small aria-hidden="true">Night race</small>
          </button>
        )}
      </div>
      <p className={styles.caption} aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
