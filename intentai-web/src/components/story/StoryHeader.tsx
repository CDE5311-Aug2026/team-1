import { Fragment, useEffect, useRef } from 'react';
import type { Facet } from '../../data/placeStories';
import { StoryIcon } from './StoryIcon';
import styles from './StoryHeader.module.css';

interface StoryHeaderProps {
  /** Upper-case kicker, e.g. "MONUMENT · BERLIN WALL FRAGMENTS". */
  kicker: string;
  icon: Facet;
  /** Heading split into the phrases that blur in one after another (.05s, .15s, .25s, ...). */
  title: string[];
  subtitle?: string;
}

/** Card header: kicker with facet icon, blur-in h1 (focused on route entry), optional subtitle. */
export function StoryHeader({ kicker, icon, title, subtitle }: StoryHeaderProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <header className={styles.header}>
      <p className={`a-up ${styles.kicker}`}>
        <StoryIcon name={icon} size={14} className={styles.icon} />
        {kicker}
      </p>
      <h1 ref={heading} tabIndex={-1} className={styles.title}>
        {title.map((phrase, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span className="a-blur" style={{ animationDelay: `${Math.round(5 + i * 10) / 100}s` }}>
              {phrase}
            </span>
          </Fragment>
        ))}
      </h1>
      {subtitle && (
        <p className={`a-up ${styles.subtitle}`} style={{ animationDelay: '.2s' }}>
          {subtitle}
        </p>
      )}
    </header>
  );
}
