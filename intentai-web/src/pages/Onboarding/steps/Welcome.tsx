import { useEffect, useId, useRef, useState } from 'react';
import mascotLogo from '../../../assets/mascot-logo.png';
import passportEmblem from '../../../assets/onboarding/passport-emblem.png';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import OnboardingCta, { CtaBar } from '../OnboardingCta/OnboardingCta';
import motion from '../Onboarding.module.css';
import { PHOTOS } from '../options';
import type { StepDef, StepProps } from './types';
import styles from './Welcome.module.css';

/** How long the cover takes to swing open before the first question shows. */
export const COVER_OPEN_MS = 850;

const TEASERS = [
  { label: 'Food', photo: PHOTOS.food },
  { label: 'Monuments', photo: PHOTOS.monument },
  { label: 'Festivals', photo: PHOTOS.festival },
];

function Body({ next }: StepProps) {
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leatherId = `leather-${useId().replace(/:/g, '')}`;

  useEffect(() => () => clearTimeout(timer.current), []);

  const start = () => {
    if (opening) return;
    // Nothing to watch without motion: go straight to the first question.
    if (reduced) {
      next();
      return;
    }
    setOpening(true);
    timer.current = setTimeout(next, COVER_OPEN_MS);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.logoRow}>
          <img src={mascotLogo} alt="IntentAI" width={44} height={44} className={styles.logo} />
        </div>
        <span className={styles.grow} />
        <div className={styles.coverWrap}>
          <span aria-hidden="true" className={styles.floor} />
          <div className={`${styles.cover} ${motion.cover} ${opening ? motion.coverOpen : motion.float}`} data-testid="passport-cover" data-state={opening ? 'opening' : 'closed'}>
            <span className={styles.leather}>
              <svg aria-hidden="true" width="100%" height="100%" className={styles.noise}>
                <filter id={leatherId}>
                  <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves={3} seed={4} />
                  <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 0" />
                </filter>
                <rect width="100%" height="100%" filter={`url(#${leatherId})`} />
              </svg>
              <span className={styles.frame} />
              <span className={styles.coverText}>
                <span className={styles.emblem}>
                  <img src={passportEmblem} alt="" width={86} height={86} />
                </span>
                <span className={`${styles.passportWord} ${motion.foil}`}>PASSPORT</span>
                <span className={styles.coverSub}>INTENTAI · SINGAPORE</span>
              </span>
            </span>
          </div>
        </div>
        <h1 className={styles.title}>
          <span className={motion.aBlur} style={{ animationDelay: '0.2s' }}>
            Welcome to the
          </span>{' '}
          <br />
          <span className={motion.aBlur} style={{ animationDelay: '0.35s' }}>
            Singapore Treasure Hunt
          </span>
        </h1>
        <p className={`${styles.lede} ${motion.aUp}`} style={{ animationDelay: '0.5s' }}>
          Find the food, monuments and festivals around you, and collect a stamp for every place.
        </p>
        <ul aria-label="What you can collect" className={styles.teasers}>
          {TEASERS.map((t, i) => (
            <li key={t.label} className={`${styles.teaser} ${motion.aUp}`} style={{ animationDelay: `${(0.6 + i * 0.08).toFixed(2)}s` }}>
              <span className={`${styles.teaserPhoto} ${motion.bob}`} style={{ animationDelay: `${(i * 0.7).toFixed(1)}s` }}>
                <img src={t.photo.src} alt="" />
              </span>
              <span className={styles.teaserLabel}>{t.label}</span>
            </li>
          ))}
        </ul>
        <p className={`${styles.privacy} ${motion.aUp}`} style={{ animationDelay: '0.7s' }}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Six quick questions · everything stays on this phone
        </p>
        <span className={styles.growMore} />
      </div>
      <CtaBar>
        <OnboardingCta label="Start the hunt" enabled onClick={start} />
      </CtaBar>
    </div>
  );
}

export const step: StepDef = {
  id: 'welcome',
  shell: 'none',
  Body,
  answered: () => true,
  blockedToast: '',
};
