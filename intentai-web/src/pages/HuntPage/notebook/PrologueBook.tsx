// The prologue, "Beneath the Golden Dome", as a book you hold: every step of the two-stop story is a page. You tear the
// pass on the first page, open the letter glued to the next, stamp the book at each building, turn the 3D model plate,
// thumb the proof book, unwrap the parcel and file the last folded page. A page you have not earned yet is sealed;
// finishing a page turns to the next one by itself. Progress is FindSG's own (short-state), so nothing else changes.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  assetFor,
  FieldBook,
  PaperObject,
  readShort,
  saveShort,
  SHORT_EPISODE as EP,
  shortDirections,
  shortMap,
  ShortScene,
  shortTransition,
  TearTicket,
  type ShortAction,
  type ShortMode,
  type ShortState,
  type TearTicketHandle,
} from '../../../findsg/book';
import { SHORT_FILMS, type Film } from './chapters';
import { FilmPlate } from './FilmProjector';
import { Notebook, type NotebookPage } from './Notebook';
import { RubberStamp } from './RubberStamp';
import { markStory, recordOf } from './record';
import { NotesPage, RecordPage } from './BackPages';
import p from './bookPage.module.css';

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
  const act = (type: ShortAction, next?: { reel: Film[]; title: string }) => {
    setS((cur) => shortTransition(cur, type));
    // the time log for the display case: the prologue starts at the ticket and ends at the bottle
    if (type === 'ticket') markStory('short', 'start');
    if (type === 'bottle') markStory('short', 'finish');
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

  const leaves: Leaf[] = [
    {
      id: 'title',
      tab: 'Story',
      label: 'Title page',
      open: () => true,
      seal: '',
      render: () => (
        <div className={`${p.page} ${p.titlePage}`}>
          <Head left="Vol. I · Prologue" right="Kampong Gelam" />
          <figure className={p.plate}>
            <img src={assetFor(EP.hero)} alt="Concept art: an old proof book, a paper parcel and amber glass" />
            <figcaption>Concept art · not a historical photograph</figcaption>
          </figure>
          <h1 className={p.title}>
            Beneath the <em>Golden Dome</em>
          </h1>
          <p className={p.lede}>An ordinary thing, worth a city remembering.</p>
          <p className={p.foot}>Two buildings · about 25 minutes</p>
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
          <p className={p.body}>Tear it along the perforation to begin. The pass only opens the story: at each building, you stamp this book yourself.</p>
          <Pass torn={s.ticket} onSite={onSite} onTear={() => act('ticket', { reel: SHORT_FILMS.opening, title: 'Opening film' })} />
          <fieldset className={p.mode} data-nodrag>
            <legend>How are you playing?</legend>
            <label>
              <input type="radio" name="short-mode" checked={onSite} onChange={() => switchMode('manual')} /> On site, at the buildings
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
      label: 'The commission letter',
      open: (st) => st.ticket,
      seal: 'Tear your pass to open the letter.',
      render: () =>
        s.letter ? (
          <div className={`${p.page} ${p.letterPage}`}>
            <Head left="II · The letter" right="From Ah Ning" />
            <div className={p.letterSheet}>
              {EP.letter.split('\n').map((line, i) => (line ? <p key={i}>{line}</p> : <br key={i} />))}
            </div>
            <p className={p.note}>The letter is fiction. Reading it is not a check-in.</p>
            <TurnHint />
          </div>
        ) : (
          <div className={`${p.page} ${p.objectPage}`}>
            <Head left="II · The letter" right="From Ah Ning" />
            <Fit>
              <PaperObject
                kind="envelope"
                title="A letter from Ah Ning"
                subtitle="A neighbourhood commission"
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
      tab: 'Press',
      label: `Stop I · ${press.name}`,
      open: (st) => st.ticket,
      seal: 'Tear your pass to open this page.',
      render: () => (
        <PlacePage
          n="Stop I"
          place={press}
          done={s.arrival1}
          onSite={onSite}
          onStamp={() => act('checkin1')}
        />
      ),
    },
    {
      id: 'press-model',
      label: 'Stop I · The building plate',
      open: (st) => st.arrival1,
      seal: 'Stamp the book at the old press to break this seal.',
      render: (active) => (
        <ModelPage n="Stop I" title="Find the arch" task={press.prompt} hint={press.hint} done={s.arch} doneText="Arch traced into the proof book">
          {active && (
            <ShortScene
              kind="press"
              enabled={s.arrival1}
              inspected={s.arch}
              reducedMotion={reduced()}
              onInspect={(f) => f === 'arch' && act('arch', { reel: SHORT_FILMS.stops[0], title: 'At the old press' })}
            />
          )}
        </ModelPage>
      ),
    },
    {
      id: 'proof',
      label: 'The proof book',
      open: (st) => st.arch,
      seal: 'Find the arch on the building plate first.',
      render: () => (
        <div className={`${p.page} ${p.objectPage}`}>
          <Head left="Stop I · Proof book" right="Printed by" />
          <Fit>
            <FieldBook
              title="The street proof book"
              subtitle="The people in small type"
              folio="KG / FOLIO 01"
              pages={EP.pages}
              initialOpen={s.book}
              reducedMotion={reduced()}
              onFinish={() => act('book')}
            />
          </Fit>
        </div>
      ),
    },
    {
      id: 'walk',
      tab: 'Walk',
      label: 'The walk to the dome',
      open: (st) => st.book,
      seal: 'Read the proof book to its last page.',
      render: () => (
        <div className={p.page}>
          <Head left="Between the stops" right="About 4 minutes" />
          <h2 className={p.h}>Take the parcel to the dome</h2>
          <WalkSketch from={press.address.split(',')[0]} to="3 Muscat Street" />
          <p className={p.body}>The proof book gives the next address. Carry the paper parcel; at the second building you will know where what is inside belongs.</p>
          <div className={p.row}>
            <a className={p.ink} href={shortDirections()} target="_blank" rel="noreferrer">
              Walking directions ↗︎
            </a>
            {s.travel ? (
              <span className={p.doneMark}>✓ On your way</span>
            ) : (
              <button type="button" className={p.ribbonBtn} onClick={() => act('travel', { reel: SHORT_FILMS.stops[1], title: 'On the way' })}>
                Set off
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'mosque',
      tab: 'Mosque',
      label: `Stop II · ${mosque.name}`,
      open: (st) => st.travel,
      seal: 'Set off from the old press first.',
      render: () => <PlacePage n="Stop II" place={mosque} done={s.arrival2} onSite={onSite} onStamp={() => act('checkin2')} />,
    },
    {
      id: 'mosque-model',
      label: 'Stop II · The building plate',
      open: (st) => st.arrival2,
      seal: 'Stamp the book at Sultan Mosque to break this seal.',
      render: (active) => (
        <ModelPage n="Stop II" title="What lies below the gold?" task={mosque.prompt} hint={mosque.hint} done={s.band} doneText="The dark glass band is found">
          {active && (
            <ShortScene kind="mosque" enabled={s.arrival2} inspected={s.band} reducedMotion={reduced()} onInspect={(f) => f === 'bottle-band' && act('band')} />
          )}
        </ModelPage>
      ),
    },
    {
      id: 'parcel',
      label: 'The parcel',
      open: (st) => st.band,
      seal: 'Find the dark band below the dome first.',
      render: () => (
        <div className={`${p.page} ${p.objectPage}`}>
          <Head left="Stop II · Parcel" right="Fragile" />
          <Fit>
            <PaperObject
              kind="parcel"
              title="Please take this to the dome"
              subtitle="Glass sample · handle with care"
              folio="KG / OBJECT 02"
              reducedMotion={reduced()}
              initialOpen={s.parcel}
              onOpen={() => act('parcel')}
            />
          </Fit>
        </div>
      ),
    },
    {
      id: 'glass',
      label: 'Stop II · Place the glass',
      open: (st) => st.parcel,
      seal: 'Open the parcel first.',
      render: (active) => (
        <ModelPage
          n="Stop II"
          title="Set the glass in the band"
          task="Drag the bottle end from the corner of the plate into the dark band below the dome."
          hint="Or pick the bottle end up, then tap the band."
          done={s.bottle}
          doneText="The glass ring lights up"
        >
          {active && (
            <ShortScene
              kind="mosque"
              enabled={s.arrival2}
              inspected={s.band}
              canPlace={s.parcel}
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
      tab: 'End',
      label: 'The finished page',
      open: (st) => st.bottle,
      seal: 'Set the glass in the band to finish the story.',
      render: () => (
        <div className={`${p.page} ${p.endPage}`}>
          <Head left="The last line" right="2 / 2 filed" />
          <h2 className={p.h}>This line is for ordinary people.</h2>
          <div className={p.spread}>
            <section>
              <small>I · The people in print</small>
              <p>The small print at the back of a magazine kept the names of those who made it.</p>
              <span>101 Jalan Sultan</span>
            </section>
            <section>
              <small>II · The people in glass</small>
              <p>Bottles given by ordinary people became the dark band below the golden dome.</p>
              <span>3 Muscat Street</span>
            </section>
          </div>
          <EndPlate />
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
      id: 'notes',
      tab: 'Notes',
      label: 'Field notes',
      render: () => (
        <NotesPage
          story="short"
          stops={[
            { id: 'press', name: press.name },
            { id: 'mosque', name: mosque.name },
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
            { id: 'press', name: press.name, stamped: onSite && !!s.arrival1, solved: s.book },
            { id: 'mosque', name: mosque.name, stamped: onSite && !!s.arrival2, solved: s.bottle },
          ]}
        />
      ),
    },
  );
  const at = Math.min(index, pages.length - 1);

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
      <p>101 Jalan Sultan → 3 Muscat Street</p>
      <div>
        <b>02 BUILDINGS</b>
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
          place={place.id === 'press' ? '101 Jalan Sultan' : 'Sultan Mosque'}
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
  children,
}: {
  n: string;
  title: string;
  task: string;
  hint: string;
  done: boolean;
  doneText: string;
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
      {done ? <p className={p.doneMark}>✓ {doneText}</p> : <p className={p.handNote} title={hint}>{task}</p>}
    </div>
  );
}

function WalkSketch({ from, to }: { from: string; to: string }) {
  return (
    <svg className={p.sketch} viewBox="0 0 300 150" role="img" aria-label={`From ${from} to ${to}`}>
      <path className={p.street} d="M10,112 C70,104 120,96 168,80 S260,52 292,40" />
      <path className={p.street} d="M120,148 C126,110 136,60 150,6" />
      <path className={p.route} d="M52,104 C96,98 130,92 168,80 S232,58 250,52" />
      <g transform="translate(52,104)">
        <circle r="6" />
        <text y="22">{from}</text>
      </g>
      <g transform="translate(250,52)">
        <circle r="6" />
        <text y="-12">{to}</text>
      </g>
      <g className={p.rose} transform="translate(30,30)">
        <path d="M0,-14 L3,0 L0,14 L-3,0 Z" />
        <text y="-18">N</text>
      </g>
    </svg>
  );
}

/** The two finds side by side: the arch you traced, and the ring of glass under the dome. */
function EndPlate() {
  return (
    <svg className={p.endPlate} viewBox="0 0 260 90" aria-hidden="true">
      <g className={p.archDraw}>
        <path d="M30,84 V42 A30,30 0 0 1 90,42 V84" />
        <path d="M40,84 V44 A20,20 0 0 1 80,44 V84" />
        <path d="M60,22 V84 M40,60 H80" />
      </g>
      <text x="60" y="12">101 Jalan Sultan</text>
      <g className={p.domeDraw}>
        <path d="M168,54 C168,20 232,20 232,54 Z" />
        <path d="M200,10 V22" />
        <rect x="164" y="54" width="72" height="12" />
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} cx={170 + i * 7.5} cy="60" r="2.6" />
        ))}
        <path d="M168,66 V84 H232 V66" />
      </g>
      <text x="200" y="6">3 Muscat Street</text>
    </svg>
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
