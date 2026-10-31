// Home, Discovery redesign (owner brief and sketch, 31 Oct 2026). Top to bottom: the header, the Festival / Event
// card, the map card (a Three.js scene of URA's planning areas: regions numbered 1–5, then the region's planning areas,
// then the area's places), and "Recommended": a Cover Flow deck (Three.js) that goes region → planning area → place.
// Map and deck follow each other. Grey = not unlocked, blue = every place checked in. The level and selection live in
// the URL (?lvl=&r=&a=&p=), so Back from a place page returns to the same card.
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { lazy, Suspense, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import homeLogo from "../../assets/home/logo.png";
import { todaysHoliday } from "../../data/holiday";
import { ALL_HOME_PLACES, type HomePlace } from "../../data/homePlaces";
import {
  URA_AREAS,
  URA_REGIONS,
  URA_SOURCE,
  areaOfPlace,
  areaProgress,
  areasOf,
  placesInArea,
  regionProgress,
  uraArea,
  uraRegion,
  visitedSet,
  type RegionId,
  type UnlockProgress,
} from "../../data/ura/ura";
import { useExplorePersonal } from "../../features/nearby/actions";
import { paths } from "../../routes";
import HomeHeader from "../HomeHeader/HomeHeader";
import { PlaceCarousel } from "../PlaceCarousel/PlaceCarousel";
import type { CoverItem } from "./CoverFlow3D";
import { LevelDeck, progressLine, type LevelCard } from "./LevelDeck";
// Three.js loads with these two, after the rest of Home has drawn.
const MapCard3D = lazy(() =>
  import("./MapCard3D").then((m) => ({ default: m.MapCard3D })),
);
const CoverFlow3DLazy = lazy(() =>
  import("./CoverFlow3D").then((m) => ({ default: m.CoverFlow3D })),
);
function CoverFlow3D(props: Parameters<typeof CoverFlow3DLazy>[0]) {
  return (
    <Suspense fallback={props.fallback}>
      <CoverFlow3DLazy {...props} />
    </Suspense>
  );
}

/** Card band colours by unlock status (as on the map). */
const SHAPE_COLOR = {
  none: "#c9c2b4",
  exploring: "#8fb5f0",
  done: "#2f6fe4",
} as const;
import styles from "./DiscoveryHome.module.css";

type Level = "regions" | "areas" | "places";
const DEPTH: Record<Level, number> = { regions: 0, areas: 1, places: 2 };

/** Home base (NUS University Town) decides the first region and area shown. */
const BASE_AREA = URA_AREAS.find(
  (a) =>
    a.id === areaOfPlace("curated:sg-national-university-of-singapore")?.id,
);
const DEFAULT_REGION: RegionId = BASE_AREA?.region ?? "central";

/** Areas, most places first; those with none yet go last. */
const sortedAreas = (region: RegionId) =>
  [...areasOf(region)].sort(
    (a, b) =>
      placesInArea(b.id).length - placesInArea(a.id).length ||
      a.name.localeCompare(b.name),
  );

const homePlacesIn = (areaId: string): HomePlace[] =>
  ALL_HOME_PLACES.filter((p) => areaOfPlace(p.id)?.id === areaId);

const ratio = (p: UnlockProgress) => (p.total ? p.visited / p.total : 0);

export default function DiscoveryHome() {
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const [params, setParams] = useSearchParams();
  const personal = useExplorePersonal();
  const visited = useMemo(() => visitedSet(personal), [personal]);

  // ---- level and selection, from the URL ----
  const region = (uraRegion(params.get("r") ?? undefined)?.id ??
    DEFAULT_REGION) as RegionId;
  const areaList = useMemo(() => sortedAreas(region), [region]);
  const areaParam = uraArea(params.get("a") ?? undefined);
  const area =
    areaParam?.region === region
      ? areaParam
      : (areaList.find((a) => a.id === BASE_AREA?.id) ?? areaList[0]);
  const placeList = useMemo(() => homePlacesIn(area.id), [area.id]);
  const lvlParam = params.get("lvl");
  const level: Level =
    lvlParam === "areas" || (lvlParam === "places" && placeList.length > 0)
      ? lvlParam
      : "regions";
  const place = placeList.find((p) => p.id === params.get("p")) ?? placeList[0];

  const go = (next: { lvl?: Level; r?: string; a?: string; p?: string }) => {
    const q = new URLSearchParams();
    const lvl = next.lvl ?? level;
    if (lvl !== "regions") q.set("lvl", lvl);
    q.set("r", next.r ?? region);
    if (lvl !== "regions" || next.a) q.set("a", next.a ?? area.id);
    if (lvl === "places" && (next.p ?? place?.id))
      q.set("p", next.p ?? place!.id);
    setParams(q, { replace: true });
  };
  const lastDepth = useRef(DEPTH[level]);
  const direction = DEPTH[level] >= lastDepth.current ? 1 : -1;
  lastDepth.current = DEPTH[level];

  const enterRegion = (id: string) =>
    go({
      lvl: "areas",
      r: id,
      a: id === region ? area.id : sortedAreas(id as RegionId)[0].id,
    });
  const enterArea = (id: string) =>
    placesInArea(id).length
      ? go({ lvl: "places", a: id, p: homePlacesIn(id)[0]?.id })
      : go({ a: id });
  const openPlace = (id: string) => navigate(paths.nearbyPlace(id));

  // ---- cards ----
  const regionCards: LevelCard[] = URA_REGIONS.map((r) => ({
    id: r.id,
    name: r.name,
    kicker: `Region · ${areasOf(r.id).length} areas`,
    progress: regionProgress(r.id, visited),
  }));
  const areaCards: LevelCard[] = areaList.map((a) => ({
    id: a.id,
    name: a.name,
    kicker: `${uraRegion(a.region)?.name} · Planning area`,
    progress: areaProgress(a.id, visited),
  }));
  const regionItems: CoverItem[] = useMemo(
    () =>
      regionCards.map((c, i) => ({
        id: c.id,
        title: c.name,
        kicker: `${i + 1} · Region · ${areasOf(c.id as RegionId).length} areas`,
        line: progressLine(c.progress),
        status: c.progress.status,
        progress: ratio(c.progress),
        shape: areasOf(c.id as RegionId)
          .filter((a) => !/Islands$/.test(a.name))
          .map((a) => ({
            rings: a.rings,
            color: SHAPE_COLOR[areaProgress(a.id, visited).status],
          })),
        action: `Explore ${c.name}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visited],
  );
  const areaItems: CoverItem[] = useMemo(
    () =>
      areaCards.map((c, i) => ({
        id: c.id,
        title: c.name,
        kicker: `${i + 1} · ${uraRegion(region)?.name} · Planning area`,
        line: progressLine(c.progress),
        status: c.progress.status,
        progress: ratio(c.progress),
        shape: [
          {
            rings: URA_AREAS.find((a) => a.id === c.id)!.rings,
            color: SHAPE_COLOR[c.progress.status],
          },
        ],
        action: c.progress.total
          ? `See ${c.progress.total} ${c.progress.total === 1 ? "place" : "places"}`
          : "Nothing to see yet",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, visited],
  );
  const placeItems: CoverItem[] = useMemo(
    () =>
      placeList.map((p) => ({
        id: p.id,
        title: p.name,
        kicker: visited.has(p.id)
          ? "Checked in"
          : `${p.distance} · ${area.name}`,
        line: p.area,
        status: visited.has(p.id) ? "done" : "none",
        progress: null,
        image: p.photo,
        action: "Open",
        actionLabel: `Open ${p.name} in Nearby`,
      })),
    [placeList, visited, area.name],
  );

  const regionName = uraRegion(region)?.name ?? "";
  const crumbs = [
    "Singapore",
    ...(level === "regions" ? [] : [regionName]),
    ...(level === "places" ? [area.name] : []),
  ];
  const title =
    level === "regions"
      ? "Regions"
      : level === "areas"
        ? `${regionName} · planning areas`
        : area.name;
  const up = () =>
    level === "places" ? go({ lvl: "areas" }) : go({ lvl: "regions" });

  const deckMotion = {
    initial: reduce
      ? false
      : {
          opacity: 0,
          y: direction > 0 ? 26 : -14,
          scale: direction > 0 ? 0.96 : 1.02,
        },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: direction > 0 ? -14 : 26,
          scale: direction > 0 ? 1.02 : 0.96,
        },
    transition: {
      duration: reduce ? 0 : 0.3,
      ease: [0.2, 0.8, 0.2, 1] as const,
    },
  };

  return (
    // One screen with a deck that reaches the screen edges: bleeds past the column on purpose.
    <div className={styles.home} data-allow-bleed>
      <h1 className={styles.srOnly}>Explore Singapore</h1>
      <div className={styles.head}>
        <HomeHeader logoSrc={homeLogo} />
        <button
          type="button"
          className={styles.event}
          onClick={() => navigate(paths.holiday)}
        >
          <span className={styles.eventKicker}>
            Festival &amp; Event · {todaysHoliday.kicker}
          </span>
          <span className={styles.eventTitle}>{todaysHoliday.cardTitle}</span>
          <span className={styles.eventGo} aria-hidden="true">
            →
          </span>
        </button>
      </div>

      <div className={styles.mapCard}>
        <Suspense
          fallback={
            <div
              className={styles.mapLoading}
              role="application"
              aria-label={`Map of Singapore's planning areas. ${title}.`}
            />
          }
        >
          <MapCard3D
            level={level}
            region={region}
            areaId={area.id}
            areaOrder={areaList.map((a) => a.id)}
            places={placeList.map((p) => ({
              id: p.id,
              name: p.name,
              point: p.point,
            }))}
            selectedPlaceId={level === "places" ? place?.id : undefined}
            visited={visited}
            label={`Map of Singapore's planning areas. ${title}.`}
            onPickRegion={(id) =>
              level === "regions" ? go({ r: id }) : enterRegion(id)
            }
            onPickArea={(id) =>
              level === "areas" ? go({ a: id }) : enterArea(id)
            }
            onPickPlace={(id) => go({ lvl: "places", p: id })}
          />
        </Suspense>
        <div className={styles.mapTop}>
          {level !== "regions" && (
            <button
              type="button"
              className={styles.back}
              onClick={up}
              aria-label={`Back to ${level === "places" ? `${regionName} areas` : "regions"}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          <div className={styles.crumbBox}>
            <span className={styles.dots} aria-hidden="true">
              {(["regions", "areas", "places"] as const).map((l) => (
                <span
                  key={l}
                  className={
                    DEPTH[l] <= DEPTH[level] ? styles.dotOn : styles.dot
                  }
                />
              ))}
            </span>
            <p className={styles.crumbs} aria-label="Where you are">
              {crumbs.join(" › ")}
            </p>
          </div>
        </div>
        <details className={styles.credits}>
          <summary>Map data</summary>
          <p>
            Planning areas: {URA_SOURCE.title}, {URA_SOURCE.publisher} (
            {URA_SOURCE.licence}). {URA_SOURCE.note}
          </p>
        </details>
      </div>

      <div className={styles.recommend}>
        <h2 className={styles.title}>
          <span className={styles.titleKicker}>Recommended</span>
          {title}
        </h2>
        <div className={styles.deckBox}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={
                level === "regions"
                  ? "regions"
                  : level === "areas"
                    ? `areas:${region}`
                    : `places:${area.id}`
              }
              className={styles.deckLayer}
              {...deckMotion}
            >
              {level === "regions" && (
                <CoverFlow3D
                  label="Regions"
                  items={regionItems}
                  selectedId={region}
                  onSelect={(id) => go({ r: id, a: undefined })}
                  onEnter={enterRegion}
                  fallback={
                    <LevelDeck
                      label="Regions"
                      cards={regionCards}
                      selectedId={region}
                      actionLabel={(c) => `Explore ${c.name}`}
                      onSelect={(id) => go({ r: id, a: undefined })}
                      onEnter={enterRegion}
                    />
                  }
                />
              )}
              {level === "areas" && (
                <CoverFlow3D
                  label={`${regionName} planning areas`}
                  items={areaItems}
                  selectedId={area.id}
                  onSelect={(id) => go({ a: id })}
                  onEnter={enterArea}
                  fallback={
                    <LevelDeck
                      label={`${regionName} planning areas`}
                      cards={areaCards}
                      selectedId={area.id}
                      actionLabel={(c) =>
                        c.progress.total
                          ? `See ${c.progress.total} ${c.progress.total === 1 ? "place" : "places"}`
                          : "Nothing to see yet"
                      }
                      onSelect={(id) => go({ a: id })}
                      onEnter={enterArea}
                    />
                  }
                />
              )}
              {level === "places" && place && (
                <CoverFlow3D
                  label="Nearby places"
                  items={placeItems}
                  selectedId={place.id}
                  onSelect={(id) => go({ p: id })}
                  onEnter={openPlace}
                  fallback={
                    <PlaceCarousel
                      places={placeList}
                      selectedId={place.id}
                      stories={{}}
                      onSelect={(id) => go({ p: id })}
                      onActivate={(id) => go({ p: id })}
                      onOpen={openPlace}
                    />
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
