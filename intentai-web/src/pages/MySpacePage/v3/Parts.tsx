import { useLocation, useNavigate } from 'react-router-dom';
import bar from '../../../components/PageBar/PageBar.module.css';
import { paths } from '../../../routes';
import Icon from '../../OnboardingPage/v3/icons';
import book from './Booklet.module.css';
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

/** The bar of a page opened from somewhere (Settings, Privacy, Licences): back, the title, nothing else. Back returns
 * to wherever the page was opened from (Hunt, Today, Passport...); a page opened straight from a link goes to `back`. */
export function SubHeader({ title, back = paths.today }: { title: string; back?: string }) {
  const navigate = useNavigate();
  const { key } = useLocation();
  return (
    <header className={`${bar.bar} ${bar.light} ${book.bar}`}>
      <button type="button" className={`${bar.settings} ${styles.barBack}`} aria-label="Back" onClick={() => (key === 'default' ? navigate(back) : navigate(-1))}>
        <Icon name="back" size={20} />
      </button>
      <h1 className={bar.title}>{title}</h1>
    </header>
  );
}

/** Passport's kraft paper behind a page that belongs to it. */
export function Kraft() {
  return <span className={book.backdrop} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}home/paper.webp)` }} aria-hidden="true" />;
}
