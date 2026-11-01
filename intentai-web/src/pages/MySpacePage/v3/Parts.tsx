import { Link, useNavigate } from 'react-router-dom';
import logo from '../../../assets/brand/findsg-logo.png';
import Dialog from '../../../components/Dialog/Dialog';
import { paths } from '../../../routes';
import Icon from '../../OnboardingPage/v3/icons';
import styles from './MySpace.module.css';

/**
 * Figma switch (52×30). `disabled`: its dependency is off. It stays focusable and is announced as unavailable
 * (aria-disabled); pressing it calls `onBlocked` (a hint) instead of changing.
 */
export function Switch({
  label,
  checked,
  onChange,
  describedBy,
  disabled = false,
  onBlocked,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  describedBy?: string;
  disabled?: boolean;
  onBlocked?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      className={styles.switch}
      onClick={() => (disabled ? onBlocked?.() : onChange(!checked))}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}

/** S2 / S3 header: back (to My Space unless `back` says otherwise) and the logo. */
export function SubHeader({ back = paths.mySpace }: { back?: string } = {}) {
  const navigate = useNavigate();
  return (
    <header className={styles.subHeader}>
      <button type="button" className={styles.square} aria-label="Back" onClick={() => navigate(back)}>
        <Icon name="back" size={22} />
      </button>
      <Link to={paths.today} aria-label="Home" className={styles.logoLink}>
        <img src={logo} alt="" width={40} height={40} />
      </Link>
    </header>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Help & feedback" onClose={onClose}>
      <p className={styles.dialogText}>
        This is a design prototype in a user test. To share feedback or ask for help, tell the person running your session: there is no
        form, and nothing you type here is sent anywhere.
      </p>
      <button type="button" className={styles.save} onClick={onClose}>
        OK
      </button>
    </Dialog>
  );
}
