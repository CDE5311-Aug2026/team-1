import { Link, useNavigate } from 'react-router-dom';
import logo from '../../../assets/v3/onboarding/logo.png';
import Dialog from '../../../components/Dialog/Dialog';
import { paths } from '../../../routes';
import Icon from '../../OnboardingPage/v3/icons';
import styles from './MySpace.module.css';

/** Figma switch (52×30). */
export function Switch({ label, checked, onChange, describedBy }: { label: string; checked: boolean; onChange: (on: boolean) => void; describedBy?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} aria-hidden="true" />
    </button>
  );
}

/** S2 / S3 header: back to My Space and the logo. */
export function SubHeader() {
  const navigate = useNavigate();
  return (
    <header className={styles.subHeader}>
      <button type="button" className={styles.square} aria-label="Back" onClick={() => navigate(paths.mySpace)}>
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
