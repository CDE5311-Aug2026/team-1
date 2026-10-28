import { useState, type ReactNode } from 'react';
import styles from './StoryArticle.module.css';

interface StoryArticleProps {
  /** First paragraph, always visible. */
  lead: ReactNode;
  /** Paragraphs behind "Read more". */
  more: readonly ReactNode[];
  /** Lead paragraph animation delay, s (default .4). */
  leadDelay?: number;
  /** Top padding: 18 (default), 16 or 12 (p03). */
  top?: 12 | 16 | 18;
  /** Rendered after the details, e.g. a SourceLine. */
  children?: ReactNode;
}

/** Body copy: lead paragraph plus native <details> "Read more" / "Show less". */
export function StoryArticle({ lead, more, leadDelay = 0.4, top = 18, children }: StoryArticleProps) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`${styles.article} ${top === 16 ? styles.top16 : top === 12 ? styles.top12 : ''}`}>
      <p className={`a-up ${styles.lead}`} style={{ animationDelay: `${leadDelay}s` }}>
        {lead}
      </p>
      <details className={styles.more} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className={styles.summary}>
          {open ? 'Show less' : 'Read more'}
          <svg aria-hidden="true" className={styles.chev} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        {more.map((p, i) => (
          <p key={i} className={`a-up ${styles.para}`} style={{ animationDelay: '0s' }}>
            {p}
          </p>
        ))}
      </details>
      {children}
    </article>
  );
}
