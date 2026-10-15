import styles from './Toggle.module.css';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  nodeId?: string;
}

/** Figma "Switch / on|off": 36×22 track, 18px knob. Accessible name comes from `label`. */
export default function Toggle({ label, checked, onChange, nodeId }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.track}
      data-node-id={nodeId}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}
