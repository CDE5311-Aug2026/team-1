import { Fragment } from 'react';
import type { Source } from '../../data/culture';

interface SourceLineProps {
  sources: readonly Source[];
  className?: string;
}

/** "Source: A · B", linking each source that has an exact page url. */
export default function SourceLine({ sources, className }: SourceLineProps) {
  return (
    <p className={className}>
      Source:{' '}
      {sources.map((source, i) => (
        <Fragment key={source.label}>
          {i > 0 && ' · '}
          {source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.label}
            </a>
          ) : (
            source.label
          )}
        </Fragment>
      ))}
    </p>
  );
}
