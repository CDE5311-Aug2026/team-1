// The parts of Ask that answer from culture cards: the topic tiles and suggested questions on an empty chat, a card
// answer (big numbers, the source card, Nearby places, Ask a local, Recommended for you), the off-topic answer, and
// the source card itself.
import { Link } from 'react-router-dom';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import type { Tip } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { tipsStore } from '../../data/stores';
import { paths } from '../../routes';
import { ARTICLE_VIDEOS } from '../../data/videos';
import Dialog from '../../components/Dialog/Dialog';
import NearbyLinks from '../../components/NearbyLinks/NearbyLinks';
import SourceLine from '../../components/SourceLine/SourceLine';
import { TOPICS, suggestionFor, topicInfo, topicsIn, type Card, type CardAnswer, type Recommendation, type Subject, type Topic } from './cards';
import styles from './CardViews.module.css';

const TOPIC_ICON: Record<Topic, string> = {
  // bowl, temple roof, sparkle
  food: 'M4 11h16a8 8 0 0 1-16 0ZM9 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3',
  monument: 'M3 10 12 4l9 6M5 10v9M19 10v9M9.5 10v9M14.5 10v9M3 20h18',
  festival: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
};

export function TopicIcon({ topic, size = 14 }: { topic: Topic; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TOPIC_ICON[topic]} />
    </svg>
  );
}

function Thumb({ card, size }: { card: Card; size: 'sm' | 'md' }) {
  const image = ARTICLE_IMAGES[card.article.id];
  return image ? (
    <img className={size === 'sm' ? styles.thumbSm : styles.thumbMd} src={image.src} alt="" width={720} height={405} loading="lazy" />
  ) : (
    <span className={`${size === 'sm' ? styles.thumbSm : styles.thumbMd} ${styles.thumbBlank}`} aria-hidden="true">
      {card.topic && <TopicIcon topic={card.topic} size={18} />}
    </span>
  );
}

/** "Article + 1:40 video", or "Article + video" when the length was not checked. */
function cardMedia(card: Card) {
  const video = ARTICLE_VIDEOS[card.article.id];
  return video ? `Article + ${video.length ? `${video.length} ` : ''}video` : 'Article';
}

// ---- Empty chat: pick a topic, suggested questions -------------------------------------------------------------

export function StartPanel({
  subject,
  topic,
  onTopic,
  onAsk,
}: {
  subject: Subject;
  topic?: Topic;
  onTopic: (topic: Topic) => void;
  onAsk: (question: string, cardId: string) => void;
}) {
  const available = topicsIn(subject);
  const suggestions = subject.cards.filter((c) => !topic || c.topic === topic).map((c) => ({ card: c, ...suggestionFor(c, subject) }));
  return (
    <div className={styles.start}>
      {available.length > 0 && (
        <section aria-labelledby="ask-pick-topic">
          <h2 id="ask-pick-topic" className={styles.eyebrow}>
            Pick a topic
          </h2>
          <div className={styles.tiles}>
            {available.map((t) => {
              const card = subject.cards.find((c) => c.topic === t)!;
              return (
                <button key={t} type="button" className={styles.tile} aria-pressed={topic === t} onClick={() => onTopic(t)}>
                  <Thumb card={card} size="md" />
                  <span className={styles.tileTopic}>
                    <TopicIcon topic={t} /> {topicInfo(t).label}
                  </span>
                  <span className={styles.tileCard}>{card.article.title}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      <section aria-labelledby="ask-suggested">
        <h2 id="ask-suggested" className={styles.eyebrow}>
          Suggested questions
        </h2>
        <ul className={styles.suggestions}>
          {suggestions.map((s) => (
            <li key={s.cardId}>
              <button type="button" className={styles.suggestion} onClick={() => onAsk(s.question, s.cardId)}>
                <span className={styles.suggestionIcon}>{s.topic ? <TopicIcon topic={s.topic} size={16} /> : '•'}</span>
                <span className={styles.suggestionText}>
                  <span className={styles.suggestionQ}>{s.question}</span>
                  <span className={styles.suggestionMeta}>
                    {s.topic ? topicInfo(s.topic).card : 'Card'} · {s.card.article.title}
                  </span>
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---- A card answer ---------------------------------------------------------------------------------------------

/** A local's answer on a card, from Community. Labelled "Local tip" (nobody verifies it) and "Sample" when seeded. */
export function TipBlock({ tip }: { tip: Tip }) {
  const initial = tip.by.trim().charAt(0).toUpperCase() || 'L';
  return (
    <figure className={styles.tip}>
      <figcaption className={styles.tipHead}>
        <span className={styles.tipAvatar} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.tipBy}>
          {tip.by}
          {tip.areaName ? ` · ${tip.areaName} local` : ''}
        </span>
        <span className={styles.tipTag}>{tip.sample ? 'Sample' : 'Local tip'}</span>
      </figcaption>
      <blockquote className={styles.tipText}>“{tip.text}”</blockquote>
      <Link className={styles.tipLink} to={paths.question(tip.questionId)}>
        Open in Community →
      </Link>
    </figure>
  );
}

export function CardAnswerBody({
  answer,
  subject,
  tip,
  onOpen,
}: {
  answer: Extract<CardAnswer, { kind: 'card' }>;
  subject: Subject;
  tip?: Tip;
  onOpen: (card: Card) => void;
}) {
  const { card } = answer;
  return (
    <div className={styles.answer}>
      {answer.lines.map((line) => (
        <p key={line} className={styles.line}>
          {line}
        </p>
      ))}
      {answer.numbers.length > 0 && (
        <ul className={styles.numbers} aria-label="Key numbers">
          {answer.numbers.map((n) => (
            <li key={n.caption} className={styles.number}>
              <strong className={styles.numberValue}>{n.value}</strong>
              <span className={styles.numberCaption}>{n.caption}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.source}>
        <Thumb card={card} size="sm" />
        <div className={styles.sourceText}>
          <p className={styles.sourceEyebrow}>
            Source · {subject.short}
            {card.topic ? ` · ${topicInfo(card.topic).card}` : ''}
          </p>
          <p className={styles.sourceTitle}>{card.article.title}</p>
          <p className={styles.sourceMedia}>
            {cardMedia(card)}
            <TipCount cardId={card.article.id} />
          </p>
        </div>
        <button type="button" className={styles.open} onClick={() => onOpen(card)} aria-label={`Open the ${card.article.title} card`}>
          Open
        </button>
      </div>
      {tip && <TipBlock tip={tip} />}
      {answer.places.length > 0 && <NearbyLinks links={answer.places} />}
    </div>
  );
}

export function AskLocalRow({ onAskLocal }: { onAskLocal: () => void }) {
  return (
    <button type="button" className={styles.askLocal} onClick={onAskLocal}>
      <span>
        Need a first-hand tip? <strong>Ask a local</strong>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

export function Recommendations({
  items,
  basedOnOpened,
  onAsk,
}: {
  items: Recommendation[];
  basedOnOpened: boolean;
  onAsk: (question: string, cardId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles.recs} aria-label="Recommended for you">
      <div className={styles.recsHead}>
        <p className={styles.eyebrow}>Recommended for you</p>
        <p className={styles.recsBasis}>{basedOnOpened ? 'Based on cards you’ve opened' : 'Based on your Today topics'}</p>
      </div>
      <ul className={styles.suggestions}>
        {items.map((r) => (
          <li key={r.cardId}>
            <RecButton rec={r} onAsk={onAsk} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecButton({ rec, onAsk }: { rec: Recommendation; onAsk: (question: string, cardId: string) => void }) {
  return (
    <button type="button" className={styles.suggestion} onClick={() => onAsk(rec.question, rec.cardId)}>
      <span className={styles.suggestionText}>
        <span className={styles.suggestionQ}>{rec.question}</span>
        <span className={styles.reason}>✦ {rec.reason}</span>
      </span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </button>
  );
}

// ---- Off-topic ------------------------------------------------------------------------------------------------

export function NoCardBody({
  subject,
  topic,
  onTopic,
  onAskLocal,
}: {
  subject: Subject;
  topic?: Topic;
  onTopic: (topic: Topic) => void;
  onAskLocal: () => void;
}) {
  const available = topicsIn(subject);
  return (
    <div className={styles.answer}>
      <p className={styles.line}>I can help with the food, monuments and festivals of the places you’ve explored.</p>
      <p className={styles.line}>
        {topic && !available.includes(topic)
          ? `There is no ${topicInfo(topic).label.toLowerCase()} card for ${subject.short} yet. Pick a topic it has, or ask someone who knows the area.`
          : 'This question falls outside those cards. Pick the closest topic, or ask someone who knows the area.'}
      </p>
      {available.length > 0 && (
        <div className={styles.miniTiles}>
          {available.map((t) => {
            const card = subject.cards.find((c) => c.topic === t)!;
            return (
              <button key={t} type="button" className={styles.miniTile} onClick={() => onTopic(t)}>
                <span className={styles.tileTopic}>
                  <TopicIcon topic={t} /> {topicInfo(t).label}
                </span>
                <span className={styles.tileCard}>{card.article.title}</span>
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className={styles.askLocalPrimary} onClick={onAskLocal}>
        Ask a local in Community
      </button>
    </div>
  );
}

function TipCount({ cardId }: { cardId: string }) {
  const [tips] = usePersistentStore(tipsStore);
  const n = tips.filter((t) => t.cardId === cardId).length;
  return n > 0 ? <span className={styles.tipCount}> · +{n} local tip{n > 1 ? 's' : ''}</span> : null;
}

// ---- The source card ------------------------------------------------------------------------------------------

export function SourceCardDialog({ card, onClose }: { card: Card; onClose: () => void }) {
  const { article } = card;
  const image = ARTICLE_IMAGES[article.id];
  const video = ARTICLE_VIDEOS[article.id];
  return (
    <Dialog title={article.title} onClose={onClose}>
      <div className={styles.cardDialog}>
        {image && <img className={styles.cardPhoto} src={image.src} alt={image.alt} width={720} height={405} />}
        <p className={styles.cardKicker}>{article.kicker}</p>
        <p>{article.summary}</p>
        <ul className={styles.cardFacts}>
          {article.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p>{article.deeper}</p>
        {video && (
          <p className={styles.cardMeta}>
            Video · {video.channel} · {video.length ? `${video.length} · ` : ''}
            <a href={video.sources[0].url} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </a>
          </p>
        )}
        <SourceLine sources={article.sources} className={styles.cardMeta} />
        <CardTips cardId={article.id} />
        <NearbyLinks links={card.links} />
        <div className="dialog-row">
          <button type="button" className="dialog-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function TopicSwitch({
  subject,
  active,
  onPick,
}: {
  subject: Subject;
  active?: Topic;
  onPick: (topic: Topic) => void;
}) {
  const available = topicsIn(subject);
  return (
    <div className={styles.switch} role="group" aria-label="Topic">
      {TOPICS.map((t) => {
        const has = available.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            className={styles.switchButton}
            aria-pressed={active === t.id}
            disabled={!has}
            title={has ? undefined : `No ${t.label.toLowerCase()} card for ${subject.short} yet`}
            onClick={() => onPick(t.id)}
          >
            <TopicIcon topic={t.id} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

function CardTips({ cardId }: { cardId: string }) {
  const [tips] = usePersistentStore(tipsStore);
  const mine = tips.filter((t) => t.cardId === cardId);
  if (mine.length === 0) return null;
  return (
    <section aria-label="Local tips" className={styles.cardTips}>
      {mine.map((t) => (
        <TipBlock key={t.id} tip={t} />
      ))}
    </section>
  );
}
