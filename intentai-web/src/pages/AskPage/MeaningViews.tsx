// "Understand the meaning", step by step (owner feedback, 29 Oct):
//   1. Situation card — where / who / how it was said as one-tap chips, plus a free detail; what the sentence already
//      says is pre-selected. "Read it" or "Skip".
//   2. Thinking — the steps the guide actually takes, ticking off one by one inside a moving gradient border.
//   3. Reading — literal / most likely / other ways it can be meant / still unclear, a confidence level with its
//      reasons, and the source (Wikipedia for Singlish; "team-written guidance" otherwise). A light sweeps the card.
//   4. Confirm — one tap sends it to locals with the reading attached; their answer comes back here.
// Nothing here is a model: the steps describe real lookups in guide.ts and the user's own situation.
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotionConfig } from 'motion/react';
import BlurText from '../../components/reactbits/BlurText';
import BorderGlow from '../../components/reactbits/BorderGlow';
import ShinyText from '../../components/reactbits/ShinyText';
import mascot from '../../assets/v3/mascot.png';
import { paths } from '../../routes';
import type { Question } from '../../data/domain';
import { GUIDE, TONES, WHERE_OPTIONS, WHO_OPTIONS, type Situation, type Tone } from './guide';
import { situationText, type Reading } from './answer';
import styles from './MeaningViews.module.css';

/* ---------- 1. Situation card ---------- */

/** "Your colleague" → "Colleague", "The stall owner" → "Stall owner". */
function chipLabel(option: string): string {
  const bare = option.replace(/^(Your|The) /, '');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  auto,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value: string | undefined;
  /** The value the sentence itself suggested. */
  auto?: string;
  onPick: (v: T | undefined) => void;
}) {
  const id = useId();
  return (
    <div className={styles.row} role="group" aria-labelledby={id}>
      <span id={id} className={styles.rowLabel}>
        {label}
      </span>
      <div className={styles.chips}>
        {options.map((o) => {
          const on = value === o;
          return (
            <button key={o} type="button" className={on ? `${styles.chip} ${styles.chipOn}` : styles.chip} aria-pressed={on} onClick={() => onPick(on ? undefined : o)}>
              {chipLabel(o)}
              {on && auto === o && <span className={styles.autoTag}>from your words</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SituationCard({
  initial,
  auto,
  onRead,
  onSkip,
}: {
  initial: Situation;
  /** What detectSituation found in the sentence. */
  auto: Partial<Situation>;
  onRead: (s: Situation) => void;
  onSkip: () => void;
}) {
  const [s, setS] = useState<Situation>(initial);
  const set = (patch: Partial<Situation>) => setS((prev) => ({ ...prev, ...patch }));
  return (
    <section className={styles.situation} aria-label="Add the situation">
      <div className={styles.situationHead}>
        <img src={mascot} alt="" className={styles.mascot} />
        <p>
          <strong>A little context makes the reading better.</strong>
          <span>Tap what you know. Anything you skip lowers how sure I can be.</span>
        </p>
      </div>
      <ChipRow label="Where" options={WHERE_OPTIONS} value={s.where || undefined} auto={auto.where} onPick={(v) => set({ where: v ?? '' })} />
      <ChipRow label="Who said it" options={WHO_OPTIONS} value={s.who || undefined} auto={auto.who} onPick={(v) => set({ who: v ?? '' })} />
      <ChipRow<Tone> label="How it was said" options={TONES} value={s.tone} auto={auto.tone} onPick={(v) => set({ tone: v })} />
      <label className={styles.detail}>
        <span>Anything else? (optional)</span>
        <input
          value={s.detail ?? ''}
          maxLength={140}
          placeholder="e.g. after I sent the slides, with a laugh"
          onChange={(event) => set({ detail: event.target.value })}
        />
      </label>
      <div className={styles.situationActions}>
        <button type="button" className={styles.ghost} onClick={onSkip}>
          Skip
        </button>
        <button type="button" className={styles.primary} onClick={() => onRead(s)}>
          Read it
        </button>
      </div>
    </section>
  );
}

/* ---------- 2. Thinking ---------- */

export interface Step {
  label: string;
  /** What this step found. */
  detail: string;
}

/** The steps for a phrase question: what the guide actually does. */
export function stepsFor(question: string, reading: Reading | undefined, s: Situation): Step[] {
  const quoted = question.match(/[“"「『](.+?)[”"」』]/)?.[1];
  return [
    { label: 'Reading the words', detail: reading ? `Found “${reading.term}”` : quoted ? `Looked for “${quoted}”` : 'Looked for a known phrase' },
    {
      label: 'Checking the phrase guide',
      detail: reading ? (reading.source ? reading.source.label : 'Team-written guidance') : 'Not in the guide yet',
    },
    { label: 'Applying your situation', detail: situationText(s) || 'No situation added' },
    { label: 'Weighing how sure I can be', detail: reading ? `${reading.confidence.level} confidence` : 'Can’t be sure without the guide' },
  ];
}

const STEP_MS = 520;

/** The steps tick off one by one, then `onDone`. With reduced motion they are all done at once. */
export function Thinking({ steps, onDone }: { steps: Step[]; onDone: () => void }) {
  const reduce = useReducedMotionConfig();
  const [at, setAt] = useState(reduce ? steps.length : 0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (at >= steps.length) {
      const t = setTimeout(() => done.current(), reduce ? 0 : 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAt((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [at, steps.length, reduce]);
  return (
    <div className={styles.thinkingFrame} role="status" aria-live="polite" aria-label="Reading the phrase">
      <div className={styles.thinking}>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.label} className={i < at ? styles.stepDone : i === at ? styles.stepNow : styles.stepTodo}>
              <span className={styles.stepMark} aria-hidden="true">
                {i < at ? <Tick /> : <span className={styles.dot} />}
              </span>
              <span className={styles.stepText}>
                {i === at ? (
                  <ShinyText text={step.label} color="#5e5c54" shineColor="#e4671f" speed={1.6} className={styles.stepLabel} />
                ) : (
                  <span className={styles.stepLabel}>{step.label}</span>
                )}
                {i < at && <small>{step.detail}</small>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  );
}

/** After the answer: the same steps, folded, so the process stays visible. */
export function HowIRead({ steps }: { steps: Step[] }) {
  return (
    <details className={styles.how}>
      <summary>How I read it</summary>
      <ol>
        {steps.map((s) => (
          <li key={s.label}>
            <Tick /> <span>{s.label}</span> <small>{s.detail}</small>
          </li>
        ))}
      </ol>
    </details>
  );
}

/* ---------- 3. Reading ---------- */

const LEVEL_CLASS = { Low: 'levelLow', Medium: 'levelMedium', Good: 'levelGood' } as const;

export function ReadingCard({ reading, situation, fresh }: { reading?: Reading; situation: Situation; fresh: boolean }) {
  const reduce = useReducedMotionConfig();
  if (!reading) {
    return (
      <div className={styles.card}>
        <div className={styles.meta}>
          <span className={`${styles.level} ${styles.levelLow}`}>Not in the guide</span>
        </div>
        <BlurText as="h2" text="I can’t read this one yet." className={styles.heading} trigger="load" delay={60} />
        <p className={styles.copy}>
          The phrase guide has {GUIDE.length} phrases so far, written down with their sources, and this isn’t one of them. Rather than guess, ask a
          local: they get your sentence and the situation, and their answer comes back here.
        </p>
        {situationText(situation) && <p className={styles.situationLine}>Situation: {situationText(situation)}</p>}
      </div>
    );
  }
  const { confidence, source } = reading;
  return (
    <BorderGlow
      className={styles.glow}
      backgroundColor="#ffffff"
      borderRadius={24}
      glowRadius={28}
      glowIntensity={0.9}
      glowColor="22 90 60"
      colors={['#f4b389', '#e4671f', '#f6c3d9']}
      animated={fresh && !reduce}
    >
      <article className={styles.card} aria-label="Phrase reading">
        <div className={styles.meta}>
          <span className={styles.term}>{reading.term}</span>
          <span className={styles.lang}>{reading.entry.lang}</span>
          <span className={`${styles.level} ${styles[LEVEL_CLASS[confidence.level]]}`}>{confidence.level} confidence</span>
        </div>
        <BlurText as="h2" text="Behind the words." className={styles.heading} trigger="load" delay={60} />
        <section className={styles.section}>
          <h3>Literal meaning</h3>
          <p>{reading.literal}</p>
        </section>
        <section className={`${styles.section} ${styles.main}`}>
          <h3>What they most likely mean</h3>
          <p>{reading.meaning}</p>
        </section>
        {reading.readings.length > 1 && (
          <section className={styles.section}>
            <h3>All the ways it can be meant</h3>
            <ul className={styles.readings}>
              {reading.readings.map((r, i) => (
                <motion.li
                  key={r.text}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                >
                  <span className={r.likelihood === 'Most likely' ? styles.likely : styles.possible}>{r.likelihood}</span>
                  <span>{r.text}</span>
                </motion.li>
              ))}
            </ul>
          </section>
        )}
        <section className={styles.section}>
          <h3>Still unclear</h3>
          <p>{reading.unclear}</p>
        </section>
        <details className={styles.why}>
          <summary>Why {confidence.level.toLowerCase()} confidence</summary>
          <ul>
            {confidence.reasons.map((r) => (
              <li key={r.text} className={r.ok ? styles.reasonOk : styles.reasonMissing}>
                {r.text}
              </li>
            ))}
          </ul>
          <p>The words alone never decide. A local who knows the situation can.</p>
        </details>
        <section className={styles.source} aria-label="Source">
          <h3>Source</h3>
          {source ? (
            <>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
              </a>
              <blockquote>“{source.quote}”</blockquote>
              <small>Readings by situation, “still unclear” and replies: team-written guidance.</small>
            </>
          ) : (
            <small>Team-written guidance. No outside source for this phrase yet.</small>
          )}
        </section>
      </article>
    </BorderGlow>
  );
}

/* ---------- 4. Confirm with a local ---------- */

/** One tap: send the sentence, the situation and this reading to locals. Their answer shows here. */
export function ConfirmPanel({ question, onSend }: { question?: Question; onSend: () => void }) {
  if (!question) {
    return (
      <button type="button" className={styles.confirm} onClick={onSend}>
        <span className={styles.confirmIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />
          </svg>
        </span>
        <span>
          <strong>Ask a local to confirm</strong>
          <small>One tap. They see your sentence, the situation and this reading — never your name.</small>
        </span>
      </button>
    );
  }
  const answered = question.status === 'Answered' || question.status === 'Added';
  const steps = ['Sent', 'Seen', 'Answered'];
  const at = answered ? 3 : question.status === 'Seen' ? 2 : 1;
  return (
    <div className={answered ? `${styles.confirmStatus} ${styles.confirmAnswered}` : styles.confirmStatus}>
      <ol className={styles.confirmSteps} aria-label="Local check">
        {steps.map((s, i) => (
          <li key={s} className={i < at ? styles.confirmStepDone : undefined}>
            {s}
          </li>
        ))}
      </ol>
      {answered ? (
        <>
          <p className={styles.confirmTitle}>
            {question.status === 'Added' ? 'Confirmed by a local' : 'A local replied'}
            {question.answeredBy && question.answeredBy !== 'A local' ? ` · ${question.answeredBy}` : ''}
          </p>
          <blockquote className={styles.localReply}>“{question.answer}”</blockquote>
        </>
      ) : (
        <p className={styles.confirmTitle}>Waiting for a local. Their answer will appear here.</p>
      )}
      <Link className={styles.confirmLink} to={paths.question(question.id)}>
        View in Community →
      </Link>
    </div>
  );
}
