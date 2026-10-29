// Ask home (ZIP prototype, view=welcome): one question and two image cards. The cards are optional ways in, not a gate:
// the composer below always takes any question. Each card opens a sheet of examples (backed by the app's real cards and
// phrases) or "ask my own", which marks the composer with what the next question is about.
import type { PointerEvent } from 'react';
import Dialog from '../../components/Dialog/Dialog';
import BlurText from '../../components/reactbits/BlurText';
import { motion, useReducedMotionConfig } from 'motion/react';
import arrowRight from '../../assets/v3/arrow-right.svg';
import culturePhoto from '../../assets/v3/entry-culture-thian-hock-keng.png';
import meaningPhoto from '../../assets/v3/entry-meaning-street.png';
import mascot from '../../assets/v3/mascot.png';
import postcardFood from '../../assets/v3/postcard-bak-kwa.png';
import postcardPlace from '../../assets/v3/postcard-berlin-wall.png';
import { SUBJECTS, suggestionFor, type Subject } from './cards';
import { ALIGN_PHRASE } from './answer';
import styles from './AskHome.module.css';

export type EntryKind = 'culture' | 'meaning';

export interface CultureExample {
  subject: Subject;
  cardId: string;
  question: string;
  label: string;
}

export interface MeaningExample {
  question: string;
  label: string;
}

/** Two areas with the most cards, each with the question its first card answers. */
export const CULTURE_EXAMPLES: CultureExample[] = SUBJECTS.slice(0, 2).map((subject) => {
  const s = suggestionFor(subject.cards[0], subject);
  return { subject, cardId: s.cardId, question: s.question, label: `${subject.short} · ${subject.cards.length} ${subject.cards.length === 1 ? 'card' : 'cards'}` };
});

/** Phrases the guide knows (answer.ts), as in the ZIP prototype's sheet. */
export const MEANING_EXAMPLES: MeaningExample[] = [
  { question: ALIGN_PHRASE, label: 'Work conversation' },
  { question: 'What does “Can or not?” really mean?', label: 'Words in everyday life' },
];

/** Pointer tilt for the image cards (CSS turns it off with reduced motion). */
function tilt(event: PointerEvent<HTMLButtonElement>) {
  const el = event.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (event.clientX - r.left) / r.width - 0.5;
  const y = (event.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
}
function untilt(event: PointerEvent<HTMLButtonElement>) {
  event.currentTarget.style.setProperty('--rx', '0deg');
  event.currentTarget.style.setProperty('--ry', '0deg');
}

export function AskHome({ onOpen }: { onOpen: (kind: EntryKind) => void }) {
  const reduce = useReducedMotionConfig();
  const rise = (delay: number) => (reduce ? { initial: false as const } : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } });
  return (
    <section className={styles.body} aria-label="What do you want to ask today?">
      <BlurText as="h2" text="What do you want to ask today?" className={styles.title} trigger="load" delay={90} stepDuration={0.36} blur={10} distance={18} />
      <div className={styles.deck}>
        <motion.div className={styles.slot} {...rise(0.25)}>
        <button
          type="button"
          className={`${styles.card} ${styles.culture}`}
          onClick={() => onOpen('culture')}
          onPointerMove={tilt}
          onPointerLeave={untilt}
          aria-label="Learn culture"
        >
          <img className={styles.photo} src={culturePhoto} alt="" />
          <span className={styles.shade} />
          <span className={`${styles.postcard} ${styles.postcardFood}`} aria-hidden="true">
            <img src={postcardFood} alt="" />
            <span>A taste of tradition</span>
          </span>
          <span className={`${styles.postcard} ${styles.postcardPlace}`} aria-hidden="true">
            <img src={postcardPlace} alt="" />
          </span>
          <span className={styles.copy}>
            <strong>Learn culture</strong>
            <span>Places, stories &amp; everyday life.</span>
          </span>
          <span className={styles.arrow} aria-hidden="true">
            <img src={arrowRight} alt="" width={18} height={18} />
          </span>
        </button>
        </motion.div>

        <motion.div className={styles.slot} {...rise(0.4)}>
        <button
          type="button"
          className={`${styles.card} ${styles.meaning}`}
          onClick={() => onOpen('meaning')}
          onPointerMove={tilt}
          onPointerLeave={untilt}
          aria-label="Understand the meaning"
        >
          <img className={styles.photo} src={meaningPhoto} alt="" />
          <span className={styles.wash} />
          <span className={`${styles.bubble} ${styles.bubblePhrase}`} aria-hidden="true">
            “Can or not?”
          </span>
          <span className={`${styles.bubble} ${styles.bubbleReading}`} aria-hidden="true">
            <img src={mascot} alt="" />
            What’s behind the words?
          </span>
          <span className={styles.copy}>
            <strong>Understand the meaning</strong>
            <span>Go beyond a literal translation.</span>
          </span>
          <span className={styles.arrow} aria-hidden="true">
            <img src={arrowRight} alt="" width={18} height={18} />
          </span>
        </button>
        </motion.div>
      </div>
    </section>
  );
}

export function EntrySheet({
  kind,
  onCulture,
  onMeaning,
  onOwn,
  onClose,
}: {
  kind: EntryKind;
  onCulture: (example: CultureExample) => void;
  onMeaning: (example: MeaningExample) => void;
  onOwn: () => void;
  onClose: () => void;
}) {
  const meaning = kind === 'meaning';
  return (
    <Dialog title={meaning ? 'Understand the meaning' : 'Learn culture'} onClose={onClose}>
      <div className={styles.sheet}>
        <img className={styles.sheetPhoto} src={meaning ? meaningPhoto : culturePhoto} alt="" />
        <p className={styles.sheetIntro}>
          {meaning ? 'Paste something someone said, or start with an example.' : 'Start with a place from your cards, or ask your own question.'}
        </p>
        <div className={styles.options}>
          {meaning
            ? MEANING_EXAMPLES.map((e) => (
                <button key={e.question} type="button" className={styles.option} onClick={() => onMeaning(e)}>
                  <span>
                    <small>{e.label}</small>
                    <strong>{e.question}</strong>
                  </span>
                  <img src={arrowRight} alt="" width={16} height={16} />
                </button>
              ))
            : CULTURE_EXAMPLES.map((e) => (
                <button key={e.question} type="button" className={styles.option} onClick={() => onCulture(e)}>
                  <span>
                    <small>{e.label}</small>
                    <strong>{e.question}</strong>
                  </span>
                  <img src={arrowRight} alt="" width={16} height={16} />
                </button>
              ))}
        </div>
        <button type="button" className={styles.own} onClick={onOwn}>
          {meaning ? 'Write my own phrase' : 'Ask my own question'}
        </button>
      </div>
    </Dialog>
  );
}
