// A story's films, played as old projected film (grain, flicker, sprocket edges), each line shown as an intertitle under
// the frame; several films play as one reel. In a book the reel is a FilmPlate: a cine print tipped in over the open page
// (the book stays in your hands); FilmProjector is the same reel on a dark screen of its own, for anywhere else.
import { useEffect, useRef, useState } from 'react';
import { filmsById, type Film } from './chapters';
import { Overlay } from './Overlay';
import styles from './props.module.css';
import plate from './filmPlate.module.css';
import { filmGrain } from './textures';

function useReel(reel: Film[]) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    setEnded(false);
    v.muted = muted;
    // a phone may refuse sound without a tap (iOS after a drag): play muted, with a speaker to turn it on
    v.play().then(
      () => setPlaying(true),
      () => {
        v.muted = true;
        setMuted(true);
        v.play().then(
          () => setPlaying(true),
          () => setPlaying(false),
        );
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  function unmute() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    if (v.paused) void v.play();
  }
  function toggle() {
    const v = video.current;
    if (!v) return;
    if (ended) {
      setAt(0);
      if (at === 0) {
        v.currentTime = 0;
        void v.play();
        setEnded(false);
      }
      return;
    }
    if (muted) unmute();
    else if (v.paused) void v.play();
    else v.pause();
  }
  return { at, setAt, playing, setPlaying, ended, setEnded, video, toggle, muted, unmute, film: reel[at] };
}

function Screen({ r, reel }: { r: ReturnType<typeof useReel>; reel: Film[] }) {
  const { film, at, setAt, setEnded, setPlaying, playing, ended, toggle, video, muted, unmute } = r;
  return (
    <div className={`${styles.screen} ${film.tall ? styles.tall : ''}`} style={{ ['--film-grain' as string]: filmGrain }}>
      <span className={styles.sprockets} aria-hidden="true" />
      <video
        key={film.id}
        ref={video}
        className={styles.film}
        src={film.src}
        poster={film.poster}
        playsInline
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => (at < reel.length - 1 ? setAt(at + 1) : (setEnded(true), setPlaying(false)))}
        onClick={toggle}
        aria-label={film.en || film.id}
      />
      <span className={styles.grainLayer} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />
      {!playing && (
        <button type="button" className={styles.playBtn} onClick={toggle} aria-label={ended ? 'Play again' : 'Play'}>
          <span aria-hidden="true">{ended ? '↻' : '▶'}</span>
        </button>
      )}
      {muted && playing && (
        <button type="button" className={styles.soundBtn} onClick={unmute} aria-label="Turn the sound on">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4z" />
            <path d="M17 9l4 6M21 9l-4 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** The reel tipped into the open book: a cine print laid over the page, with its caption typed beneath. */
export function FilmPlate({ reel, title, onClose }: { reel: Film[]; title: string; onClose(): void }) {
  const r = useReel(reel);
  const [leaving, setLeaving] = useState(false);
  const close = () => {
    setLeaving(true);
    window.setTimeout(onClose, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!r.film) return null;
  return (
    <div className={`${plate.layer} ${leaving ? plate.leaving : ''}`} data-nodrag>
      <figure className={plate.plate} role="dialog" aria-label={title}>
        <span className={plate.corner} aria-hidden="true" />
        <span className={plate.corner} aria-hidden="true" />
        <span className={plate.corner} aria-hidden="true" />
        <span className={plate.corner} aria-hidden="true" />
        <p className={plate.head}>
          <span>{title}</span>
          {reel.length > 1 && (
            <b>
              {String(r.at + 1).padStart(2, '0')} / {String(reel.length).padStart(2, '0')}
            </b>
          )}
        </p>
        <Screen r={r} reel={reel} />
        {r.film.en && (
          <figcaption className={plate.caption} aria-live="polite">
            {r.film.en}
          </figcaption>
        )}
        {reel.length > 1 && (
          <div className={plate.reel}>
            {reel.map((f, i) => (
              <button key={f.id} type="button" aria-label={`Film ${i + 1}: ${f.en}`} aria-current={i === r.at} onClick={() => r.setAt(i)}>
                <img src={f.poster} alt="" />
              </button>
            ))}
          </div>
        )}
        <p className={plate.note}>Fictional characters filmed on real streets.</p>
        <button type="button" className={plate.done} onClick={close}>
          Back to the page
        </button>
      </figure>
    </div>
  );
}

export function FilmProjector({ reel, title, onClose }: { reel: Film[]; title: string; onClose(): void }) {
  const r = useReel(reel);
  if (!r.film) return null;
  return (
    <Overlay label={title} onClose={onClose} tone="dark">
      <div className={styles.projector}>
        <p className={styles.projTitle}>
          <span>{title}</span>
          {reel.length > 1 && (
            <b>
              {String(r.at + 1).padStart(2, '0')} / {String(reel.length).padStart(2, '0')}
            </b>
          )}
        </p>
        <Screen r={r} reel={reel} />
        {r.film.en && (
          <div className={styles.intertitle} aria-live="polite">
            <p>{r.film.en}</p>
          </div>
        )}
        {reel.length > 1 && (
        <div className={styles.reelDots}>
          {reel.map((f, i) => (
            <button key={f.id} type="button" aria-label={`Film ${i + 1}: ${f.en}`} aria-current={i === r.at} onClick={() => r.setAt(i)}>
              <img src={f.poster} alt="" />
            </button>
          ))}
        </div>
        )}
        <p className={styles.projNote}>Fictional characters filmed on real streets. Not historical footage.</p>
      </div>
    </Overlay>
  );
}

/** A story asks for a film (FindSG's `findsg:film` event, e.g. Only One Missing's CCTV clip): play it on the projector. */
export function FilmHost() {
  const [reel, setReel] = useState<{ films: Film[]; title: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const { ids, title } = (e as CustomEvent<{ ids: string[]; title?: string }>).detail ?? { ids: [] };
      const films = filmsById(ids ?? []);
      if (films.length) setReel({ films, title: title || (films[0] as Film & { title?: string }).title || '' });
    };
    window.addEventListener('findsg:film', on);
    return () => window.removeEventListener('findsg:film', on);
  }, []);
  if (!reel) return null;
  return <FilmProjector key={reel.films.map((f) => f.id).join()} reel={reel.films} title={reel.title} onClose={() => setReel(null)} />;
}
