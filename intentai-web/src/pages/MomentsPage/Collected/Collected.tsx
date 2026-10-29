import { motion, useReducedMotionConfig } from 'motion/react';
import { Link } from 'react-router-dom';
import checkWhite from '../../../assets/v3/moments/check-white.svg';
import iconAsk from '../../../assets/v3/moments/topic-ask.svg';
import iconAll from '../../../assets/v3/moments/filter-all.svg';
import iconPhrase from '../../../assets/v3/moments/phrase.svg';
import iconCommunity from '../../../assets/v3/moments/community.svg';
import mascot from '../../../assets/v3/mascot.png';
import type { Lookup } from '../../../data/domain';
import { imageOf, matchesFilter, TOPIC_LABELS, type CollectedFilter, type CollectedItem } from '../../../data/moments/moments';
import { paths } from '../../../routes';
import { FILTERS, TOPIC_ICONS } from '../parts';
import styles from './Collected.module.css';

interface CollectedProps {
  items: readonly CollectedItem[];
  filter: CollectedFilter;
  onFilter: (filter: CollectedFilter) => void;
  onOpen: (item: CollectedItem) => void;
  onNotSure: (lookup: Lookup) => void;
}

const PHOTO_HEIGHTS = [214, 178, 196, 166];

function estimate(item: CollectedItem, i: number): number {
  if (item.kind === 'card') return imageOf(item.card.article.id) ? PHOTO_HEIGHTS[i % PHOTO_HEIGHTS.length] : 150;
  if (item.kind === 'tip') return 150 + item.tip.text.length * 0.5;
  if (item.kind === 'insight') return 120 + Math.min(item.insight.summary.length, 120) * 0.4;
  if (item.kind === 'conversation') return 130 + Math.min(item.saved.body.length, 120) * 0.4;
  return 116 + Math.min(item.meaning.length, 90) * 0.4;
}

/** Two columns, each item in the shorter column (masonry). */
function columns(items: readonly CollectedItem[]) {
  const cols: { item: CollectedItem; index: number }[][] = [[], []];
  const heights = [0, 0];
  items.forEach((item, index) => {
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push({ item, index });
    heights[c] += estimate(item, index) + 8;
  });
  return cols;
}

/** M1 "Collected": masonry of opened cards, local tips, saved Ask insights and phrases, with topic filters. */
export default function Collected({ items, filter, onFilter, onOpen, onNotSure }: CollectedProps) {
  const reduce = useReducedMotionConfig();
  const count = (f: CollectedFilter) => items.filter((i) => matchesFilter(i, f)).length;
  const visible = items.filter((i) => matchesFilter(i, filter));
  const filters = FILTERS.filter((f) => !(f.id === 'ask' || f.id === 'community' || f.id === 'phrases') || count(f.id) > 0 || filter === f.id);
  const credits = visible.flatMap((i) => (i.kind === 'card' ? [imageOf(i.card.article.id)].filter((x) => !!x) : []));

  return (
    <section className={styles.section} aria-labelledby="collected-heading">
      <div className={styles.heading}>
        <h2 id="collected-heading">COLLECTED</h2>
        <span>
          {visible.length} of {items.length}
        </span>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter collected items">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              className={active ? `${styles.filter} ${styles.active}` : styles.filter}
              aria-pressed={active}
              aria-label={`${f.label}, ${count(f.id)}`}
              onClick={() => onFilter(f.id)}
            >
              <img src={f.icon} alt="" width={15} height={15} className={f.id === 'all' ? styles.allIcon : undefined} />
              <span className={styles.filterLabel}>{f.label}</span>
              <span className={styles.filterCount}>{count(f.id)}</span>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <img src={iconAll} alt="" width={24} height={24} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nothing collected yet</p>
          <p>Open a card on Home or in Ask and it lands here. Save an answer in Ask to keep it too.</p>
          <div className={styles.emptyActions}>
            <Link to={paths.today}>Open a card</Link>
            <Link to={paths.ask}>Ask about a place</Link>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          <img src={FILTERS.find((f) => f.id === filter)?.icon ?? iconAll} alt="" width={22} height={22} className={styles.emptyIcon} />
          <p>{emptyLine(filter)}</p>
        </div>
      ) : (
        // keyed by filter: a new filter lays the tiles out afresh and they rise in again
        <div className={styles.masonry} key={filter}>
          {columns(visible).map((col, c) => (
            <ul key={c} className={styles.column}>
                {col.map(({ item, index }) => (
                  <motion.li
                    key={item.key}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: reduce ? 0 : Math.min(index, 8) * 0.04 }}
                  >
                    <Tile item={item} index={index} onOpen={() => onOpen(item)} onNotSure={onNotSure} />
                  </motion.li>
                ))}
            </ul>
          ))}
        </div>
      )}

      {credits.length > 0 && (
        <details className={styles.credits}>
          <summary>Photo credits</summary>
          <ul>
            {credits.map((img) => (
              <li key={img!.url}>
                <a href={img!.url} target="_blank" rel="noreferrer">
                  {img!.credit}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function emptyLine(filter: CollectedFilter): string {
  if (filter === 'ask') return 'Save an answer in Ask to keep it here.';
  if (filter === 'phrases') return 'Ask what a phrase means to keep it here.';
  if (filter === 'community') return 'Save a conversation in Community to keep it here.';
  return `No ${filter === 'all' ? '' : TOPIC_LABELS[filter as keyof typeof TOPIC_LABELS].toLowerCase() + ' '}cards opened yet. Open one on Home or in Ask.`;
}

function Tile({ item, index, onOpen, onNotSure }: { item: CollectedItem; index: number; onOpen: () => void; onNotSure: (lookup: Lookup) => void }) {
  if (item.kind === 'card') {
    const { card, topic, area } = item;
    const image = imageOf(card.article.id);
    const caption = [area, topic ? TOPIC_LABELS[topic].toLowerCase() : undefined].filter(Boolean).join(' · ');
    return (
      <button
        type="button"
        className={image ? `${styles.tile} ${styles.photo}` : `${styles.tile} ${styles.paperCard}`}
        style={image ? { height: PHOTO_HEIGHTS[index % PHOTO_HEIGHTS.length] } : undefined}
        onClick={onOpen}
        aria-label={`Open ${card.article.title}${caption ? `, ${caption}` : ''}`}
      >
        {image && <img className={styles.photoImg} src={image.src} alt="" />}
        {image && <span className={styles.shade} />}
        <span className={styles.orb}>
          <img src={topic ? TOPIC_ICONS[topic] : iconAll} alt="" width={15} height={15} />
        </span>
        <span className={styles.caption}>
          <strong>{card.article.title}</strong>
          {caption && <small>{caption}</small>}
        </span>
      </button>
    );
  }
  if (item.kind === 'tip') {
    const { tip, card } = item;
    return (
      <button type="button" className={`${styles.tile} ${styles.tip}`} onClick={onOpen} aria-label={`Open ${tip.by}’s tip${card ? ` on ${card.article.title}` : ''}`}>
        <span className={styles.tipTop}>
          <span className={styles.avatar} aria-hidden="true">
            {tip.by.trim().charAt(0).toUpperCase() || 'L'}
            <span className={styles.localCheck}>
              <img src={checkWhite} alt="" width={9} height={9} />
            </span>
          </span>
          {item.topic && (
            <span className={styles.smallTopic}>
              <img src={TOPIC_ICONS[item.topic]} alt="" width={12} height={12} />
            </span>
          )}
        </span>
        <strong className={styles.tipText}>“{tip.text}”</strong>
        <span className={styles.byline}>
          {tip.by}’s tip{card ? ` · ${card.article.title}` : ''}
        </span>
      </button>
    );
  }
  if (item.kind === 'insight') {
    const { insight } = item;
    return (
      <button type="button" className={`${styles.tile} ${styles.note}`} onClick={onOpen} aria-label={`Ask again: ${insight.question}`}>
        <span className={styles.icons}>
          <span className={styles.askAvatar}>
            <img src={mascot} alt="" width={20} height={20} />
          </span>
          <span className={styles.smallTopic}>
            <img src={item.topic ? TOPIC_ICONS[item.topic] : iconAsk} alt="" width={12} height={12} />
          </span>
        </span>
        <strong className={styles.noteTitle}>{insight.question}</strong>
        {insight.summary && <span className={styles.noteSummary}>{insight.summary}</span>}
        <span className={styles.source}>Saved from Ask{insight.areaName ? ` · ${insight.areaName}` : ''}</span>
      </button>
    );
  }
  if (item.kind === 'conversation') {
    const { saved } = item;
    const replies = saved.replies.length;
    return (
      <button type="button" className={`${styles.tile} ${styles.note}`} onClick={onOpen} aria-label={`Open saved conversation: ${saved.title}`}>
        <span className={styles.icons}>
          <span className={styles.phraseIcon}>
            <img src={iconCommunity} alt="" width={15} height={15} />
          </span>
        </span>
        <strong className={styles.noteTitle}>{saved.title}</strong>
        {saved.body && <span className={styles.noteSummary}>{saved.body}</span>}
        <span className={styles.source}>
          Saved from Community{replies > 0 ? ` · ${replies} ${replies === 1 ? 'reply' : 'replies'}` : ''}
        </span>
      </button>
    );
  }
  const local = item.source === 'Confirmed by a local';
  return (
    <article className={`${styles.tile} ${styles.phrase}`} aria-label={`Phrase: ${item.word}`}>
      <button type="button" className={styles.phraseOpen} onClick={onOpen}>
        <span className={styles.icons}>
          <span className={styles.phraseIcon}>
            <img src={iconPhrase} alt="" width={15} height={15} />
          </span>
          <span className={local ? `${styles.tag} ${styles.tagLocal}` : styles.tag}>{item.source}</span>
        </span>
        <strong className={styles.word}>{item.word}</strong>
        <span className={styles.meaning}>{item.meaning}</span>
      </button>
      {item.lookup && item.source === 'AI-generated' && (
        <button type="button" className={styles.notSure} onClick={() => onNotSure(item.lookup!)}>
          Not sure? Ask a local
        </button>
      )}
    </article>
  );
}
