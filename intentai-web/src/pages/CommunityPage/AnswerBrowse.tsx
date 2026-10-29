// Answer as a local (ZIP `?mode=answer`, CommunityExplore.browse): four channels, search, All / Open / Answered,
// the matching example conversations, and the questions asked on this device that a local can answer here.
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CHANNELS, type ChannelId } from '../../data/community/channels';
import {
  creditLines,
  filterSummaries,
  matches,
  publicSummaries,
  searchText,
  summaryOf,
  type AnswerFilter,
  type ThreadSummary,
  timeAgo,
} from '../../data/community/social';
import mascot from '../../assets/v3/mascot.png';
import { paths } from '../../routes';
import { AvatarStack, ExampleTag } from './bits';
import { Icon } from './icons';
import type { useCommunity } from './useCommunity';
import styles from './AnswerBrowse.module.css';

interface AnswerBrowseProps {
  data: ReturnType<typeof useCommunity>;
  onBack: () => void;
  onAsk: () => void;
}

const FILTERS: { id: AnswerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'answered', label: 'Answered' },
];

export default function AnswerBrowse({ data, onBack, onAsk }: AnswerBrowseProps) {
  const { social, settings, ownThreads, setLocal } = data;
  const [board, setBoard] = useState<ChannelId | 'all'>('all');
  const [filter, setFilter] = useState<AnswerFilter>('all');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const all = publicSummaries(social);
  const inBoard = board === 'all' ? all : all.filter((s) => s.channel === board);
  const found = inBoard.filter((s) => matches(s, query, searchText(s.id)));
  // Questions asked on this device: a local answers them here (Answer as a local on).
  const mine = board === 'all' ? ownThreads.filter((t) => !t.closed).map(summaryOf).filter((s) => matches(s, query)) : [];
  const base = [...mine, ...found];
  const count = (f: AnswerFilter) => filterSummaries(base, f).length;
  const shownMine = filterSummaries(mine, filter);
  const shown = filterSummaries(found, filter);
  const total = shownMine.length + shown.length;
  const channel = CHANNELS.find((c) => c.id === board);

  return (
    <>
      <header className={styles.header}>
        <button type="button" className={styles.iconButton} aria-label="Back to Community" onClick={onBack}>
          <Icon name="back" size={18} />
        </button>
        <div className={styles.titles}>
          <span className={styles.eyebrow}>Community</span>
          <h1 className={styles.title}>Answer as a local</h1>
        </div>
        <button type="button" className={styles.iconButton} aria-label="Ask a local" onClick={onAsk}>
          <Icon name="edit" size={18} />
        </button>
      </header>

      <div className={settings.local ? `${styles.localBar} ${styles.localOn}` : styles.localBar}>
        <p>{settings.local ? 'You’re answering as a local. Open a question to reply.' : 'Switch on to answer questions from newcomers.'}</p>
        <button
          type="button"
          role="switch"
          aria-checked={settings.local}
          aria-label="Answer as a local"
          className={styles.switch}
          onClick={() => setLocal(!settings.local)}
        >
          <i aria-hidden="true">
            <motion.b layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
          </i>
        </button>
      </div>

      <div className={styles.boards} role="group" aria-label="Choose a channel">
        <button type="button" className={board === 'all' ? styles.boardOn : styles.board} aria-pressed={board === 'all'} onClick={() => setBoard('all')}>
          All channels<span>{all.length + (ownThreads.length ? ownThreads.filter((t) => !t.closed).length : 0)}</span>
        </button>
        {CHANNELS.map((c) => (
          <button key={c.id} type="button" className={board === c.id ? styles.boardOn : styles.board} aria-pressed={board === c.id} onClick={() => setBoard(c.id)}>
            {c.name}
            <span>{all.filter((s) => s.channel === c.id).length}</span>
          </button>
        ))}
      </div>
      {channel && <p className={styles.description}>{channel.description}</p>}

      <label className={styles.search} htmlFor={searchId}>
        <Icon name="search" size={16} />
        <span className={styles.srOnly}>Search community questions</span>
        <input
          id={searchId}
          type="search"
          placeholder="Search questions or a phrase…"
          value={query}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className={styles.filters} role="group" aria-label="Filter questions by reply status">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={filter === f.id ? styles.filterOn : styles.filter} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
            <span>{count(f.id)}</span>
            {filter === f.id && <motion.i layoutId="answer-filter-underline" className={styles.underline} />}
          </button>
        ))}
      </div>

      <div aria-live="polite" className={styles.results}>
        <p className={styles.resultsHead}>
          {total} {total === 1 ? 'conversation' : 'conversations'}
          {query.trim() ? ' found' : ''}
        </p>
        {shownMine.length > 0 && (
          <section aria-label="New questions" className={styles.group}>
            <h2 className={styles.groupTitle}>New questions</h2>
            <ResultList items={shownMine} local={settings.local} />
          </section>
        )}
        {shown.length > 0 && <ResultList items={shown} local={settings.local} />}
        {total === 0 && (
          <div className={styles.empty}>
            <Icon name="search" size={22} />
            <h2>No matching questions yet.</h2>
            <p>Try another word, choose a different channel, or switch back to All.</p>
          </div>
        )}
      </div>
      <p className={styles.credits}>Photos: {creditLines(all.map((s) => s.photo)).join(' · ')}</p>
    </>
  );
}

function ResultList({ items, local }: { items: ThreadSummary[]; local: boolean }) {
  return (
    <ul className={styles.list}>
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04 } }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <Link to={paths.question(item.id)} className={styles.card}>
              <img className={item.photo ? styles.photo : `${styles.photo} ${styles.photoMark}`} src={item.photo ?? mascot} alt="" loading="lazy" decoding="async" />
              <span className={styles.copy}>
                <span className={styles.board2}>
                  {item.topic}
                  {item.sample && <ExampleTag />}
                </span>
                <strong>{item.title}</strong>
                <span className={styles.meta}>
                  <span className={item.answered ? styles.answered : styles.open}>{item.answered ? 'Answered' : item.own && local ? 'Needs a local' : 'Open for replies'}</span>
                  <AvatarStack names={item.repliers} />
                  <span>{item.replies ? `${item.replies} ${item.replies === 1 ? 'reply' : 'replies'}` : 'Be the first to share'}</span>
                  {timeAgo(item.lastAt) && <span>{timeAgo(item.lastAt)}</span>}
                </span>
              </span>
              <Icon name="arrow" size={16} className={styles.arrow} />
            </Link>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
