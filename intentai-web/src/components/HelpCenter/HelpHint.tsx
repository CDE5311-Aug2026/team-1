// A one-time pointer to the Help Center (user test round 1, heuristic 10: the evaluators did not find help). The first
// time a top bar shows, a paper slip hangs under the lion badge for a few seconds: "Stuck? Tap the lion." Tapping it
// opens Help; it never shows again once seen, dismissed or once Help has been opened.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
  const reduce = useReducedMotion();
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
        <motion.button
          type="button"
          className={styles.hint}
          onClick={(e) => {
            setShow(false);
            openHelp('ask', e.currentTarget);
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        >
          <Icon name="hand" size={18} />
          <span>
            <b>Stuck?</b> Tap the lion for help
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
