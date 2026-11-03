// The commission: a kraft envelope closed with a wax seal. Tap the seal: it cracks in two, the flap swings up on its
// crease, and the letter slides out. Tap the letter to read it (and see the film clipped to it).
import { useState, type ReactNode } from 'react';
import styles from './props.module.css';

const key = (id: string) => `hunt-letter-${id}`;
const wasOpened = (id: string) => {
  try {
    return localStorage.getItem(key(id)) === '1';
  } catch {
    return false;
  }
};

export function SealedLetter({
  id,
  initial,
  to,
  from,
  preview,
  onRead,
}: {
  id: string;
  /** Pressed into the wax. */
  initial: string;
  /** The address line on the envelope. */
  to: ReactNode;
  from: string;
  /** What shows of the letter once it's out. */
  preview: ReactNode;
  onRead(): void;
}) {
  const [open, setOpen] = useState(() => wasOpened(id));
  const [breaking, setBreaking] = useState(false);
  function crack() {
    setBreaking(true);
    try {
      localStorage.setItem(key(id), '1');
    } catch {
      /* private mode: it just opens again next time */
    }
    setTimeout(() => setOpen(true), 380);
  }
  const state = open ? styles.envOpen : breaking ? styles.envBreaking : '';
  return (
    <div className={`${styles.envelope} ${state}`}>
      <div className={styles.envBody}>
        <span className={styles.envInside} aria-hidden="true" />
        <button type="button" className={styles.letter} onClick={onRead} tabIndex={open ? 0 : -1} aria-hidden={!open} aria-label="Read the commission letter">
          {preview}
        </button>
        <span className={styles.envPocket} aria-hidden="true">
          <span className={styles.envAddress}>{to}</span>
          <span className={styles.envFrom}>{from}</span>
          <span className={styles.envStamp} aria-hidden="true">
            <i>SG</i>
          </span>
          <span className={styles.envPostmark} aria-hidden="true" />
        </span>
        <span className={styles.envFlap} aria-hidden="true">
          <span className={styles.flapOut} />
          <span className={styles.flapIn} />
        </span>
      </div>
      {!open && (
        <button type="button" className={styles.seal} onClick={crack} aria-label="Break the seal and open the letter">
          <span className={styles.sealHalfL}>
            <b>{initial}</b>
          </span>
          <span className={styles.sealHalfR}>
            <b>{initial}</b>
          </span>
        </button>
      )}
      {!open && !breaking && <span className={styles.envHint}>Press the seal to open the letter</span>}
    </div>
  );
}
