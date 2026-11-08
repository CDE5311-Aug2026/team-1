// A one-time pointer to the Help Center (user test round 1, heuristic 10: the evaluators did not find help). The first
// time a top bar shows, a paper slip points at the lion badge for a few seconds: "Stuck? Tap the lion." v2: it sits to
// the lion's right inside the bar's row (over the page name), so it never covers the category chips under the bar.
// Tapping it opens Help; × dismisses it; it never shows again once seen, dismissed or once Help has been opened.
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import Icon from '../../pages/OnboardingPage/v3/icons';
import { openHelp, useHelp } from './helpStore';
import styles from './HelpCenter.module.css';

const SEEN = 'findsg-help-hint';
const SHOW_AFTER_MS = 1200;
const SHOW_FOR_MS = 7000;
let shownThisVisit = false;

const seen = () => {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    // private mode: it may show again next visit
  }
};

export default function HelpHint() {
  const reduce = useReducedMotionConfig();
  const { open } = useHelp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (shownThisVisit || seen() || /jsdom/i.test(navigator.userAgent)) return;
    const t = window.setTimeout(() => {
      if (shownThisVisit) return;
      shownThisVisit = true;
      markSeen();
      setShow(true);
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), SHOW_FOR_MS);
    return () => window.clearTimeout(t);
  }, [show]);
  useEffect(() => {
    if (open) setShow(false);
  }, [open]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={styles.hint}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 22 }}
        >
          <button
            type="button"
            className={styles.hintOpen}
            onClick={(e) => {
              setShow(false);
              openHelp('ask', e.currentTarget);
            }}
          >
            <Icon name="hand" size={16} className={styles.hintHand} />
            <span>
              <b>Stuck?</b> Tap the lion for help
            </span>
          </button>
          <button type="button" className={styles.hintClose} aria-label="Dismiss the help tip" onClick={() => setShow(false)}>
            <Icon name="close" size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
