// A real YouTube video in the v2 place page's video card (board 12: poster, duration chip, the ring of words around a
// white play button, title and line at the foot), built on SampleVideo's frame. Nothing is fetched from YouTube until
// Play is pressed (the poster is the app's own photo); then the player loads from youtube-nocookie.com, and the line
// under the card says so. Inside a notebook page (FlipBook), turning away from the page stops it.
import { useEffect, useId, useRef, useState } from 'react';
import { formatClock } from './SampleVideo';
import sv from './SampleVideo.module.css';
import styles from './YouTubeClip.module.css';

interface YouTubeClipProps {
  id: string;
  title: string;
  channel: string;
  /** Length in seconds (from the video's YouTube page). */
  seconds: number;
  poster: { src: string; alt: string; credit?: string };
}

export function YouTubeClip({ id, title, channel, seconds, poster }: YouTubeClipProps) {
  const [playing, setPlaying] = useState(false);
  const orbitId = useId();
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const total = formatClock(seconds);

  useEffect(() => {
    if (!playing) return undefined;
    frame.current?.focus();
    const leaf = root.current?.closest('[data-state]');
    if (!leaf || typeof MutationObserver === 'undefined') return undefined;
    const mo = new MutationObserver(() => {
      if (leaf.getAttribute('data-state') !== 'current') setPlaying(false);
    });
    mo.observe(leaf, { attributes: true, attributeFilter: ['data-state'] });
    return () => mo.disconnect();
  }, [playing]);

  return (
    <figure ref={root} className={styles.clip} data-no-flip>
      <div className={`${sv.frame} ${styles.frame}`}>
        {playing ? (
          <iframe
            ref={frame}
            className={styles.player}
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`}
            title={`${title} (${channel}, YouTube)`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <>
            <img className={sv.poster} src={poster.src} alt={poster.alt} draggable={false} decoding="async" loading="lazy" />
            <span aria-hidden="true" className={sv.shade} style={{ background: 'rgba(24, 22, 19, 0.36)' }} />
            <span aria-hidden="true" className={styles.foot} />
            <span className={sv.duration}>{total}</span>
            <div className={sv.cluster}>
              <svg aria-hidden="true" className={`orbit ${sv.orbit}`} width="124" height="124" viewBox="0 0 124 124">
                <defs>
                  <path id={orbitId} d="M62,62 m-51,0 a51,51 0 1,1 102,0 a51,51 0 1,1 -102,0" />
                </defs>
                <text fill="#FFFFFF" fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fontWeight="600" letterSpacing="2">
                  <textPath href={`#${orbitId}`} textLength="316" lengthAdjust="spacing">
                    {`PLAY · YOUTUBE · ${total} · WATCH ·`}
                  </textPath>
                </text>
              </svg>
              <button type="button" className={`press ${sv.play} ${styles.play}`} aria-label={`Play video: ${title}, ${channel}, ${total} (loads YouTube)`} onClick={() => setPlaying(true)}>
                <span aria-hidden="true" className={`ring ${sv.ring}`} />
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
            <span className={sv.label}>
              <span className={sv.labelTitle}>{title}</span>
              <span className={sv.labelSub}>Video · {channel}</span>
            </span>
          </>
        )}
      </div>
      <figcaption className={styles.note}>
        {playing ? `Playing from YouTube · ${channel}` : 'Play loads the video from YouTube (youtube-nocookie.com).'}
        {!playing && poster.credit ? ` Poster: ${poster.credit.replace(/^Photo:\s*/, '')}` : ''}
      </figcaption>
    </figure>
  );
}
