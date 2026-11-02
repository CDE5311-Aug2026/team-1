// The prologue, "Beneath the Golden Dome", as a book you hold: a hunt where only the first address is given. You tear
// the pass, read the note found in a type case, stamp the book at No. 101, photograph the arch, swipe the shutters open
// on the parcel hidden behind them, read its backwards type in a mirror, and work out on a rough sketch where it
// belongs. Only then does the second building's page unseal. A page you have not earned yet is sealed; finishing a
// page turns to the next one by itself. Progress is FindSG's own (short-state).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  assetFor,
  PaperObject,
  readShort,
  saveShort,
  SHORT_EPISODE as EP,
  shortMap,
  ShortScene,
  shortTransition,
  TearTicket,
  type ShortAction,
  type ShortMode,
  type ShortState,
  type TearTicketHandle,
} from '../../../findsg/book';
import { shortChapter, SHORT_FILMS, type ChapterStop, type Film } from './chapters';
import { ChapterLayers, type Layer } from './layers';
import { ChapterCardsPage, ChapterMapPage } from './pages';
import { FilmPlate } from './FilmProjector';
import { Notebook, type NotebookPage } from './Notebook';
import { RubberStamp } from './RubberStamp';
import { markStory, recordOf } from './record';
import { NotesPage, RecordPage } from './BackPages';
import p from './bookPage.module.css';
import { AreaSketch, MirrorStick, ParcelContents, photoOf, PrintedLine, Shutter, ShutterReveal } from './goldenDome';

const MODE_KEY = 'findsg-short-mode-v1';
const readMode = (): ShortMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'preview' ? 'preview' : 'manual';
  } catch {
    return 'manual';
  }
};
const reduced = () => document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

interface Leaf {
  id: string;
  tab?: string;
  label: string;
  /** Can this page be read yet? */
  open(s: ShortState): boolean;
  /** What breaks its seal, said on the sealed page. */
  seal: string;
  render(active: boolean): ReactNode;
}

export function PrologueBook({ open, onOpen, cover }: { open: boolean; onOpen(): void; cover: ReactNode }) {
  const [mode, setMode] = useState<ShortMode>(readMode);
  const [s, setS] = useState<ShortState>(() => readShort(readMode()));
  const [index, setIndexState] = useState(() => Number(sessionStorage.getItem('hunt-page-short')) || 0);
  const [film, setFilm] = useState<{ reel: Film[]; title: string } | null>(null);
  const [layer, setLayer] = useState<Layer | null>(null);
  // the same map, clue cards and chest as every other story's book, read from the prologue's own progress
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ch = useMemo(() => shortChapter(s), [s, layer]);
  const setIndex = useCallback((i: number) => {
    setIndexState(i);
    try {
      sessionStorage.setItem('hunt-page-short', String(i));
    } catch {
      /* fine */
    }
  }, []);
  useEffect(() => void saveShort(s), [s]);

  // finishing a page's task: record it, then (after a beat to see what happened) turn to the next page
  // (the prototype pieces keep the first callback they were given, so the page number is read from a ref)
  const turnTo = useRef<number | null>(null);
  const indexNow = useRef(index);
  indexNow.current = index;
  const act = (type: ShortAction, next?: { reel: Film[]; title: string }, stay = false) => {
    setS((cur) => shortTransition(cur, type));
    // the time log for the display case: the prologue starts at the ticket and ends at the glass
    if (type === 'ticket') markStory('short', 'start');
    if (type === 'bottle') markStory('short', 'finish');
    if (stay) return;
    turnTo.current = indexNow.current + 1;
    window.setTimeout(
      () => {
        if (turnTo.current != null) setIndex(turnTo.current);
        turnTo.current = null;
        if (next?.reel.length) setFilm(next);
      },
      reduced() ? 0 : 1100,
    );
  };
  const nextPage = () => setIndex(indexNow.current + 1);
  const switchMode = (m: ShortMode) => {
    if (m === mode) return;
    setMode(m);
    setS(readShort(m));
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* fine */
    }
  };
  const onSite = mode === 'manual';
  const [press, mosque] = EP.places;
  // the second building is a secret until the clue is worked out
  const second = s.deduce ? mosque.name : 'Still hidden';
  const [archFramed, setArchFramed] = useState(s.photo1);
  const [bandFramed, setBandFramed] = useState(s.photo2);

  const leaves: Leaf[] = [
    {
      id: 'title',
      tab: 'Story',
      label: 'Title page',
      open: () => true,
      seal: '',
      render: () => (
        <div className={`${p.page} ${p.titlePage}`}>
          <Head left="Vol. I · Prologue" right={EP.start.area} />
          <figure className={p.plate}>
            <img src={assetFor(EP.hero)} alt="Concept art: a paper parcel, a proof book and dark glass" />
            <figcaption>Concept art · not a historical photograph</figcaption>
          </figure>
          <h1 className={p.title}>
            Beneath the <em>Golden Dome</em>
          </h1>
          <p className={p.lede}>{EP.premise}</p>
          <p className={p.foot}>Starts at {EP.start.address} · the rest is hidden</p>
          <TurnHint />
        </div>
      ),
    },
    {
      id: 'pass',
      label: 'Your field pass',
      open: () => true,
      seal: '',
      render: () => (
        <div className={p.page}>
          <Head left="I · The pass" right="Admit one" />
          <h2 className={p.h}>Your field pass</h2>
          <p className={p.body}>Tear it to begin. You get one address. Every other place, you work out on the street.</p>
          <Pass torn={s.ticket} onSite={onSite} onTear={() => act('ticket', { reel: SHORT_FILMS.opening, title: 'The story so far' })} />
          <fieldset className={p.mode} data-nodrag>
            <legend>How are you playing?</legend>
            <label>
              <input type="radio" name="short-mode" checked={onSite} onChange={() => switchMode('manual')} /> On site, in Kampong Gelam
            </label>
            <label>
              <input type="radio" name="short-mode" checked={!onSite} onChange={() => switchMode('preview')} /> From afar (kept apart)
            </label>
          </fieldset>
        </div>
      ),
    },
    {
      id: 'letter',
      label: 'The note in the type case',
      open: (st) => st.ticket,
      seal: 'Tear your pass to open the letter.',
      render: () =>
        s.letter ? (
          <div className={`${p.page} ${p.letterPage}`}>
            <Head left="II · The letter" right="From Ah Ning" />
            <div className={p.letterSheet}>
              {EP.letter.split('\n').map((line, i) => (line ? <p key={i}>{line}</p> : <br key={i} />))}
            </div>
            <TurnHint />
          </div>
        ) : (
          <div className={`${p.page} ${p.objectPage}`}>
            <Head left="II · The letter" right="From Ah Ning" />
            <Fit>
              <PaperObject
                kind="envelope"
                title="A letter from Ah Ning"
                subtitle="Found in an old type case"
                folio="KG / LETTER 01"
                reducedMotion={reduced()}
                onOpen={() => window.setTimeout(() => setS((cur) => shortTransition(cur, 'letter')), reduced() ? 0 : 500)}
              />
            </Fit>
          </div>
        ),
    },
    {
      id: 'press',
      label: `Stop I · ${press.name}`,
      open: (st) => st.letter,
      seal: 'Read the letter first.',
      render: () => <PlacePage n="Stop I" place={press} done={s.arrival1} onSite={onSite} onStamp={() => act('checkin1', { reel: SHORT_FILMS.arrival, title: 'No. 101' })} />,
    },
    {
      id: 'press-photo',
      label: 'Stop I · Photograph the arch',
      open: (st) => st.arrival1,
      seal: 'Stamp the book at No. 101 to break this seal.',
      render: (active) => (
        <ModelPage
          n="Stop I"
          title="Photograph the arch"
          task={press.frame}
          hint={press.hint}
          done={s.photo1}
          doneText="Photographed. Something is behind the louvres."
          footer={<Shutter id="press" ready={archFramed} onSite={onSite} onShot={() => act('photo1')} />}
        >
          {active && (
            <ShortScene
              kind="press"
              enabled={s.arrival1}
              inspected={archFramed}
              reducedMotion={reduced()}
              onInspect={(f) => f === 'arch' && setArchFramed(true)}
            />
          )}
        </ModelPage>
      ),
    },
    {
      id: 'shutter',
      label: 'Stop I · Behind the shutter',
      open: (st) => st.photo1,
      seal: 'Photograph the arch first.',
      render: () => (
        <div className={p.page}>
          <Head left="Stop I · Behind the shutter" right="No. 101" />
          <h2 className={p.h}>Behind the louvres</h2>
          <ShutterReveal photo={photoOf('press')} done={s.shutter} onFound={() => act('shutter', { reel: SHORT_FILMS.found, title: 'At the old press' })} />
          <p className={p.note}>The parcel is fiction; please leave the real shutters alone.</p>
        </div>
      ),
    },
    {
      id: 'parcel',
      label: 'The parcel',
      open: (st) => st.shutter,
      seal: 'Swipe the shutters open first.',
      render: () => (
        <div className={`${p.page} ${p.objectPage}`}>
          <Head left="Stop I · The parcel" right="Printer’s string" />
          {s.parcel ? (
            <>
              <h2 className={p.h}>Three things, wrapped together</h2>
              <ParcelContents />
              <p className={p.handNote}>Yusof locked one line of type into the stick. It reads backwards.</p>
              <button type="button" className={p.ribbonBtn} data-nodrag onClick={nextPage}>
                Read the type
              </button>
            </>
          ) : (
            <Fit>
              <PaperObject
                kind="parcel"
                title="For the last line"
                subtitle="Tied with printer’s string"
                folio="KG / OBJECT 01"
                reducedMotion={reduced()}
                onOpen={() => window.setTimeout(() => act('parcel', undefined, true), reduced() ? 0 : 600)}
              />
            </Fit>
          )}
        </div>
      ),
    },
    {
      id: 'stick',
      label: 'The composing stick',
      open: (st) => st.parcel,
      seal: 'Unwrap the parcel first.',
      render: () => (
        <div className={p.page}>
          <Head left="Stop I · The type" right="Cast backwards" />
          <h2 className={p.h}>Hold it to a mirror</h2>
          <p className={p.body}>Metal type is cast backwards. Slide the mirror along the stick until the whole line reads.</p>
          <MirrorStick done={s.mirror} onRead={() => act('mirror', undefined, true)} />
          {s.mirror && (
            <>
              <p className={p.handNote}>Where on this street is there gold?</p>
              <button type="button" className={p.ribbonBtn} data-nodrag onClick={nextPage}>
                Work out where
              </button>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'where',
      label: 'Where next?',
      open: (st) => st.mirror,
      seal: 'Read the type in the mirror first.',
      render: () => (
        <div className={p.page}>
          <Head left="Where next?" right={EP.start.area} />
          <h2 className={p.h}>Where does it belong?</h2>
          <p className={p.handNote}>“Beneath the gold, the glass of the poor.”{onSite ? ' Look up over the rooftops.' : ''}</p>
          <AreaSketch done={s.deduce} onSolved={() => act('deduce', { reel: SHORT_FILMS.passage, title: 'To the next building' })} />
        </div>
      ),
    },
    {
      id: 'mosque',
      label: s.deduce ? `Stop II · ${mosque.name}` : 'Stop II',
      open: (st) => st.deduce,
      seal: 'Work out where the parcel belongs. The book will not tell you.',
      render: () => <PlacePage n="Stop II" place={mosque} done={s.arrival2} onSite={onSite} onStamp={() => act('checkin2')} />,
    },
    {
      id: 'mosque-photo',
      label: 'Stop II · Photograph the band',
      open: (st) => st.arrival2,
      seal: 'Stamp the book at the second building.',
      render: (active) => (
        <ModelPage
          n="Stop II"
          title="What lies below the gold?"
          task={mosque.frame}
          hint={mosque.hint}
          done={s.photo2}
          doneText="The disc in your parcel is the same dark glass."
          footer={<Shutter id="mosque" ready={bandFramed} onSite={onSite} onShot={() => act('photo2', { reel: SHORT_FILMS.glass, title: 'Below the gold' })} />}
        >
          {active && (
            <ShortScene
              kind="mosque"
              enabled={s.arrival2}
              inspected={bandFramed}
              reducedMotion={reduced()}
              onInspect={(f) => f === 'bottle-band' && setBandFramed(true)}
            />
          )}
        </ModelPage>
      ),
    },
    {
      id: 'glass',
      label: 'Stop II · Set the glass',
      open: (st) => st.photo2,
      seal: 'Photograph the dark band first.',
      render: (active) => (
        <ModelPage
          n="Stop II"
          title="Give the glass back"
          task="The disc from Yusof’s parcel belongs in this band."
          hint="Drag it in, or pick it up and tap the band."
          done={s.bottle}
          doneText="The band lights up. The last line is set."
        >
          {active && (
            <ShortScene
              kind="mosque"
              enabled={s.arrival2}
              inspected
              canPlace={s.photo2}
              placed={s.bottle}
              reducedMotion={reduced()}
              onPlace={() => act('bottle', { reel: SHORT_FILMS.ending, title: 'Beneath the golden dome' })}
            />
          )}
        </ModelPage>
      ),
    },
    {
      id: 'folio',
      label: 'The last line',
      open: (st) => st.bottle,
      seal: 'Set the glass to finish the story.',
      render: () => (
        <div className={`${p.page} ${p.endPage}`}>
          <Head left="The last line" right="2 / 2 found" />
          <h2 className={p.h}>Yusof’s line, printed</h2>
          <PrintedLine filled />
          <div className={p.spread}>
            <section>
              <small>I · The people in print</small>
              <p>The small print at the back of a magazine kept the names of those who made it.</p>
              <span>{press.address.split(',')[0]}</span>
            </section>
            <section>
              <small>II · The people in glass</small>
              <p>Bottles given by ordinary people became the dark band below the golden dome.</p>
              <span>{mosque.address.split(',')[0]}</span>
            </section>
          </div>
          <blockquote className={p.reply}>
            “Next time you see a building, look a little longer: beyond its brightest part, who else left something of themselves here?”
          </blockquote>
          {s.ending ? (
            <span className={p.seal} aria-label="Filed">
              Filed
            </span>
          ) : (
            <button type="button" className={p.sealBtn} onClick={() => setS((cur) => shortTransition(cur, 'ending'))}>
              Seal and file the page
            </button>
          )}
        </div>
      ),
    },
  ];

  // the pages you can read, and the next one, sealed
  const firstShut = leaves.findIndex((l) => !l.open(s));
  const shown = firstShut < 0 ? leaves : leaves.slice(0, firstShut + 1);
  const pages: NotebookPage[] = shown.map((l, i) =>
    i === firstShut
      ? { id: l.id, tab: l.tab, label: `${l.label} (sealed)`, render: () => <Sealed what={l.label} how={l.seal} /> }
      : { id: l.id, tab: l.tab, label: l.label, render: l.render },
  );
  // the back of the book is always there to write in and to look up, whatever is still sealed
  pages.push(
    {
      id: 'map',
      tab: 'Map',
      label: 'The map',
      render: () => <ChapterMapPage ch={ch} onUnfold={() => setLayer({ kind: 'map' })} />,
    },
    {
      id: 'clues',
      tab: 'Clues',
      label: 'The clue cards',
      render: () => <ChapterCardsPage ch={ch} onCards={() => setLayer({ kind: 'cards' })} onChest={() => setLayer({ kind: 'ending' })} />,
    },
    {
      id: 'notes',
      tab: 'Notes',
      label: 'Field notes',
      render: () => (
        <NotesPage
          story="short"
          stops={[
            { id: 'press', name: press.name },
            { id: 'mosque', name: second },
          ]}
        />
      ),
    },
    {
      id: 'record',
      tab: 'Record',
      label: 'The record',
      render: () => (
        <RecordPage
          record={recordOf('short')}
          rows={[
            { id: 'press', name: press.name, stamped: onSite && !!s.arrival1, solved: s.deduce },
            { id: 'mosque', name: second, stamped: onSite && !!s.arrival2, solved: s.bottle },
          ]}
        />
      ),
    },
  );
  const at = Math.min(index, pages.length - 1);
  // a stop picked on the map or a card: turn to its page (or the sealed page in the way)
  const goTo = (stop: ChapterStop) => {
    setLayer(null);
    const want = pages.findIndex((pg) => pg.id === (stop.id === 'short-press' ? 'press' : 'mosque'));
    setIndex(want >= 0 ? want : Math.max(0, firstShut));
  };

  return (
    <>
      <Notebook
        pages={pages}
        index={at}
        onIndex={setIndex}
        open={open}
        onOpen={onOpen}
        cover={cover}
        tone="#2f4a3a"
        strap={false}
        held
        fit
        coverLabel="Open Beneath the Golden Dome"
        insert={film && <FilmPlate key={film.title} reel={film.reel} title={film.title} onClose={() => setFilm(null)} />}
      />
      <ChapterLayers ch={ch} layer={layer} setLayer={setLayer} onGo={goTo} />
    </>
  );
}

/** Shrinks a prototype paper object (drawn for a wider screen) to fit what is left of the page, never larger. */
function Fit({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState({ s: 1, y: 0 });
  useLayoutEffect(() => {
    const o = outer.current,
      i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const h = i.offsetHeight || 1;
      const s = Math.min(1, o.clientHeight / h);
      setK({ s, y: Math.max(0, (o.clientHeight - h * s) / 2) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={p.fitBox} ref={outer} data-nodrag>
      <div className={`findsg ${p.fitInner}`} ref={inner} style={{ transform: `translateY(${k.y}px) scale(${k.s})` }}>
        {children}
      </div>
    </div>
  );
}

function Head({ left, right }: { left: string; right: string }) {
  return (
    <header className={p.head}>
      <span>{left}</span>
      <span>{right}</span>
    </header>
  );
}

function TurnHint() {
  return (
    <p className={p.turnHint} aria-hidden="true">
      turn the page ⤵
    </p>
  );
}

/** The real tear ticket, as wide as the page allows. Once torn, the used pass stays on the page. */
function Pass({ torn, onSite, onTear }: { torn: boolean; onSite: boolean; onTear(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const ticket = useRef<TearTicketHandle>(null);
  const [w, setW] = useState(300);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => setW(Math.max(220, Math.floor(el.getBoundingClientRect().width)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const copy = (
    <div className="short-ticket-copy">
      <span>FINDSG / FIELD PASS 001</span>
      <h3>Beneath the Golden Dome</h3>
      <p>Start · {EP.start.address} → ?</p>
      <div>
        <b>{EP.start.area.toUpperCase()}</b>
        <span>{onSite ? 'On-site pass' : 'From-afar pass'}</span>
      </div>
    </div>
  );
  return (
    <div className={`findsg ${p.pass}`} ref={host} data-nodrag>
      {torn ? (
        <div className={p.usedPass}>
          {copy}
          <span className={p.admitted}>Admitted</span>
        </div>
      ) : (
        <TearTicket
          ref={ticket}
          width={w}
          height={Math.round(Math.min(150, w * 0.5))}
          stubSize={Math.max(70, Math.min(96, w * 0.26))}
          radius={5}
          holes={11}
          holeSize={4}
          roughness={1.8}
          tearAngle={28}
          stretch={28}
          resistance={0.45}
          rotate={-1.2}
          tiltMax={4}
          background="#eee0bf"
          color="#2a3d31"
          stubBackground="#cf804a"
          borderColor="#ad9369"
          reducedMotion={reduced()}
          onTear={onTear}
          ariaLabel="Tear the field pass to begin the story"
          stub={
            <div className="short-ticket-stub">
              <small>ADMIT ONE</small>
              <b>
                Tear to
                <br />
                begin
              </b>
              <span>↘︎</span>
            </div>
          }
        >
          {copy}
        </TearTicket>
      )}
    </div>
  );
}

function PlacePage({
  n,
  place,
  done,
  onSite,
  onStamp,
}: {
  n: string;
  place: (typeof EP.places)[number];
  done: boolean;
  onSite: boolean;
  onStamp(): void;
}) {
  return (
    <div className={`${p.page} ${p.placePage}`}>
      <Head left={n} right={place.address.split(',')[0]} />
      <h2 className={p.h}>{place.name}</h2>
      <p className={p.small}>{place.english}</p>
      <p className={p.handNote}>{place.prompt}</p>
      <a className={p.ink} href={shortMap(place)} target="_blank" rel="noreferrer" data-nodrag>
        {place.address.split(',')[0]} · map ↗︎
      </a>
      <div className={p.stampArea}>
        <RubberStamp
          place={place.id === 'press' ? place.address.split(',')[0] : place.name}
          date={today()}
          done={done}
          label={onSite ? 'Press the stamp when you are standing here' : 'Press the stamp to play from afar'}
          onStamp={onStamp}
        />
      </div>
      <p className={p.note}>{onSite ? 'You confirm your own arrival; location is not checked.' : 'From afar: kept apart from real visits.'}</p>
    </div>
  );
}

function ModelPage({
  n,
  title,
  task,
  hint,
  done,
  doneText,
  footer,
  children,
}: {
  n: string;
  title: string;
  task: string;
  hint: string;
  done: boolean;
  doneText: string;
  /** Under the plate until the page is done (the camera shutter). */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${p.page} ${p.modelPage}`}>
      <Head left={n} right="Building plate" />
      <h2 className={p.h}>{title}</h2>
      <div className={`findsg ${p.modelPlate}`} data-nodrag>
        <span className={p.corner} aria-hidden="true" />
        <span className={p.corner} aria-hidden="true" />
        <span className={p.corner} aria-hidden="true" />
        <span className={p.corner} aria-hidden="true" />
        {children}
      </div>
      {done ? (
        <p className={p.doneMark}>✓ {doneText}</p>
      ) : (
        <>
          <p className={p.handNote} title={hint}>
            {task}
          </p>
          {footer}
        </>
      )}
    </div>
  );
}

function Sealed({ what, how }: { what: string; how: string }) {
  return (
    <div className={`${p.page} ${p.sealedPage}`}>
      <div className={p.foldedSheet} aria-hidden="true">
        <span className={p.string} />
        <span className={p.wax}>F</span>
      </div>
      <h2 className={p.h}>Sealed</h2>
      <p className={p.small}>{what}</p>
      <p className={p.body}>{how}</p>
    </div>
  );
}
