// An opened hunt (owner, batch 3): one flat, readable step at a time, no book. The header holds 〈 back, the hunt's
// title, the step you are on and "?" (the tour). Under it: the opening, then each stop (where to go, what to look for,
// the map, a hint), then the ending. At a stop there is one thing to do: Take photo. The photo goes to AI recognition;
// a recognised photo passes the stop and the next one opens by itself, with the clue you found on top. When the photo
// is not recognised, or the service can't be reached, the player takes or sends it again: there is no way round it.
// Nothing plays by itself: a film only plays when its button is tapped. Over the dock, the "Now" box (NowBox.tsx) says
// in a line or two what to do right now, from the opening to the ending (UT03-4).
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../OnboardingPage/v3/icons';
import { usePersistentStore } from '../../../data/persistentStore';
import { huntTourStore } from '../../../data/v2Stores';
import { paths } from '../../../routes';
import { huntImage, type HuntId } from '../hunts';
import type { Film } from '../story/chapters';
import { loadHunt, passStop, startHunt, type PlayHunt, type PlayStop } from './model';
import { nowLine, stepOf } from './now';
import { NowBox } from './NowBox';
import { recognizePhoto } from './recognize';
import { Tour, type TourStep } from './Tour';
import { FilmSheet } from './FilmSheet';
import styles from './HuntPlay.module.css';

type Check =
  | { state: 'idle' }
  | { state: 'checking'; url: string }
  | { state: 'no-match'; url: string; reason: string }
  | { state: 'unavailable'; url: string; reason: string };

/** The clue just found, shown over the next stop until it is closed. */
interface Found {
  stop: PlayStop;
}

const TOUR: TourStep[] = [
  { target: 'progress', title: 'Your progress', text: 'Which stop you are on, out of how many. Each passed stop fills a bar.' },
  { target: 'stop', title: 'The stop', text: 'Where to go, and what to look for when you get there.' },
  { target: 'map', title: 'Map', text: 'Opens the stop in your maps app, so you can walk there.' },
  { target: 'hint', title: 'Hint', text: 'Stuck? This shows what the detail looks like.' },
  { target: 'now', title: 'Now: what to do next', text: 'This box always says what to do right now. Tap the arrow to fold it, tap again to bring it back.' },
  { target: 'camera', title: 'Take photo', text: 'Photograph the detail. When AI recognises it, the stop is passed and the next one opens.' },
  { target: 'back', title: 'Back', text: 'Leave the hunt at any time. Your progress is saved on this phone.' },
  { target: 'help', title: 'Tour', text: 'Tap ? to see this tour again.' },
];

export function HuntPlay({ id, onBack }: { id: HuntId; onBack(): void }) {
  const [hunt, setHunt] = useState<PlayHunt>(() => loadHunt(id)!);
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const [found, setFound] = useState<Found | null>(null);
  const [hint, setHint] = useState(false);
  const [films, setFilms] = useState<{ reel: Film[]; title: string } | null>(null);
  const [tourDone, setTourDone] = useUnsavedTour();
  const [touring, setTouring] = useState(false);
  const [nowOpen, setNowOpen] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<File | null>(null);
  const abort = useRef<AbortController | null>(null);
  const stop = hunt.current == null ? null : hunt.stops[hunt.current];

  useEffect(() => setHunt(loadHunt(id)!), [id]);
  useEffect(() => () => abort.current?.abort(), []);
  // a new step starts at its top, with its hint folded
  useEffect(() => {
    setHint(false);
    window.scrollTo?.({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [hunt.current, hunt.started]);
  // the tour starts by itself the first time a stop is on screen
  useEffect(() => {
    if (!tourDone && hunt.started && stop) setTouring(true);
  }, [tourDone, hunt.started, stop]);

  const release = useCallback((url?: string) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const send = useCallback(
    async (f: File, url: string) => {
      if (!stop) return;
      abort.current?.abort();
      const ctl = new AbortController();
      abort.current = ctl;
      setCheck({ state: 'checking', url });
      try {
        const r = await recognizePhoto({ routeId: id, stopId: stop.id, feature: stop.target, place: `${stop.name}, ${stop.address}`, file: f }, ctl.signal);
        if (ctl.signal.aborted) return;
        if (r.kind === 'match') {
          const passed = stop;
          const next = passStop(id, passed.id, { name: f.name, type: f.type, size: f.size, lastModified: f.lastModified });
          release(url);
          file.current = null;
          setCheck({ state: 'idle' });
          setFound({ stop: { ...passed, done: true } });
          setHunt(next);
        } else setCheck({ state: r.kind, url, reason: r.reason });
      } catch {
        /* left the page */
      }
    },
    [id, stop, release],
  );

  const take = () => input.current?.click();
  const receive = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setCheck({ state: 'no-match', url: '', reason: 'That is not a photo. Take a photo of the detail.' });
      return;
    }
    if (check.state !== 'idle') release(check.url);
    file.current = f;
    void send(f, URL.createObjectURL(f));
  };
  const retry = () => {
    if (file.current && check.state === 'unavailable') void send(file.current, check.url);
  };

  const begin = () => {
    startHunt(id);
    setHunt(loadHunt(id)!);
  };

  const n = hunt.stops.length;
  const passed = hunt.stops.filter((s) => s.done).length;
  const stepLabel = stepOf(hunt);

  return (
    <div className={nowOpen ? styles.play : `${styles.play} ${styles.nowFolded}`}>
      <header className={styles.head}>
        <div className={styles.headRow}>
          <button type="button" className={styles.icon} aria-label="Back" title="Back" onClick={onBack} data-tour="back">
            <Icon name="back" size={22} />
          </button>
          <div className={styles.headText}>
            <h1 className={styles.title}>{hunt.title}</h1>
            <p className={styles.step}>{stepLabel}</p>
          </div>
          <button type="button" className={styles.icon} aria-label="Show the tour" title="Tour" onClick={() => setTouring(true)} data-tour="help" disabled={!hunt.started || hunt.complete}>
            <Icon name="help" size={22} />
          </button>
        </div>
        <div className={styles.bars} role="progressbar" aria-label="Stops passed" aria-valuemin={0} aria-valuemax={n} aria-valuenow={passed} data-tour="progress">
          {hunt.stops.map((s, i) => (
            <span key={s.id} className={s.done ? styles.barDone : i === hunt.current && hunt.started ? styles.barNow : undefined} />
          ))}
        </div>
      </header>

      <div className={styles.body}>
        <p className={styles.live} role="status" aria-live="polite">
          {found ? `Stop passed. You found ${found.stop.found.title}.` : ''}
        </p>

        {found && (
          <section className={styles.found} aria-labelledby="found-h">
            <button type="button" className={styles.foundClose} aria-label="Close" onClick={() => setFound(null)}>
              <Icon name="close" size={16} />
            </button>
            <p className={styles.kicker}>
              <Icon name="check" size={14} /> Stop {found.stop.n} passed
            </p>
            <h2 id="found-h" className={styles.foundTitle}>
              {found.stop.found.title}
            </h2>
            <p className={styles.text}>{found.stop.found.text}</p>
            {found.stop.next && <p className={styles.next}>{found.stop.next}</p>}
            {found.stop.films.length > 0 && (
              <button type="button" className={styles.film} onClick={() => setFilms({ reel: found.stop.films, title: found.stop.found.title })}>
                <Icon name="captions" size={16} /> Watch the film
              </button>
            )}
          </section>
        )}

        {!hunt.started ? (
          <Opening hunt={hunt} onFilm={() => setFilms({ reel: hunt.introFilms, title: hunt.title })} />
        ) : hunt.complete || !stop ? (
          <Ending hunt={hunt} onFilm={() => setFilms({ reel: hunt.endingFilms, title: hunt.ending.title })} />
        ) : (
          <>
            <section className={styles.card} aria-labelledby="stop-h" data-tour="stop">
              <p className={styles.kicker}>Stop {stop.n}</p>
              <h2 id="stop-h" className={styles.stopName}>
                {stop.name.replace(/ · .*/, '')}
              </h2>
              {stop.address && <p className={styles.address}>{stop.address}</p>}
              <blockquote className={styles.quote}>
                <p>{stop.story}</p>
                {hunt.guide && <cite>{hunt.guide}</cite>}
              </blockquote>
              <h3 className={styles.sub}>Look for</h3>
              <p className={styles.text}>{stop.look}</p>
              <h3 className={styles.sub}>Photograph</h3>
              <p className={styles.target}>{stop.target}</p>
              <div className={styles.tools}>
                <a className={styles.tool} href={stop.map} target="_blank" rel="noreferrer" data-tour="map">
                  <Icon name="pin" size={16} /> Map
                </a>
                {stop.hint && (
                  <button type="button" className={styles.tool} aria-expanded={hint} aria-controls="stop-hint" onClick={() => setHint((h) => !h)} data-tour="hint">
                    <Icon name="eye" size={16} /> {hint ? 'Hide hint' : 'Hint'}
                  </button>
                )}
              </div>
              {hint && stop.hint && (
                <p id="stop-hint" className={styles.hint}>
                  {stop.hint}
                </p>
              )}
            </section>

            {check.state !== 'idle' && (
              <section className={styles.checkCard} aria-label="Your photo">
                {check.url && <img className={styles.shot} src={check.url} alt="Your photo" />}
                <div>
                  {check.state === 'checking' && <p className={styles.checking}>Checking your photo…</p>}
                  {check.state === 'no-match' && (
                    <>
                      <p className={styles.bad}>Not recognised yet.</p>
                      <p className={styles.small}>{check.reason || 'The detail did not show clearly. Frame it again and take another photo.'}</p>
                    </>
                  )}
                  {check.state === 'unavailable' && (
                    <>
                      <p className={styles.bad}>The photo could not be checked.</p>
                      <p className={styles.small}>{check.reason || 'Photo recognition is not reachable right now. Try again in a moment.'}</p>
                    </>
                  )}
                </div>
              </section>
            )}

            <section className={styles.route} aria-label="All stops">
              <ol>
                {hunt.stops.map((s, i) => (
                  <li key={s.id} className={s.done ? styles.routeDone : i === hunt.current ? styles.routeNow : undefined}>
                    <span aria-hidden="true">{s.done ? '✓' : s.n}</span>
                    <span>{s.done || i === hunt.current ? s.name.replace(/ · .*/, '') || `Stop ${s.n}` : `Stop ${s.n}`}</span>
                    <span className={styles.sr}>{s.done ? ', passed' : i === hunt.current ? ', you are here' : ', still ahead'}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>

      <footer className={styles.dock}>
        <NowBox line={nowLine(hunt, check.state)} open={nowOpen} onToggle={() => setNowOpen((o) => !o)} />
        {!hunt.started ? (
          <button type="button" className={styles.primary} onClick={begin}>
            Start the hunt
          </button>
        ) : hunt.complete || !stop ? (
          <button type="button" className={styles.primary} onClick={onBack}>
            Back to Hunt
          </button>
        ) : check.state === 'unavailable' ? (
          <div className={styles.pair}>
            <button type="button" className={styles.secondary} onClick={take}>
              <Icon name="camera" size={18} /> New photo
            </button>
            <button type="button" className={styles.primary} onClick={retry}>
              Try again
            </button>
          </div>
        ) : (
          <button type="button" className={styles.primary} onClick={take} disabled={check.state === 'checking'} data-tour="camera">
            <Icon name="camera" size={20} /> {check.state === 'checking' ? 'Checking…' : check.state === 'no-match' ? 'Take another photo' : 'Take photo'}
          </button>
        )}
        <input ref={input} className={styles.file} type="file" accept="image/*" capture="environment" aria-label="Take a photo of the detail" onChange={receive} tabIndex={-1} />
      </footer>

      {touring && (
        <Tour
          steps={TOUR}
          onDone={() => {
            setTouring(false);
            setTourDone();
          }}
        />
      )}
      {films && films.reel.length > 0 && <FilmSheet reel={films.reel} title={films.title} onClose={() => setFilms(null)} />}
    </div>
  );
}

/** The tour is remembered once finished or skipped. */
function useUnsavedTour(): [boolean, () => void] {
  const [tour, setTour] = usePersistentStore(huntTourStore);
  return [tour.done, () => setTour({ done: true })];
}

function Opening({ hunt, onFilm }: { hunt: PlayHunt; onFilm(): void }) {
  return (
    <section className={styles.card} aria-labelledby="opening-h">
      <img className={styles.hero} src={huntImage(hunt.id)} alt="" />
      <p className={styles.kicker}>
        {hunt.kicker} · {hunt.place} · {hunt.stops.length} stops
      </p>
      <h2 id="opening-h" className={styles.stopName}>
        {hunt.title}
      </h2>
      <p className={styles.text}>{hunt.logline}</p>
      {hunt.opening.length > 0 && (
        <div className={styles.letter}>
          {hunt.opening.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
      {hunt.mission !== hunt.logline && (
        <>
          <h3 className={styles.sub}>Your task</h3>
          <p className={styles.text}>{hunt.mission}</p>
        </>
      )}
      <h3 className={styles.sub}>How it works</h3>
      <p className={styles.text}>At each stop, take a photo of the detail it asks for. When AI recognises it, the next stop opens.</p>
      {hunt.introFilms.length > 0 && (
        <button type="button" className={styles.film} onClick={onFilm}>
          <Icon name="captions" size={16} /> Watch the opening film
        </button>
      )}
      <p className={styles.small}>Real places and history; the story and its characters are fiction.</p>
    </section>
  );
}

function Ending({ hunt, onFilm }: { hunt: PlayHunt; onFilm(): void }) {
  return (
    <section className={styles.card} aria-labelledby="ending-h">
      <p className={styles.kicker}>Hunt finished</p>
      <h2 id="ending-h" className={styles.stopName}>
        {hunt.ending.title}
      </h2>
      <p className={styles.text}>{hunt.ending.text}</p>
      {hunt.ending.reflection && <p className={styles.next}>{hunt.ending.reflection}</p>}
      <h3 className={styles.sub}>Your clues</h3>
      <ol className={styles.clues}>
        {hunt.stops.map((s) => (
          <li key={s.id}>
            <b>{s.found.title}</b>
            <span>{s.name.replace(/ · .*/, '')}</span>
          </li>
        ))}
      </ol>
      {hunt.endingFilms.length > 0 && (
        <button type="button" className={styles.film} onClick={onFilm}>
          <Icon name="captions" size={16} /> Watch the ending film
        </button>
      )}
      <Link className={styles.medals} to={paths.huntMedals}>
        <Icon name="trophy" size={16} /> See your medals
      </Link>
    </section>
  );
}
