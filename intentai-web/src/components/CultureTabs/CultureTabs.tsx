import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import { articlesFor, categoryById, type Article, type CategoryId } from '../../data/culture';
import { ARTICLE_VIDEOS, type Video } from '../../data/videos';
import { ARTICLE_LINKS } from '../../data/cultureLinks';
import NearbyLinks from '../NearbyLinks/NearbyLinks';
import SourceLine from '../SourceLine/SourceLine';
import { useSpan } from '../../usage/useSpan';
import styles from './CultureTabs.module.css';

/** v2: each tab shows three articles; the rest stay in the data. */
const ARTICLES_PER_TAB = 3;

interface CultureTabsProps {
  /** Three categories, in tab order: the popular picks by default, or the user's questionnaire picks. */
  categories: readonly CategoryId[];
}

/** Today's culture tabs (v2): replaces v1's three expression cards. WAI-ARIA tabs with roving focus. */
export default function CultureTabs(props: CultureTabsProps) {
  // A new set of categories (after a retake) starts again on the first tab.
  return <Tabs key={props.categories.join()} {...props} />;
}

function Tabs({ categories }: CultureTabsProps) {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  const select = (i: number) => {
    setSelected(i);
    setPlaying(null);
    tabRefs.current[i]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const last = categories.length - 1;
    const next: Record<string, number> = {
      ArrowRight: selected === last ? 0 : selected + 1,
      ArrowLeft: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    select(next[event.key]);
  };

  const category = categoryById(categories[selected]);
  // One video plays at a time: playing another card's video stops the first (its player is removed).
  const [playing, setPlaying] = useState<string | null>(null);
  useSpan('section', `Today › ${category.label}`, true);
  const articles = articlesFor(category.id).slice(0, ARTICLES_PER_TAB);

  return (
    <section className={styles.root} aria-label="Singapore culture">
      <div role="tablist" aria-label="Culture topics" className={styles.tablist} onKeyDown={handleKeyDown}>
        {categories.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            aria-selected={i === selected}
            aria-controls={panelId(i)}
            tabIndex={i === selected ? 0 : -1}
            className={styles.tab}
            onClick={() => {
              setSelected(i);
              setPlaying(null);
            }}
          >
            {categoryById(id).label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelId(selected)} aria-labelledby={tabId(selected)} className={styles.panel}>
        {/* Straight to the cards: each card carries its own short video (a tap on its picture plays it). */}
        <h2 className={styles.srOnly}>{category.topChoice}</h2>
        <div className={styles.grid}>
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              playing={playing === article.id}
              onPlay={() => setPlaying(article.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article, playing, onPlay }: { article: Article; playing: boolean; onPlay: () => void }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const deeperId = useId();

  const image = ARTICLE_IMAGES[article.id];
  const video = ARTICLE_VIDEOS[article.id];

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <CardMedia image={image} video={video} playing={playing} onPlay={onPlay} />
      <p className={styles.kicker}>{article.kicker}</p>
      <h3 id={titleId} className={styles.title}>
        {article.title}
      </h3>
      <p className={styles.summary}>{article.summary}</p>
      <ul className={styles.facts}>
        {article.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {open && (
        <div id={deeperId} className={styles.deeper}>
          <p>{article.deeper}</p>
          <SourceLine sources={article.sources} className={styles.source} />
        </div>
      )}
      {video && (
        // the video's own YouTube page is its source
        <p className={styles.videoMeta}>
          Video · {video.channel} · {video.length ? `${video.length} · ` : ''}
          <a className={styles.watch} href={video.sources[0].url} target="_blank" rel="noopener noreferrer">
            Watch on YouTube
          </a>
        </p>
      )}
      <NearbyLinks links={ARTICLE_LINKS[article.id]} />
      <div className={styles.footer}>
        {image && (
          <a className={styles.credit} href={image.url} target="_blank" rel="noopener noreferrer">
            {image.credit}
          </a>
        )}
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          aria-controls={deeperId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      </div>
    </article>
  );
}

/**
 * The card's picture. With a video it is the video's poster: a play button and the length on the local photo, and
 * nothing loads from YouTube until the tap; then the privacy-mode (youtube-nocookie) player takes its place.
 */
function CardMedia({
  image,
  video,
  playing,
  onPlay,
}: {
  image?: (typeof ARTICLE_IMAGES)[string];
  video?: Video;
  playing: boolean;
  onPlay: () => void;
}) {
  if (video && playing) {
    return (
      <div className={styles.media}>
        <iframe
          className={styles.player}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  if (video) {
    return (
      <button type="button" className={styles.media} aria-label={`Play video: ${video.title}${video.length ? ` (${video.length})` : ''}`} onClick={onPlay}>
        {image ? (
          <img className={styles.mediaPhoto} src={image.src} alt="" width={720} height={405} loading="lazy" />
        ) : (
          <span className={styles.mediaBlank} />
        )}
        <span className={styles.play} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
        {video.length && (
          <span className={styles.length} aria-hidden="true">
            {video.length}
          </span>
        )}
      </button>
    );
  }
  return image ? <img className={styles.photo} src={image.src} alt={image.alt} width={720} height={405} loading="lazy" /> : null;
}
