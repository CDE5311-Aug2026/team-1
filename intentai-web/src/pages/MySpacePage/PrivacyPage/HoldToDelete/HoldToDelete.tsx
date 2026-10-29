import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { showToast } from '../../../../hooks/useToast';
import { Trash } from '../../icons';
import styles from './HoldToDelete.module.css';

export const HOLD_MS = 1600;
/** A first Enter/Space arms the button this long. */
export const ARM_MS = 5000;

/**
 * Canvas S3 delete button: press and hold, or press Enter (or Space) twice. Any interruption
 * (release, cancel, lost capture, blur, the page hidden, unmount) resets it; it deletes at most once.
 */
export default function HoldToDelete({ onDelete }: { onDelete: () => void }) {
  const [holding, setHolding] = useState(false);
  const [armed, setArmed] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const armTimer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  const hintId = useId();

  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    window.clearTimeout(holdTimer.current);
    window.clearTimeout(armTimer.current);
    setHolding(false);
    setArmed(false);
    onDeleteRef.current();
  };

  const stopHold = () => {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    setHolding(false);
  };

  const reset = () => {
    stopHold();
    window.clearTimeout(armTimer.current);
    setArmed(false);
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') reset();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(holdTimer.current);
      window.clearTimeout(armTimer.current);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (fired.current || e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setHolding(true);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(fire, HOLD_MS);
  };

  const onPointerUp = () => {
    if (holdTimer.current === undefined) return;
    stopHold();
    showToast('Keep holding to delete');
  };

  // A discrete press (Enter, Space, or an assistive-technology click): the first arms, the second deletes.
  const press = () => {
    if (fired.current) return;
    if (armed) {
      fire();
      return;
    }
    setArmed(true);
    showToast('Press again to delete everything');
    window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setArmed(false), ARM_MS);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) press();
  };

  const label = holding ? 'Keep holding…' : armed ? 'Press again to confirm' : 'Hold to delete all my data';

  return (
    <>
      <button
        type="button"
        className={`${styles.button} ${holding ? styles.holding : ''}`}
        aria-describedby={hintId}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
        // Pointer clicks (detail >= 1) are the hold gesture; a click with no pointer comes from assistive technology.
        onClick={(e) => e.detail === 0 && press()}
        onBlur={reset}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => e.key === ' ' && e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className={styles.fill} aria-hidden="true" />
        <span className={styles.label}>
          <Trash />
          {label}
        </span>
      </button>
      <span id={hintId} className={styles.hint}>
        Press and hold, or press Enter twice
      </span>
    </>
  );
}
