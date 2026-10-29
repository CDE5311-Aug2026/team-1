// Ask answer views in the ZIP prototype's layout (app.js: conversation(), intentAnswer(), cultureAnswer(),
// contextAnswer(), answerActions()). The content is the app's own: phrase readings (answer.ts) and card answers
// (cards.ts), never a made-up sample.
import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import BlurText from '../../components/reactbits/BlurText';
import ClickSpark from '../../components/reactbits/ClickSpark';
import CountUp from '../../components/reactbits/CountUp';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import { ARTICLE_VIDEOS } from '../../data/videos';
import Dialog from '../../components/Dialog/Dialog';
import NearbyLinks from '../../components/NearbyLinks/NearbyLinks';
import arrowRight from '../../assets/v3/arrow-right.svg';
import mascot from '../../assets/v3/mascot.png';
import plusIcon from '../../assets/v3/plus.svg';
import writeIcon from '../../assets/v3/write-question.svg';
import { TipBlock, TopicIcon } from './CardViews';
import { topicInfo, topicsIn, type Card, type CardAnswer, type Subject, type Topic } from './cards';
import { SITUATION_PRESETS, hasSituation, situationText, type Reading, type Situation } from './answer';
import type { Tip } from '../../data/domain';
import styles from './Conversation.module.css';

/** An answer rises in after the question (motion respects the system's reduce-motion setting). */
export function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/** Answer headings blur in word by word (React Bits BlurText). */
function Heading({ text }: { text: string }) {
  return <BlurText as="h2" text={text} className={styles.heading} trigger="load" delay={70} stepDuration={0.32} blur={8} distance={14} />;
}

export function ThreadDate() {
  return <div className={styles.threadDate}>TODAY · JUST NOW</div>;
}

export function UserMessage({ text, under, extras, after }: { text: string; under?: string; extras?: ReactNode; after?: ReactNode }) {
  return (
    <>
      <div className={styles.userMessage}>
        {text}
        {extras}
        {under && <span className={styles.contextUnder}>{under}</span>}
      </div>
      {after}
    </>
  );
}

/** Who answered. Not labelled "AI": these answers come from the app's cards and phrase guide. */
export function AssistantLabel({ tag }: { tag: string }) {
  return (
    <div className={styles.assistantLabel}>
      <img className={styles.assistantAvatar} src={mascot} alt="" />
      <span>IntentAI</span>
      <span className={styles.tag}>{tag}</span>
    </div>
  );
}

export function AnswerActions({
  helpful,
  saved,
  onCopy,
  onHelpful,
  onReport,
  onSave,
}: {
  helpful: boolean;
  saved: boolean;
  onCopy: () => void;
  onHelpful: () => void;
  onReport: () => void;
  onSave: () => void;
}) {
  return (
    <div className={styles.actions}>
      <button type="button" onClick={onCopy} aria-label="Copy answer">
        Copy
      </button>
      <button type="button" onClick={onHelpful} aria-pressed={helpful} aria-label="Helpful">
        {helpful ? 'Helpful · noted' : 'Helpful'}
      </button>
      <button type="button" onClick={onReport} aria-label="Report this answer">
        Report
      </button>
      {/* Saving sparks in the accent colour (React Bits ClickSpark); un-saving doesn't. */}
      <ClickSpark className={styles.sparkWrap} disabled={saved} sparkColor={['#e3661f', '#f4b389', '#a3400a']} sparkCount={9} sparkRadius={22} sparkSize={7}>
        <button type="button" className={saved ? styles.saved : undefined} onClick={onSave} aria-pressed={saved}>
          {saved ? 'Saved to Moments' : 'Save insight'}
        </button>
      </ClickSpark>
    </div>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <div className={styles.chips}>{children}</div>;
}

export function Chip({ accent, onClick, children }: { accent?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={accent ? `${styles.chip} ${styles.accent}` : styles.chip} onClick={onClick}>
      {children}
      {accent && <img className={styles.inlineArrow} src={arrowRight} alt="" width={12} height={12} />}
    </button>
  );
}

/* ---------- Understand the meaning ---------- */

export function MeaningPaper({ reading, situation }: { reading?: Reading; situation: Situation }) {
  if (!reading) {
    return (
      <article className={styles.paper} aria-label="Phrase reading">
        <Heading text="Not sure yet." />
        <p className={styles.copy}>
          So far this prototype can explain chope, can or not, paiseh, sabo and 对齐 · 颗粒度. For anything else, a local who
          knows the situation will read it better.
        </p>
        <p className={styles.footnote}>No reading is better than a wrong one.</p>
      </article>
    );
  }
  return (
    <article className={styles.paper} aria-label="Phrase reading">
      <Heading text="Behind the words." />
      <section className={styles.section}>
        <h3>Literal meaning</h3>
        <p>{reading.literal}</p>
      </section>
      <section className={`${styles.section} ${styles.mainReading}`}>
        <h3>What they might mean</h3>
        <p>{reading.meaning}</p>
      </section>
      <section className={styles.section}>
        <h3>Still unclear</h3>
        <p>{reading.unclear}</p>
      </section>
      <span className={styles.uncertainty}>{hasSituation(situation) ? 'Context added · possible reading' : 'Needs more context'}</span>
      <p className={styles.footnote}>A possible reading, not a certainty.</p>
    </article>
  );
}

export function ContextDisplay({ situation, onEdit }: { situation: Situation; onEdit: () => void }) {
  const text = situationText(situation);
  if (!text) return null;
  return (
    <div className={styles.contextDisplay}>
      <span>{text}</span>
      <button type="button" onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}

export function ReplyCard({ text, softer, onCopy, onSofter }: { text: string; softer: boolean; onCopy: () => void; onSofter: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // It opens below the chips, often under the composer: bring it into view.
  useEffect(() => {
    // After any scroll already running (the new question moving to the top), so it isn't cancelled.
    const timer = setTimeout(() => ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 120);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={styles.replyCard} ref={ref}>
      <div className={styles.replyLabel}>A reply you could send</div>
      <p>{text}</p>
      <button type="button" onClick={onCopy}>
        Copy reply
      </button>
      <button type="button" onClick={onSofter} aria-pressed={softer}>
        {softer ? 'Make it simpler' : 'Make it softer'}
      </button>
    </div>
  );
}

/* ---------- Learn culture (answers from cards) ---------- */

function mediaLine(card: Card) {
  const video = ARTICLE_VIDEOS[card.article.id];
  return video ? `Article + ${video.length ? `${video.length} ` : ''}video` : 'Article';
}

export function CardPaper({
  answer,
  subject,
  attached,
  tip,
  onOpen,
}: {
  answer: Extract<CardAnswer, { kind: 'card' }>;
  subject: Subject;
  attached: boolean;
  tip?: Tip;
  onOpen: (card: Card) => void;
}) {
  const { card } = answer;
  const image = ARTICLE_IMAGES[card.article.id];
  return (
    <article className={styles.paper} aria-label="Answer from your cards">
      {image && <img className={styles.culturePhoto} src={image.src} alt={image.alt} />}
      <span className={styles.sourcePill}>
        {attached
          ? 'Using your attached card'
          : `From your ${card.topic ? topicInfo(card.topic).label.toLowerCase() : ''} card · ${subject.short}`.replace('  ', ' ')}
      </span>
      <Heading text={card.article.title} />
      {answer.lines.map((line) => (
        <p key={line} className={styles.copy}>
          {line}
        </p>
      ))}
      {answer.numbers.length > 0 && (
        <ul className={styles.numbers} aria-label="Key numbers">
          {answer.numbers.map((n) => (
            <li key={n.caption}>
              <strong>
                {/^\d{1,6}$/.test(n.value) ? <CountUp to={Number(n.value)} trigger="load" duration={1.1} /> : n.value}
              </strong>
              <span>{n.caption}</span>
            </li>
          ))}
        </ul>
      )}
      {tip && <TipBlock tip={tip} />}
      <button type="button" className={styles.sourcePreview} onClick={() => onOpen(card)} aria-label={`Open the ${card.article.title} card`}>
        {image ? <img className={styles.sourcePhoto} src={image.src} alt="" /> : <span className={styles.sourcePhoto} />}
        <span>
          <strong>{card.article.title}</strong>
          <span>
            {mediaLine(card)} · View source
          </span>
        </span>
        <img className={styles.sourceArrow} src={arrowRight} alt="" width={16} height={16} />
      </button>
      {answer.places.length > 0 && <NearbyLinks links={answer.places} />}
      {image && (
        <a className={styles.credit} href={image.url} target="_blank" rel="noopener noreferrer">
          {image.credit}
        </a>
      )}
    </article>
  );
}

export function NoCardPaper({ subject, topic, attached }: { subject: Subject; topic?: Topic; attached?: Card }) {
  const available = topicsIn(subject);
  return (
    <article className={styles.paper} aria-label="Answer from your cards">
      {attached && <span className={styles.sourcePill}>Using your attached card</span>}
      <Heading text={attached ? 'The card doesn’t say.' : 'Your cards don’t cover this yet.'} />
      <p className={styles.copy}>
        {attached
          ? `The ${attached.article.title} card has nothing on this. Someone who knows the area can help.`
          : topic && !available.includes(topic)
            ? `There is no ${topicInfo(topic).label.toLowerCase()} card for ${subject.short} yet.`
            : 'I answer from the food, monument and festival cards of the places you’ve explored, and this falls outside them.'}
      </p>
      <p className={styles.copy}>Pick a topic below, or ask someone who knows the area.</p>
    </article>
  );
}

export function TopicChips({ subject, onTopic }: { subject: Subject; onTopic: (t: Topic) => void }) {
  return (
    <>
      {topicsIn(subject).map((t) => (
        <Chip key={t} onClick={() => onTopic(t)}>
          <TopicIcon topic={t} size={12} /> {topicInfo(t).label} in {subject.short}
        </Chip>
      ))}
    </>
  );
}

/* ---------- Sheets ---------- */

export function SituationSheet({ initial, onSave, onClose }: { initial: Situation; onSave: (s: Situation) => void; onClose: () => void }) {
  return (
    <Dialog title="A little context helps." onClose={onClose}>
      <form
        className={styles.sheet}
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          onSave({ where: String(f.get('where') ?? '').trim(), who: String(f.get('who') ?? '').trim(), topic: String(f.get('topic') ?? '').trim() });
        }}
      >
        <p className={styles.sheetIntro}>Add what you know. You can continue without filling everything in.</p>
        <div className={styles.presets}>
          {SITUATION_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={styles.preset}
              onClick={(event) => {
                const form = event.currentTarget.form!;
                (form.elements.namedItem('where') as HTMLInputElement).value = p.situation.where;
                (form.elements.namedItem('who') as HTMLInputElement).value = p.situation.who;
                (form.elements.namedItem('topic') as HTMLInputElement).value = p.situation.topic;
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {(
          [
            ['where', 'Where', 'e.g. During a project meeting'],
            ['who', 'Who', 'e.g. A teammate'],
            ['topic', 'Topic', 'e.g. A project proposal'],
          ] as const
        ).map(([id, label, placeholder]) => (
          <div key={id} className={styles.field}>
            <label htmlFor={`situation-${id}`}>{label}</label>
            <input id={`situation-${id}`} name={id} maxLength={160} placeholder={placeholder} defaultValue={initial[id]} />
          </div>
        ))}
        <button type="submit" className={styles.fullOrange}>
          Save context
        </button>
      </form>
    </Dialog>
  );
}

/** In the + sheet: cards to attach (the answer then uses only that card) and Describe the situation. */
export function AttachCardOptions({ cards, onAttach, onDescribe }: { cards: { card: Card; area: string }[]; onAttach: (cardId: string) => void; onDescribe: () => void }) {
  return (
    <>
      {cards.map(({ card, area }) => {
        const image = ARTICLE_IMAGES[card.article.id];
        return (
          <button key={card.article.id} type="button" className={styles.attachOption} onClick={() => onAttach(card.article.id)}>
            {image ? <img className={styles.attachThumb} src={image.src} alt="" /> : <span className={styles.attachThumb} />}
            <span>
              <strong>{card.article.title}</strong>
              <span>A card from {area}</span>
            </span>
            <span className={styles.attachAdd} aria-hidden="true">
              <img src={plusIcon} alt="" width={18} height={18} />
            </span>
          </button>
        );
      })}
      <button type="button" className={styles.attachOption} onClick={onDescribe}>
        <span className={styles.entryMark} aria-hidden="true">
          <img src={writeIcon} alt="" width={20} height={20} />
        </span>
        <span>
          <strong>Describe the situation</strong>
          <span>Who said it, where, and what was happening</span>
        </span>
        <span className={styles.attachAdd} aria-hidden="true">
          <img src={plusIcon} alt="" width={18} height={18} />
        </span>
      </button>
      <p className={styles.smallNote}>Added context appears beside the input. Remove it whenever you want.</p>
    </>
  );
}

export function AttachedChip({ card, onRemove }: { card: Card; onRemove: () => void }) {
  const image = ARTICLE_IMAGES[card.article.id];
  return (
    <div className={styles.attached}>
      {image && <img src={image.src} alt="" />}
      <span>{card.article.title} · 1 card</span>
      <button type="button" onClick={onRemove} aria-label="Remove attached card">
        Remove
      </button>
    </div>
  );
}
