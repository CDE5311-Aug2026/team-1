import type { ReactNode } from 'react';
import motion from '../Onboarding.module.css';
import styles from './OnboardingCta.module.css';

/** Bottom bar that holds the CTA (or the done screen's links), fading the page into it. */
export function CtaBar({ children }: { children: ReactNode }) {
  return <div className={styles.bar}>{children}</div>;
}

interface OnboardingCtaProps {
  label: string;
  /** Not enabled: grey, aria-disabled, but still tappable (the flow shows why it cannot go on). */
  enabled: boolean;
  onClick: () => void;
}

/** Dark CTA with a spinning orange rim while enabled. */
export default function OnboardingCta({ label, enabled, onClick }: OnboardingCtaProps) {
  return (
    <div className={`${styles.rim} ${enabled ? styles.on : ''}`}>
      <span aria-hidden="true" className={`${styles.spin} ${motion.star}`} />
      <button type="button" className={styles.button} aria-disabled={enabled ? undefined : true} onClick={onClick}>
        {label}
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={styles.arrow}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
