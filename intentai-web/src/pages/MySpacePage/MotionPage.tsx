// Settings › Look & feel › Motion (board 18): Full / Reduced on the app-wide reduceMotionStore (App's MotionConfig turns
// every motion/react animation off when Reduced, and follows the phone's own setting otherwise), a live preview and
// what changes. The board's per-feature list (parallax, live hunt pulses) names things this build does not have, so
// the list says only what the setting really does.
import { motion, useReducedMotionConfig } from 'motion/react';
import logo from '../../assets/avatar-logo.png';
import AppShell from '../../components/AppShell/AppShell';
import { usePersistentStore } from '../../data/persistentStore';
import { reduceMotionStore } from '../../data/stores';
import { paths } from '../../routes';
import { Changes, Section, Segmented } from './SettingsParts';
import { Kraft, SubHeader } from './v3/Parts';
import book from './v3/Booklet.module.css';
import styles from './v3/MySpace.module.css';

export default function MotionPage() {
  const [reduced, setReduced] = usePersistentStore(reduceMotionStore);
  // Reduced here, or the phone asks for less motion: the preview stays still either way.
  const still = useReducedMotionConfig() || reduced;

  return (
    <AppShell background="var(--bg-app)" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Motion" back={paths.mySpaceSettings} />
        <p className={styles.lead}>
          Animations make stamping and moving between screens feel alive. Choose Reduced if motion makes you uncomfortable; the app also follows
          your phone’s Reduce Motion setting.
        </p>
        <Segmented
          label="Motion"
          value={reduced ? 'reduced' : 'full'}
          options={[
            { id: 'full', label: 'Full' },
            { id: 'reduced', label: 'Reduced' },
          ]}
          onChange={(v) => setReduced(v === 'reduced')}
        />

        <Section title="Preview">
          <div className={styles.preview} data-testid="motion-preview" data-still={still ? 'true' : 'false'}>
            <span className={styles.previewStamp} aria-hidden="true">
              <motion.span
                animate={still ? { rotate: 0 } : { rotate: [0, -12, 8, 0] }}
                transition={still ? { duration: 0 } : { duration: 1.8, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }}
              >
                <img src={logo} alt="" />
              </motion.span>
            </span>
            <span className={styles.previewText}>
              <span className={styles.previewTitle}>{reduced ? 'Reduced motion' : 'Full motion'}</span>
              <span className={styles.rowSub}>{reduced ? 'Things appear in place, without moving.' : 'Stamps spin, sheets rise, buttons spring.'}</span>
              <span className={styles.track} aria-hidden="true">
                <motion.span
                  initial={false}
                  animate={still ? { width: reduced ? '25%' : '80%' } : { width: ['20%', '80%', '20%'] }}
                  transition={still ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </span>
            </span>
          </div>
        </Section>

        <Section title="What changes">
          <Changes
            items={[
              { icon: 'badge', tint: 'att', title: 'Stamps', text: 'Full: the stamp lands with a spin. Reduced: it simply appears.' },
              { icon: 'cards', tint: 'cru', title: 'Sheets and panels', text: 'Full: they slide up and settle. Reduced: they open in place.' },
              { icon: 'sparkle', tint: 'lei', title: 'Buttons and cards', text: 'Full: a small spring when tapped. Reduced: none.' },
              { icon: 'gear', tint: 'wel', title: 'Phone setting', text: 'With Full picked, the app still follows your phone’s Reduce Motion.' },
            ]}
          />
        </Section>
      </div>
    </AppShell>
  );
}
