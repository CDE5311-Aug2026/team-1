// Figma 6 / 11 history timeline: the card's own dated sentences in time order; the line draws in as it scrolls into
// view and each date follows. With reduced motion everything is shown at once.
import { motion, useReducedMotionConfig } from 'motion/react';
import type { TimelineEvent } from '../../data/home/places';
import styles from './CardPage.module.css';

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  const reduce = useReducedMotionConfig();
  if (events.length === 0) return null;
  return (
    <section className={styles.timeline} aria-label="Timeline">
      <motion.span
        className={styles.timelineLine}
        aria-hidden="true"
        initial={reduce ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <ol className={styles.timelineList}>
        {events.map((e, i) => (
          <motion.li
            key={`${e.label}-${i}`}
            className={styles.timelineItem}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.15 + i * 0.12 }}
          >
            <span className={i === 0 ? `${styles.timelineDot} ${styles.timelineDotFirst}` : styles.timelineDot} aria-hidden="true" />
            <p className={styles.timelineYear}>{e.label}</p>
            <p className={styles.timelineText}>{e.text}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
