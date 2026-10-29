import type { ReactNode } from 'react';
import styles from './SourceLine.module.css';

interface SourceLineProps {
  children: ReactNode;
  /** Inside a StoryArticle (no side margin); otherwise a page-level line with the 20 px text gutter. */
  inArticle?: boolean;
  /** Fade-up delay, s. Omit for no entrance animation. */
  delay?: number;
}

/** "Source: ..." credit line, 12 px muted. */
export function SourceLine({ children, inArticle = false, delay }: SourceLineProps) {
  const animated = delay !== undefined;
  return (
    <p
      className={`${animated ? 'a-up ' : ''}${styles.source} ${inArticle ? styles.inArticle : ''}`}
      style={animated ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </p>
  );
}
