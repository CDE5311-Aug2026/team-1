// A story's films, opened by tapping "Watch the film" (owner, batch 3: nothing plays by itself). The first film starts
// because that tap asked for it; the player's own controls do the rest, and the line each film says is written under it.
import { useEffect, useRef, useState } from 'react';
import Icon from '../../OnboardingPage/v3/icons';
import type { Film } from '../story/chapters';
import styles from './FilmSheet.module.css';

export function FilmSheet({ reel, title, onClose }: { reel: Film[]; title: string; onClose(): void }) {
  const [at, setAt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const film = reel[at];
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal?.();
    return () => d?.close?.();
  }, []);
  return (
    <dialog ref={dialog} className={styles.sheet} aria-label={title} onCancel={onClose} onClose={onClose}>
      <div className={styles.bar}>
        <span className={styles.title}>{title}</span>
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <video
        key={film.id}
        className={`${styles.video} ${film.tall ? styles.tall : ''}`}
        src={film.src}
        poster={film.poster}
        controls
        playsInline
        autoPlay
        preload="metadata"
        onEnded={() => at < reel.length - 1 && setAt(at + 1)}
        aria-label={film.en || title}
      />
      {film.en && <p className={styles.line}>{film.en}</p>}
      {reel.length > 1 && (
        <p className={styles.count}>
          Film {at + 1} of {reel.length}
        </p>
      )}
    </dialog>
  );
}
