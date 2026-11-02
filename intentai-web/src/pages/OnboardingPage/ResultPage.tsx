// Onboarding v3 O8: the passport is stamped WELCOME and a fan of "Your first finds" says why each was picked (the closest
// place to the home base, then the closest place for the #1 and #2 place tags). Only repo places.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import BlurText from '../../components/reactbits/BlurText';
import { usePersistentStore } from '../../data/persistentStore';
import { firstFinds } from '../../data/profile/finds';
import { ONBOARDING_FIELDS, localDate, profileV3Store, toggleHidden } from '../../data/profile/profile';
import { onboardingStore } from '../../data/stores';
import { paths } from '../../routes';
import Icon from './v3/icons';
import Passport from './v3/Passport';
import useInitial from './v3/useInitial';
import styles from './Onboarding.module.css';

export default function ResultPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const [profile] = usePersistentStore(profileV3Store);
  const initial = useInitial();
  const finds = firstFinds(profile.base, profile.topics);
  const fan = useRef<HTMLUListElement>(null);

  // Open the fan on the middle card (the #1 tag), as in Figma.
  useEffect(() => {
    const list = fan.current;
    const middle = list?.children[1] as HTMLElement | undefined;
    if (!list || !middle) return;
    list.scrollLeft = middle.offsetLeft - (list.clientWidth - middle.clientWidth) / 2;
  }, [finds.length]);

  const leave = (to: string) => {
    // Reaching O8 means the passport is stamped; make sure "/" opens Home.
    onboardingStore.set((prev) => (prev.done ? prev : { ...prev, done: true }));
    navigate(to);
  };

  return (
    <AppShell chrome="none" background="#edebe5">
      <div className={styles.screen}>
        <div className={styles.question}>
          <div className={styles.progressRow}>
            <button type="button" className={styles.back} aria-label="Back" onClick={() => navigate(`${paths.welcome}?step=${ONBOARDING_FIELDS.length}`)}>
              <Icon name="back" size={22} />
            </button>
            <div className={styles.progress} aria-hidden="true">
              {ONBOARDING_FIELDS.map((f) => (
                <span key={f} className={styles.segment}>
                  <span className={styles.segmentFill} style={{ width: '100%' }} />
                </span>
              ))}
            </div>
            <span className={styles.count}>
              {ONBOARDING_FIELDS.length}/{ONBOARDING_FIELDS.length}
            </span>
          </div>
          <Passport
            profile={profile}
            initial={initial}
            fields={ONBOARDING_FIELDS}
            onToggleHidden={toggleHidden}
            stamped={profile.stampedOn ?? localDate()}
          />
          <h1 className={styles.ready}>
            <BlurText as="span" text="Your passport is ready" trigger="load" delay={60} className={styles.readyLine} />
          </h1>
          <p className={styles.closedNote}>
            <Icon name="eyeClosed" size={16} style={{ color: '#e4671f' }} /> Closed eyes keep a detail private
          </p>
          <h2 className={styles.findsTitle}>YOUR FIRST FINDS</h2>
          {finds.length === 0 ? (
            <p className={styles.noFinds}>Set a home base in My Space to see what’s closest.</p>
          ) : (
            <ul ref={fan} className={styles.fan} aria-label="Your first finds">
              {finds.map((find, i) => (
                <motion.li
                  key={find.key}
                  initial={reduce ? false : { y: 40, opacity: 0, rotate: i === 0 ? -8 : i === 2 ? 8 : 0 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22, delay: 0.5 + i * 0.12 }}
                >
                  <Link to={find.href} className={styles.find}>
                    {find.photo ? (
                      <img className={styles.findPhoto} src={find.photo.src} alt={find.photo.alt} />
                    ) : (
                      <span className={styles.findMap} aria-hidden="true">
                        <Icon name="pin" size={72} strokeWidth={1.2} />
                      </span>
                    )}
                    <span className={styles.findShade} aria-hidden="true" />
                    <span className={styles.why}>
                      <Icon name={find.why_icon === 'pin' ? 'pin' : 'star'} size={14} />
                      {find.why}
                    </span>
                    <span className={styles.findTitle}>{find.title}</span>
                    <span className={styles.findSub}>{find.sub}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
          <div className={styles.footer}>
            <button type="button" className={styles.secondary} onClick={() => leave(paths.moments)}>
              See passport
            </button>
            <button type="button" className={`${styles.primary} ${styles.accent}`} onClick={() => leave(paths.today)}>
              Start exploring <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
