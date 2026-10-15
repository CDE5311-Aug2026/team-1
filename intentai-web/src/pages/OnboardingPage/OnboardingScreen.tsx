import type { ReactNode } from 'react';
import AppShell from '../../components/AppShell/AppShell';
import StatusBar from '../../components/StatusBar/StatusBar';
import styles from './OnboardingScreen.module.css';

interface OnboardingScreenProps {
  children: ReactNode;
  /** Bottom actions: an optional secondary text button, then the primary button. */
  footer: ReactNode;
}

/** Onboarding frames (Figma 17:45–17:271) have the status bar but no tab bar or home indicator. */
export default function OnboardingScreen({ children, footer }: OnboardingScreenProps) {
  return (
    <AppShell chrome="none" background="var(--surface)">
      <div className={styles.screen}>
        <div className={styles.statusBar}>
          <StatusBar />
        </div>
        {children}
        <div className={styles.footer}>{footer}</div>
      </div>
    </AppShell>
  );
}
