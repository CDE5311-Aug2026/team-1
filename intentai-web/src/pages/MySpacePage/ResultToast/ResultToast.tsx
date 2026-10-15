import { useEffect, useState } from 'react';
import check from '../../../assets/my-space/toast-check.svg';
import x from '../../../assets/my-space/toast-x.svg';
import { UNDO_TOAST_MS } from '../../../hooks/useToast';
import type { Outcome } from '../notices';
import styles from './ResultToast.module.css';

interface ResultToastProps {
  outcome: Outcome;
  nodeId: string;
  onUndo: () => void;
}

/**
 * The dark "Toast" drawn inside the result frames (21:1504 / 21:1549), 14px above the tab bar.
 * It is part of the screen rather than the app-wide toast, and closes after the usual undo window.
 */
export default function ResultToast({ outcome, nodeId, onUndo }: ResultToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), UNDO_TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  const confirmed = outcome === 'confirmed';
  return (
    <div className={styles.toast} data-node-id={nodeId} data-result-toast>
      <img src={confirmed ? check : x} alt="" width={16} height={16} />
      <p className={styles.message} role="status">
        {confirmed ? 'Confirmed' : 'Marked not right'}
      </p>
      <button type="button" className={styles.undo} onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
