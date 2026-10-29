import styles from './Toggle.module.css';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  nodeId?: string;
  /** Unavailable for now: stays focusable and announced as disabled; activating it calls `onBlocked` instead. */
  disabled?: boolean;
  onBlocked?: () => void;
}

/** Figma "Switch / on|off": 36×22 track, 18px knob. Accessible name comes from `label`. */
export default function Toggle({ label, checked, onChange, nodeId, disabled = false, onBlocked }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={styles.track}
      data-node-id={nodeId}
      onClick={() => (disabled ? onBlocked?.() : onChange(!checked))}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}
