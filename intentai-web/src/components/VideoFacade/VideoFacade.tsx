import { useState } from 'react';
import type { Video } from '../../data/videos';
import styles from './VideoFacade.module.css';

/**
 * A local poster with a play button. Nothing loads from YouTube until the tap; then the
 * privacy-mode (youtube-nocookie) player replaces the poster.
 */
export default function VideoFacade({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={styles.root}>
      <div className={styles.frame}>
        {playing ? (
          <iframe
            className={styles.player}
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className={styles.poster}
            aria-label={`Play video: ${video.title}`}
            onClick={() => setPlaying(true)}
          >
            <span className={styles.play} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </span>
            <span className={styles.title}>{video.title}</span>
          </button>
        )}
      </div>
      {/* The source is always the video's own YouTube page, so one line credits it. */}
      <p className={styles.meta}>
        {video.channel} · {video.length} ·{' '}
        <a className={styles.watch} href={video.sources[0].url} target="_blank" rel="noopener noreferrer">
          Watch on YouTube
        </a>
      </p>
    </div>
  );
}
