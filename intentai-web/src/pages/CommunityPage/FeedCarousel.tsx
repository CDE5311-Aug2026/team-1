// Top Questions / For You: a horizontal carousel of photo question cards. Drag (mouse or touch) with momentum,
// trackpad / wheel scrolling, and keyboard focus that brings the card into view. A drag never opens a card.
import { animate, motion, useMotionValue, useReducedMotionConfig } from 'motion/react';
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type WheelEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedSummaries, timeAgo, type CommunitySocial } from '../../data/community/social';
import type { Feed } from '../../data/community/channels';
import { paths } from '../../routes';
import { AvatarStack } from './bits';
import { Icon } from './icons';
import styles from './FeedCarousel.module.css';

const TABS: { id: Feed; label: string }[] = [
  { id: 'top', label: 'Top Questions' },
  { id: 'for-you', label: 'For You' },
];

export default function FeedCarousel({ social }: { social: CommunitySocial }) {
  const [feed, setFeed] = useState<Feed>('top');
  const items = feedSummaries(feed, social);
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [limit, setLimit] = useState(0);
  const dragged = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const v = viewport.current;
      const t = track.current;
      if (!v || !t) return;
      setLimit(Math.max(0, t.scrollWidth - v.clientWidth));
    };
    measure();
    x.set(0);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, [feed, items.length, x]);

  const clamp = (value: number) => Math.min(0, Math.max(-limit, value));
  const moveTo = (value: number) => {
    const target = clamp(value);
    if (reduce) x.set(target);
    else animate(x, target, { type: 'spring', stiffness: 320, damping: 36 });
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    // Trackpads scroll sideways; a plain vertical wheel keeps scrolling the page.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    x.set(clamp(x.get() - event.deltaX));
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = feed === 'top' ? 'for-you' : 'top';
    setFeed(next);
    document.getElementById(`community-feed-${next}`)?.focus();
  };

  // Keyboard focus on a card scrolls it into the visible strip.
  const onCardFocus = (index: number) => {
    const v = viewport.current;
    const card = track.current?.children[index] as HTMLElement | undefined;
    if (!v || !card) return;
    const left = card.offsetLeft + x.get();
    if (left < 0) moveTo(-card.offsetLeft);
    else if (left + card.offsetWidth > v.clientWidth) moveTo(-(card.offsetLeft + card.offsetWidth - v.clientWidth));
    v.scrollLeft = 0;
  };

  return (
    <section className={styles.feed} aria-label="Explore community questions">
      <div className={styles.tabs} role="tablist" aria-label="Suggested questions">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`community-feed-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={feed === tab.id}
            aria-controls="community-feed-track"
            tabIndex={feed === tab.id ? 0 : -1}
            className={feed === tab.id ? styles.tabOn : styles.tab}
            onClick={() => setFeed(tab.id)}
            onKeyDown={onTabKey}
          >
            {tab.label}
            {feed === tab.id && <motion.span layoutId="community-feed-underline" className={styles.underline} />}
          </button>
        ))}
      </div>
      <div
        ref={viewport}
        className={styles.viewport}
        // Swipe row: cards run to the screen edge on purpose (next card peeks in).
        data-allow-bleed
        id="community-feed-track"
        role="tabpanel"
        aria-labelledby={`community-feed-${feed}`}
        onWheel={onWheel}
      >
        <motion.div
          ref={track}
          key={feed}
          className={styles.track}
          style={{ x }}
          drag={limit > 0 ? 'x' : false}
          dragConstraints={{ left: -limit, right: 0 }}
          dragElastic={0.12}
          dragTransition={{ power: 0.35, timeConstant: 260, bounceStiffness: 300, bounceDamping: 32 }}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={() => {
            // The click that ends a drag must not open a card.
            setTimeout(() => {
              dragged.current = false;
            }, 0);
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28 }}
        >
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              className={styles.card}
              aria-label={`${item.title}. ${item.topic}. ${item.replies ? `${item.replies} ${item.replies === 1 ? 'reply' : 'replies'}` : 'No replies yet'}`}
              onClick={() => {
                if (!dragged.current) navigate(paths.question(item.id));
              }}
              onFocus={() => onCardFocus(index)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <span className={styles.photo}>
                <img src={item.photo} alt="" draggable={false} />
                <span className={styles.board}>{item.topic}</span>
              </span>
              <span className={styles.copy}>
                <strong className={styles.title}>{item.title}</strong>
                <span className={styles.byline}>
                  {item.author} · {timeAgo(item.lastAt) ?? ''}
                  {item.views ? ` · ${item.views.toLocaleString('en-SG')} views` : ''}
                </span>
                <span className={styles.meta}>
                  <AvatarStack names={item.repliers} />
                  <span className={item.answered ? styles.replied : styles.open}>
                    {item.replies ? `${item.replies} ${item.replies === 1 ? 'reply' : 'replies'}` : 'Share a perspective'}
                  </span>
                  <Icon name="arrow" size={16} className={styles.arrow} />
                </span>
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
