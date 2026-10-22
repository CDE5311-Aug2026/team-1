import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import { articlesFor, categoryById, type Article, type CategoryId } from '../../data/culture';
import { VIDEOS } from '../../data/videos';
import SourceLine from '../SourceLine/SourceLine';
import VideoFacade from '../VideoFacade/VideoFacade';
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
  // Every tab leads with its short video, then three short articles (the survey has them tied first).
  const video = VIDEOS[category.id];
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
            onClick={() => setSelected(i)}
          >
            {categoryById(id).label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelId(selected)} aria-labelledby={tabId(selected)} className={styles.panel}>
        <h2 className={styles.lead}>{category.topChoice}</h2>
        {/* Keyed so a played video never carries over (and autoplays) on the next tab. */}
        {video && <VideoFacade key={video.youtubeId} video={video} />}
        <div className={styles.grid}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const deeperId = useId();

  const image = ARTICLE_IMAGES[article.id];

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      {image && <img className={styles.photo} src={image.src} alt={image.alt} width={720} height={405} loading="lazy" />}
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
