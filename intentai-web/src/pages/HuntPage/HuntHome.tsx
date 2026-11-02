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
import PageBar from "../../components/PageBar/PageBar";
import { PublicHall } from "./public3d/PublicHall";
import styles from "./Hunt.module.css";

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

const HOW_SEEN = "findsg-hunt-how-seen";

/** Hunt's top bar (the shared PageBar). How to play opens by itself the first time the desk is seen. */
export function HuntHeader({ tab }: { tab: "story" | "public"; go?: HuntGo }) {
  const [how, setHow] = useState(() => {
    try {
      return tab === "story" && !localStorage.getItem(HOW_SEEN);
    } catch {
      return false;
    }
  });
  const close = () => {
    setHow(false);
    try {
      localStorage.setItem(HOW_SEEN, "1");
    } catch {
      /* private mode: it shows again next time */
    }
  };
  return (
    <>
      <PageBar title="Hunt" tone="dark" className={styles.pageBar} />
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
