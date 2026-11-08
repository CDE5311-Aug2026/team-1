// Hunt's own parts around the FindSG stories, in IntentAI's design: the header (as My Space's), the two tabs, the
// hunter pass (a sibling of My Space's passport holder: your rank, places, stops and points), and the Public tab.
import { useMemo, useState, type CSSProperties } from "react";
import {
  GAME_STORIES,
  imageFor,
  ONSITE_ROUTES,
  readOnsite,
  readShort,
  shortCount,
} from "../../findsg";
import {
  HUNT_CHALLENGES,
  HUNT_ROUTE_IDS,
  rankAmong,
  SAMPLE_EXPLORERS,
  SAMPLE_SPEED,
} from "../../data/hunt/stories";
import { visitedSet } from "../../data/ura/ura";
import { useExplorePersonal } from "../../features/nearby/actions";
import { localToday } from "../../features/nearby/personal";
import Icon from "../OnboardingPage/v3/icons";
import type { HuntGo } from "./HuntPage";
import { HowToPlay } from "./notebook/HowToPlay";
import { howToPlayPending, markHowToPlaySeen } from "./notebook/howToPlayState";
import PageBar from "../../components/PageBar/PageBar";
import { PublicHall } from "./public3d/PublicHall";
import { BOOKS, BookCover, bookOf, type BookId } from "./notebook/Bookshelf";
import { chapter, shortChapter, SHORT_PINS } from "./notebook/chapters";
import { SHORT_EPISODE } from "../../findsg/book";
import { PUBLISHED_PLACES } from "../../features/nearby/catalogue";
import { distanceM } from "../../features/nearby/geo";
import { isPrecise, useLocationState } from "../../features/nearby/location";
import type { LatLng } from "../../features/nearby/types";
import { TOURISM_INFO, tourismOf, type TourismCategory } from "../../data/tourism";
import CategoryChips, { useCategoryParam } from "../../components/Category/CategoryChips";
import { usePersistentStore } from "../../data/persistentStore";
import { profileV3Store, tourismOrder } from "../../data/profile/profile";
import { huntModeStore, isTogether } from "../../data/v2Stores";
import { formatHomeDistance } from "../../data/homePlaces";
import styles from "./Hunt.module.css";
import a from "./HuntArchive.module.css";

/** Stops solved on site (FindSG's on-site mode; remote play does not count). */
export function huntStops(): number {
  const routes = HUNT_ROUTE_IDS.reduce(
    (n, id) =>
      n + readOnsite(id, ONSITE_ROUTES[id].stops, "manual").completed.length,
    0,
  );
  return routes + shortCount(readShort("manual"));
}
/** 100 points a stop. */
export const huntPoints = () => huntStops() * 100;

export function useExplored() {
  const personal = useExplorePersonal();
  return useMemo(() => visitedSet(personal).size, [personal]);
}

/** Hunt's top bar (the shared PageBar). How to play opens by itself the first time the desk is seen. */
export function HuntHeader({ tab }: { tab: "story" | "public"; go?: HuntGo }) {
  // up whenever the shelf is showing and the card hasn't been seen, so the shelf behind it is never left waiting
  const [, closed] = useState(false);
  const how = tab === "story" && howToPlayPending();
  const close = () => {
    markHowToPlaySeen();
    closed(true);
  };
  return (
    <>
      <PageBar title="Hunt" tone="dark" className={styles.pageBar} game={tab === "story"} />
      {how && <HowToPlay onClose={close} />}
    </>
  );
}

export function HuntTabs({ tab, go }: { tab: "story" | "public"; go: HuntGo }) {
  return (
    <div
      className={styles.segment}
      role="tablist"
      aria-label="Hunt"
      style={{ "--at": tab === "story" ? 0 : 1 } as CSSProperties}
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "story"}
        onClick={() => go({}, true)}
      >
        Stories
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "public"}
        onClick={() => go({ tab: "public" }, true)}
      >
        Public
      </button>
      <span className={styles.segInk} aria-hidden="true" />
    </div>
  );
}

/** Your hunter pass: a sibling of the passport holder card. Tap for the boards. */
export function HunterPass({ go }: { go: HuntGo }) {
  const explored = useExplored();
  const stops = huntStops();
  const rank = rankAmong(SAMPLE_EXPLORERS, explored);
  const stats = [
    { label: "Places", value: explored },
    { label: "Stops", value: stops },
    { label: "Points", value: stops * 100 },
  ];
  return (
    <button
      type="button"
      className={styles.pass}
      onClick={() => go({ board: "explore" })}
      aria-label={`Singapore rank ${rank}. Open the leaderboards`}
    >
      <span className={styles.passHead}>
        <span>HUNTER</span>
        <span className={styles.passRule} aria-hidden="true" />
        <span>SGP</span>
      </span>
      <span className={styles.passBody}>
        <span className={styles.passRank}>
          <small>RANK</small>
          <b>#{rank}</b>
          <small>Singapore</small>
        </span>
        <span className={styles.passStats}>
          {stats.map((s) => (
            <span key={s.label} className={styles.passStat}>
              <b>{s.value}</b>
              <small>{s.label}</small>
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

const days = (from: string, today: string) =>
  Math.round((Date.parse(from) - Date.parse(today)) / 86400000);

/** Public: the 3D notice board and podium; the flat list where WebGL is not there. */
export function PublicTab({
  go,
  openRoute,
}: {
  go: HuntGo;
  openRoute(id: string): void;
}) {
  const explored = useExplored();
  const [flat, setFlat] = useState(false);
  if (flat) return <PublicFlat go={go} openRoute={openRoute} />;
  return <PublicHall go={go} openRoute={openRoute} explored={explored} onFail={() => setFlat(true)} />;
}

function PublicFlat({
  go,
  openRoute,
}: {
  go: HuntGo;
  openRoute(id: string): void;
}) {
  const today = localToday();
  const [now, ...later] = HUNT_CHALLENGES;
  const story = GAME_STORIES[now.routeId];
  const d = days(now.from, today);
  const explored = useExplored();
  return (
    <div className={styles.stack} role="tabpanel" aria-label="Public">
      <h2 className={styles.kicker}>This weekend</h2>
      <button
        type="button"
        className={styles.challenge}
        onClick={() => openRoute(now.routeId)}
      >
        <img src={imageFor(now.routeId)} alt="" />
        <span className={styles.chTag}>
          {d > 0 ? `Starts in ${d} day${d === 1 ? "" : "s"}` : "On now"}
        </span>
        <span className={styles.chBody}>
          <b>{now.title}</b>
          <span>{story.stops.length} places</span>
          <span className={styles.chFoot}>
            <span>
              <b>{now.players}</b> joined
            </span>
            <span>
              best <b>{now.bestMinutes} min</b>
            </span>
            <span className={styles.chGo}>Join</span>
          </span>
        </span>
      </button>

      <div className={styles.sectionHead}>
        <h2 className={styles.kicker}>Boards</h2>
        <button
          type="button"
          className={styles.more}
          onClick={() => go({ board: "explore" })}
        >
          See all <Icon name="chevron" size={14} />
        </button>
      </div>
      <div className={styles.boards}>
        <MiniBoard
          title="Fastest"
          rows={SAMPLE_SPEED}
          unit="min"
          you={{ rank: null, value: null }}
          onOpen={() => go({ board: "speed" })}
        />
        <MiniBoard
          title="Explorers"
          rows={SAMPLE_EXPLORERS}
          unit=""
          you={{ rank: rankAmong(SAMPLE_EXPLORERS, explored), value: explored }}
          onOpen={() => go({ board: "explore" })}
        />
      </div>

      <h2 className={styles.kicker}>Coming up</h2>
      <ul className={styles.upcoming}>
        {later.map((c) => {
          const [, m, dd] = c.from.split("-");
          const [, m2, dd2] = c.to.split("-");
          const span =
            m === m2
              ? `${+dd}–${+dd2} ${cap(MONTHS[+m - 1])}`
              : `${+dd} ${cap(MONTHS[+m - 1])} – ${+dd2} ${cap(MONTHS[+m2 - 1])}`;
          return (
            <li key={c.id}>
              <span
                className={styles.date}
                aria-label={`${dd} ${MONTHS[+m - 1]}`}
              >
                <b>{dd}</b>
                <small>{MONTHS[+m - 1]}</small>
              </span>
              <span className={styles.upText}>
                <b>{c.title.replace(/^Weekend challenge · /, "")}</b>
                <small>
                  {GAME_STORIES[c.routeId].stops.length} places · {span}
                </small>
              </span>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => openRoute(c.routeId)}
              >
                Preview
              </button>
            </li>
          );
        })}
      </ul>

      <AiStory />
      <p className={styles.note}>
        Other players are samples until the live boards open.
      </p>
    </div>
  );
}
const cap = (m: string) => m[0] + m.slice(1).toLowerCase();
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function MiniBoard({
  title,
  rows,
  unit,
  you,
  onOpen,
}: {
  title: string;
  rows: readonly { name: string; value: number }[];
  unit: string;
  /** Your own line under the top three (no rank or value yet: a dash). */
  you?: { rank: number | null; value: number | null };
  onOpen(): void;
}) {
  return (
    <section className={styles.mini} aria-label={title}>
      <button type="button" className={styles.miniHead} onClick={onOpen}>
        <h3>{title}</h3>
        <span aria-hidden="true">›</span>
      </button>
      <ol>
        {rows.slice(0, 3).map((r, i) => (
          <li key={r.name}>
            <span className={styles.medal} data-n={i + 1}>
              {i + 1}
            </span>
            <span className={styles.name}>{r.name}</span>
            <b>
              {r.value}
              {unit && <small> {unit}</small>}
            </b>
          </li>
        ))}
        {you && (
          <li className={styles.me}>
            <span className={styles.medal}>{you.rank ?? "–"}</span>
            <span className={styles.name}>You</span>
            <b>{you.value ?? "–"}</b>
          </li>
        )}
      </ol>
    </section>
  );
}

/** What comes next for Public: stories written from your own streets. Not built yet, so it is a sealed notice, not a form. */
function AiStory() {
  return (
    <section className={styles.ai} aria-labelledby="ai-h">
      <h2 id="ai-h">A story from your streets</h2>
      <p className={styles.aiText}>
        Pick an area and a theme, and real places near you become a route.
      </p>
      <span className={styles.aiStamp}>Coming soon</span>
    </section>
  );
}

/* ---- the field archive (board 10): one row per story volume, from the game's own saves ---- */

/** A stop "maps" to a catalogue place when the names agree or its pin sits on the building (≤ 30 m). */
const SAME_BUILDING_M = 30;
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function placeCategory(name: string, pin: LatLng | null): TourismCategory | undefined {
  const n = norm(name);
  let best: { cat: TourismCategory; d: number } | undefined;
  for (const p of PUBLISHED_PLACES) {
    const cat = tourismOf(p);
    if (!cat || p.operatingStatus === "planned") continue;
    const pn = norm(p.name);
    if (n.length >= 6 && pn.length >= 6 && (pn === n || pn.startsWith(n) || n.startsWith(pn))) return cat;
    if (pin) {
      const d = distanceM(pin, p.coordinates);
      if (d <= SAME_BUILDING_M && (!best || d < best.d)) best = { cat, d };
    }
  }
  return best?.cat;
}

/** The majority category of the stops that map to a place (a tie goes to the one met first on the route). */
export function majorityCategory(cats: (TourismCategory | undefined)[]): TourismCategory | undefined {
  const count = new Map<TourismCategory, number>();
  for (const c of cats) if (c) count.set(c, (count.get(c) ?? 0) + 1);
  let top: TourismCategory | undefined;
  for (const [c, n] of count) if (!top || n > count.get(top)!) top = c;
  return top;
}

const categoryCache = new Map<BookId, TourismCategory | undefined>();
function volumeCategory(id: BookId): TourismCategory | undefined {
  if (categoryCache.has(id)) return categoryCache.get(id);
  let cats: (TourismCategory | undefined)[];
  if (id === "short") {
    const [press, mosque] = SHORT_EPISODE.places;
    cats = [placeCategory(press.name, SHORT_PINS.press ?? null), placeCategory(mosque.name, SHORT_PINS.mosque ?? null)];
  } else {
    cats = chapter(id).stops.map((s) => placeCategory(s.name, s.pin));
  }
  const c = majorityCategory(cats);
  categoryCache.set(id, c);
  return c;
}

interface OnsiteSave {
  started?: boolean;
  stopIndex?: number;
  completed: string[];
  stops?: Record<string, { checkin?: { confirmedAt?: string | null } | null; observation?: { confirmedAt?: string | null } }>;
}
const lastPlayed = (s: OnsiteSave) =>
  Object.values(s.stops ?? {}).reduce((t, r) => {
    for (const at of [r?.checkin?.confirmedAt, r?.observation?.confirmedAt]) {
      const v = at ? Date.parse(at) : NaN;
      if (Number.isFinite(v) && v > t) t = v;
    }
    return t;
  }, 0);

export interface Volume {
  id: BookId;
  roman: string;
  title: string;
  /** The small-caps line on its cover, in sentence case. */
  tagline: string;
  area: string;
  category?: TourismCategory;
  total: number;
  found: number;
  /** Begun and not finished. */
  inProgress: boolean;
  /** The stop you are on (1-based). */
  stop: number;
  /** The next unsolved stop's pin, for a distance from you. */
  next: { lat: number; lng: number; approx: boolean } | null;
  /** When it was last played (ms), 0 if unknown. */
  last: number;
  /** FindSG's own route (`#story/<id>`); the prologue is played inside its book. */
  routeId: string | null;
}

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Every volume on the shelf, in shelf order, with its real progress (on site and remote, as the shelf counts it). */
export function volumes(): Volume[] {
  return BOOKS.map((b) => {
    const base = { id: b.id, roman: b.roman, title: b.title, tagline: sentence(b.en), area: b.place, category: volumeCategory(b.id) };
    if (b.id === "short") {
      const ch = shortChapter();
      const begun = readShort("manual").ticket || readShort("preview").ticket;
      const total = ch.stops.length;
      return {
        ...base,
        total,
        found: ch.solved,
        inProgress: (begun || ch.solved > 0) && ch.solved < total,
        stop: Math.min(ch.solved + 1, total),
        next: ch.stops.find((s) => !s.done)?.pin ?? null,
        last: 0,
        routeId: null,
      };
    }
    const ch = chapter(b.id);
    const stops = ONSITE_ROUTES[b.id].stops;
    const now = readOnsite(b.id, stops) as unknown as OnsiteSave; // the mode last played
    const both = (["manual", "preview"] as const).map((m) => readOnsite(b.id, stops, m) as unknown as OnsiteSave);
    const total = ch.stops.length;
    const begun = both.some((s) => s.started);
    const at = now.started && typeof now.stopIndex === "number" ? now.stopIndex + 1 : ch.solved + 1;
    return {
      ...base,
      total,
      found: ch.solved,
      inProgress: (begun || ch.solved > 0) && ch.solved < total,
      stop: Math.max(1, Math.min(at, total)),
      next: ch.stops.find((s) => !s.done)?.pin ?? null,
      last: Math.max(...both.map(lastPlayed)),
      routeId: b.id,
    };
  });
}

/** The volume to carry on with: the one in progress played last (shelf order breaks a tie), else null. */
export function inProgress(list: Volume[]): Volume | null {
  return list.filter((v) => v.inProgress).sort((x, y) => y.last - x.last)[0] ?? null;
}

const SPARKLE = (
  <svg aria-hidden="true" width="13" height="11" viewBox="0 0 24 20" fill="currentColor">
    <path d="M10 6c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6z" />
    <path d="M18 2c.3 2.1.9 2.7 3 3-2.1.3-2.7.9-3 3-.3-2.1-.9-2.7-3-3 2.1-.3 2.7-.9 3-3z" />
  </svg>
);
const CHEVRON = (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const ARROW = (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const catStyle = (c?: TourismCategory) =>
  (c ? { "--cat": TOURISM_INFO[c].fill, "--cat-ink": TOURISM_INFO[c].ink } : {}) as CSSProperties;

/** A volume's own cloth-bound cover from the shelf, small. */
function Cover({ id, big }: { id: BookId; big?: boolean }) {
  const b = bookOf(id)!;
  return (
    <span className={`${a.cover} ${big ? a.coverBig : ""}`} style={{ "--tone": b.tone } as CSSProperties} aria-hidden="true">
      <BookCover book={b} />
    </span>
  );
}

/** Hunt's first sight (board 10): the volume to carry on with, then the field archive, one row a volume. */
export function HuntArchive({ go, openBook, openRoute }: { go: HuntGo; openBook(id: BookId): void; openRoute(id: string): void }) {
  const [cat, setCat] = useCategoryParam();
  const all = useMemo(() => volumes(), []);
  const shown = all.filter((v) => cat === "all" || v.category === cat);
  const [profile] = usePersistentStore(profileV3Store);
  const [mode] = usePersistentStore(huntModeStore);
  const loc = useLocationState();
  const here = loc.status === "active" && isPrecise(loc.fix) ? loc.fix : null;
  const away = (v: Volume) => (here && v.next ? `${v.next.approx ? "about " : ""}${formatHomeDistance(distanceM(here, v.next))}` : null);
  const [how, setHow] = useState(howToPlayPending);
  const closeHow = () => {
    markHowToPlaySeen();
    setHow(false);
  };

  // carry on with the one in progress; otherwise the first unfinished volume in your top-ranked category
  const order = tourismOrder(profile);
  const rank = (v: Volume) => (v.category ? order.indexOf(v.category) : order.length);
  const pick = inProgress(shown) ?? [...shown].filter((v) => v.found < v.total).sort((x, y) => rank(x) - rank(y))[0] ?? null;
  const found = shown.reduce((n, v) => n + v.found, 0);
  const total = shown.reduce((n, v) => n + v.total, 0);
  const play = (v: Volume) => (v.routeId ? openRoute(v.routeId) : openBook(v.id));
  const together = isTogether(mode);

  return (
    <div className={a.page}>
      {/* board 09 (second export): the light survey chart and its brass roses lie behind the cards: the app's own paper
          now (AppShell's PaperLayer), so the archive draws none of its own */}
      <PageBar title="Hunt" className={a.bar} />
      {how && <HowToPlay onClose={closeHow} />}
      <CategoryChips value={cat} onChange={setCat} className={`${a.chips}`} />
      <div className={`${a.scroll}`}>
        {pick && (
          <article className={a.next} aria-label={pick.inProgress ? "Continue" : "Picked for you"}>
            <Cover id={pick.id} big />
            <div className={a.nextBody}>
              <span className={a.picked}>
                {SPARKLE}
                Picked for you{pick.category ? ` · ${TOURISM_INFO[pick.category].label}` : ""}
              </span>
              <h2 className={a.nextTitle}>{pick.title}</h2>
              <span className={a.nextMeta}>
                Vol. {pick.roman} · {pick.area} · {pick.total} stops
              </span>
              <span
                className={a.segments}
                role="img"
                aria-label={`${pick.found} of ${pick.total} found`}
                style={{ gridTemplateColumns: `repeat(${pick.total}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: pick.total }, (_, i) => (
                  <span key={i} className={i < pick.found ? a.segOn : undefined} />
                ))}
              </span>
              <span className={a.nextFoot}>
                <span className={a.mono}>
                  {pick.inProgress ? `Stop ${pick.stop} of ${pick.total}` : "Not started"}
                  {away(pick) ? ` · ${away(pick)}` : ""}
                </span>
                <button type="button" className={a.go} onClick={() => play(pick)}>
                  <span>
                    {pick.inProgress ? "Continue" : "Set out"}
                    {ARROW}
                  </span>
                </button>
              </span>
            </div>
          </article>
        )}

        <section aria-labelledby="hunt-archive-h" className={a.archive}>
          <div className={a.head}>
            <h2 id="hunt-archive-h">Field archive</h2>
            <span className={a.mono}>
              {shown.length} {shown.length === 1 ? "volume" : "volumes"} · {found}/{total} stamps
            </span>
          </div>
          {shown.length === 0 ? (
            <p className={a.empty}>No volumes in {cat === "all" ? "this category" : TOURISM_INFO[cat].label} yet.</p>
          ) : (
            <ul className={a.list} aria-label="Volumes">
              {shown.map((v) => {
                const d = away(v);
                return (
                  <li key={v.id}>
                    <button type="button" className={a.row} style={catStyle(v.category)} onClick={() => openBook(v.id)}>
                      <Cover id={v.id} />
                      <span className={a.rowBody}>
                        <span className={a.kicker}>
                          {v.category && <span className={a.badge}>{TOURISM_INFO[v.category].label}</span>}
                          {/* the bar travels with the volume number, so a full line never ends on a dangling "|" */}
                          <span>
                            {v.category && (
                              <span className={a.pipe} aria-hidden="true">
                                |
                              </span>
                            )}
                            Vol. {v.roman}
                          </span>
                          {/* the place drops out whole when the line is full (HuntArchive.module.css .kicker) */}
                          <span>{` · ${v.area}`}</span>
                        </span>
                        <span className={a.rowTitle}>{v.title}</span>
                        <span className={a.tag}>{v.tagline}</span>
                        <span className={a.progress}>
                          <span className={a.track} aria-hidden="true">
                            <span style={{ width: `${Math.round((100 * v.found) / v.total)}%` }} />
                          </span>
                          <span className={a.status}>
                            {v.found ? `${v.found} of ${v.total} found` : "Not started"}
                            {d ? ` · ${d}` : ""}
                          </span>
                        </span>
                      </span>
                      <span className={a.chev}>{CHEVRON}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <nav aria-label="More ways to play" className={a.more}>
          <button type="button" className={a.link} onClick={() => go({ tab: "public" })}>
            <span>Weekend challenges{together ? " and boards" : ""}</span>
            {CHEVRON}
          </button>
          {together && (
            <button type="button" className={a.link} onClick={() => go({ board: "explore" })}>
              <span>
                Leaderboards <small>Example players</small>
              </span>
              {CHEVRON}
            </button>
          )}
          <button type="button" className={a.link} onClick={() => go({ view: "shelf" })}>
            <span>The story shelf</span>
            {CHEVRON}
          </button>
          <button type="button" className={a.link} onClick={() => setHow(true)}>
            <span>How to play</span>
            {CHEVRON}
          </button>
        </nav>
        <p className={a.fine}>Play on site, or play remotely from anywhere. Real places and history; the story and its characters are fiction.</p>
      </div>
    </div>
  );
}
