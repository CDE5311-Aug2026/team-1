// The clue cards. On the page: a small wooden card box with a brass label; tap and its lid lifts on the hinge and the
// cards rise. Then the deck fans out across the table: found cards face up, the rest face down. Drag along the fan to
// look through it, tap a card to draw it: it comes forward and turns over to its story and its film.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { goLabel, type Chapter, type ChapterStop, type Film } from './chapters';
import { Overlay } from './Overlay';
import styles from './props.module.css';

export function CardBox({ chapter, onOpen }: { chapter: Chapter; onOpen(): void }) {
  const [lifting, setLifting] = useState(false);
  function open() {
    setLifting(true);
    setTimeout(onOpen, 650);
    setTimeout(() => setLifting(false), 1200);
  }
  return (
    <button
      type="button"
      className={`${styles.cardBox} ${lifting ? styles.boxOpen : ''}`}
      onClick={open}
      aria-label={`Open the clue card box: ${chapter.solved} of ${chapter.stops.length} cards`}
    >
      <span className={styles.boxScene}>
        <span className={styles.boxBack} />
        <span className={styles.boxCards}>
          {chapter.stops.slice(0, 6).map((s, i) => (
            <i key={s.id} className={s.done ? styles.boxCardUp : ''} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
        <span className={styles.boxFront}>
          <span className={styles.boxLabel}>
            <small>CLUE CARDS</small>
            <b>
              {chapter.solved}
              <i>/{chapter.stops.length}</i>
            </b>
          </span>
        </span>
        <span className={styles.boxSide} />
        <span className={styles.boxLid}>
          <span className={styles.lidTop} />
          <span className={styles.lidFront} />
        </span>
      </span>
    </button>
  );
}

function CardFace({ chapter, stop }: { chapter: Chapter; stop: ChapterStop }) {
  // each card shows a different part of the route's scene
  const pos = `${(stop.n * 37) % 100}% ${30 + ((stop.n * 23) % 50)}%`;
  return (
    <span className={styles.cardFace}>
      <span className={styles.cardPhoto} style={{ backgroundImage: `url(${chapter.scene})`, backgroundPosition: pos }} />
      <span className={styles.cardNo}>Nº {String(stop.n).padStart(2, '0')}</span>
      <b>{stop.discovery.title.replace(/^.*?·\s*/, '')}</b>
      <small>{stop.name}</small>
      {stop.films.length > 0 && <span className={styles.cardReel} aria-label="Has a film" />}
    </span>
  );
}
function CardBack({ chapter, stop }: { chapter: Chapter; stop: ChapterStop }) {
  return (
    <span className={styles.cardBackFace}>
      <span className={styles.cardEmblem}>
        <i>{chapter.roman}</i>
      </span>
      <small>{stop.done ? '' : `Stop ${stop.n} · not found yet`}</small>
    </span>
  );
}

export function CardFan({
  chapter,
  onClose,
  onFilm,
  onGo,
  focus,
}: {
  chapter: Chapter;
  onClose(): void;
  onFilm(reel: Film[], title: string): void;
  onGo(stop: ChapterStop): void;
  /** A stop whose card is drawn from the pile straight away. */
  focus?: string;
}) {
  const cards = chapter.stops;
  const n = cards.length;
  const firstFound = Math.max(
    0,
    cards.findIndex((c) => c.done),
  );
  const focused = cards.findIndex((c) => c.id === focus);
  const [hover, setHover] = useState(focused >= 0 ? focused : firstFound);
  const [drawn, setDrawn] = useState<number | null>(focused >= 0 ? focused : null);
  const [turned, setTurned] = useState(false);
  const [dealt, setDealt] = useState(false);
  const fan = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDealt(true), 60);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (drawn == null) return setTurned(false);
    const t = setTimeout(() => setTurned(true), 420);
    return () => clearTimeout(t);
  }, [drawn]);

  const spread = Math.min(7, 40 / n);
  function along(e: RPointerEvent) {
    if (drawn != null || !fan.current) return;
    const r = fan.current.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(f * (n - 1)))));
  }
  const card = drawn != null ? cards[drawn] : null;

  return (
    <Overlay label={`${chapter.area} clue cards`} onClose={drawn != null ? () => setDrawn(null) : onClose}>
      <p className={styles.fanTitle}>
        <small>Vol. {chapter.roman} · Clue cards</small>
        {chapter.goal}
      </p>
      <div
        className={`${styles.fan} ${dealt ? styles.fanDealt : ''} ${drawn != null ? styles.fanAway : ''}`}
        ref={fan}
        onPointerMove={along}
        onPointerDown={along}
      >
        {cards.map((c, i) => {
          const a = (i - (n - 1) / 2) * spread;
          const lift = i === hover && drawn == null ? -26 : 0;
          return (
            <button
              key={c.id}
              type="button"
              className={styles.fanCard}
              style={{ '--a': `${dealt ? a : 0}deg`, '--lift': `${lift}px`, '--d': `${i * 45}ms`, zIndex: i === hover ? 50 : i } as CSSProperties}
              onFocus={() => setHover(i)}
              onClick={() => (setHover(i), setDrawn(i))}
              aria-label={`Card ${c.n}: ${c.done ? c.discovery.title : 'not found yet'}`}
            >
              <span className={styles.fanInner} data-up={c.done}>
                <span className={styles.faceA}>{c.done ? <CardFace chapter={chapter} stop={c} /> : <CardBack chapter={chapter} stop={c} />}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.fanHint}>{drawn == null ? 'Slide along the fan · tap a card to draw it' : ''}</p>

      {card && (
        <div className={styles.drawn} key={card.id}>
          <div className={`${styles.drawnCard} ${turned ? styles.drawnTurned : ''}`}>
            <div className={styles.drawnFront}>{card.done ? <CardFace chapter={chapter} stop={card} /> : <CardBack chapter={chapter} stop={card} />}</div>
            <div className={styles.drawnBack}>
              {card.done ? (
                <>
                  <small>
                    Nº {String(card.n).padStart(2, '0')} · {card.name}
                  </small>
                  <h3>{card.discovery.title}</h3>
                  <p>{card.discovery.text}</p>
                  {card.films.length > 0 && (
                    <button type="button" className={styles.photoClip} onClick={() => onFilm(card.films, card.discovery.title)}>
                      <img src={card.films[0].poster} alt="" />
                      <span>▶ This page’s film</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <small>Nº {String(card.n).padStart(2, '0')} · not found yet</small>
                  <h3>{card.name}</h3>
                  <p>{card.objective}</p>
                  <p className={styles.lockedNote}>
                    Solve this stop on site to turn the card over.{card.films.length > 0 ? ' A film is clipped to its back.' : ''}
                  </p>
                  {chapter.hint.length > 0 && (
                    <button type="button" className={styles.hintFilm} onClick={() => onFilm(chapter.hint, `${card.name} · Hint`)}>
                      ▶ Stuck? Watch a hint
                    </button>
                  )}
                  <button type="button" className={styles.waxButton} onClick={() => onGo(card)}>
                    <span>{goLabel(chapter, card)}</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <button type="button" className={styles.putBack} onClick={() => setDrawn(null)}>
            Back to the pile
          </button>
        </div>
      )}
    </Overlay>
  );
}

/** The chest at the chapter's end: padlocked until every card is found; then its lid swings up and the ending rises. */
export function Chest({ chapter, onOpen }: { chapter: Chapter; onOpen(): void }) {
  const [shake, setShake] = useState(false);
  const [open, setOpen] = useState(false);
  const left = chapter.stops.length - chapter.solved;
  function tap() {
    if (!chapter.complete) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setOpen(true);
    setTimeout(onOpen, 900);
  }
  return (
    <div className={styles.chestWrap}>
      <button
        type="button"
        className={`${styles.chest} ${open ? styles.chestOpen : ''} ${shake ? styles.chestShake : ''}`}
        onClick={tap}
        aria-label={chapter.complete ? 'Open the chest: the ending' : `The chest is locked: ${left} cards to go`}
      >
        <span className={styles.chestGlow} aria-hidden="true" />
        <span className={styles.chestBody} aria-hidden="true">
          <span className={styles.chestBand} />
          <span className={styles.chestBand} />
        </span>
        <span className={styles.chestLid} aria-hidden="true">
          <span className={styles.chestLidFront}>
            <span className={styles.chestBand} />
            <span className={styles.chestBand} />
          </span>
          <span className={styles.chestLidTop} />
          <span className={styles.chestLidInside} />
        </span>
        <span className={styles.padlock} aria-hidden="true">
          {chapter.complete ? '' : <i>{left}</i>}
        </span>
      </button>
      <p className={styles.chestCaption}>
        {chapter.complete ? 'The chest is open: the ending' : `Find ${left} more ${left === 1 ? 'card' : 'cards'} to open the chest`}
      </p>
    </div>
  );
}
