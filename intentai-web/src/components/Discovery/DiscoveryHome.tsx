// Home, Discovery redesign (owner brief and sketch, 31 Oct 2026). The map card is a Three.js scene of URA's planning
// areas: regions numbered 1–5, then the region's planning areas, then the area's places. v2 (owner, 8 Nov 2026): no
// card deck under it any more; one tap on the map goes down a level (a region badge → its planning areas, an area →
// its places, a pin → the place's card), and what the deck listed lies over the map's lower edge as a compact row
// (MapShelf). Ring = how much is checked in, a tick = all of it. The level and selection live in the URL
// (?lvl=&r=&a=&p=), so Back from a place page returns to the same spot. The rail's Picks key shows Editor's Pick
// (?lvl=picks&k=): walks and lists, then a pick's stops (?lvl=pick), the map flying across the island with them; a walk
// also opens as a 2D route (&route=1) with a button that starts Google Maps.
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import {
  lazy,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ALL_HOME_PLACES,
  HOME_BASE,
  HOME_BASE_LABEL,
  type HomePlace,
} from "../../data/homePlaces";
import { usePersistentStore } from "../../data/persistentStore";
import { profileV3Store, tourismOrder } from "../../data/profile/profile";
import { curatedPlace } from "../../features/nearby/catalogue";
import {
  TOURISM_INFO,
  tourismOf,
  type TourismCategory,
  type TourismFilter,
} from "../../data/tourism";
import type { EditorPick } from "../../data/picks";
import {
  URA_AREAS,
  URA_SOURCE,
  areaAt,
  areaOfPlace,
  areasOf,
  placesInArea,
  uraArea,
  uraRegion,
  visitedSet,
  type RegionId,
  type UnlockProgress,
} from "../../data/ura/ura";
import { useExplorePersonal } from "../../features/nearby/actions";
import { localToday } from "../../features/nearby/personal";
import { toXY } from "../../features/nearby/map/projection";
import { showToast } from "../../hooks/useToast";
import PageBar from "../PageBar/PageBar";
import { NEAR_M, nearYou, shortDistance } from "./nearYou";
import { MapNotice, MapShelf, type ShelfItem } from "./MapShelf";
import type { LatLng } from "../../features/nearby/types";
import type { BookControls } from "../Notebook/FlipBook";
// Three.js loads with these two, after the rest of Home has drawn.
// The map card (owner, 31 Oct): regions and planning areas on a light Three.js map over EARTH ONLINE's ground picture
// (fast, no 18 MB download, the camera flies to each card); a planning area's places in the full EARTH ONLINE 3D city.
const MapOverview = lazy(() =>
  import("./MapCard3D").then((m) => ({ default: m.MapCard3D })),
);
const MapDetail = lazy(() =>
  import("./MapCardEarth").then((m) => ({ default: m.MapCardEarth })),
);
function MapCard3D({
  sky,
  ...props
}: Parameters<typeof MapOverview>[0] & { sky?: View3DSky }) {
  return props.level === "places" ? (
    <MapDetail {...props} sky={sky} />
  ) : (
    <MapOverview {...props} />
  );
}
// Loaded after Home first paints (phones on slow networks): the Editor's Pick decks need the whole Culture Atlas, and
// a place's notebook needs its story cards. Both start loading once Home is up, so a tap rarely waits.
let picksModule: typeof import("../../data/picks") | undefined;
const loadPicks = () =>
  import("../../data/picks").then((m) => (picksModule = m));
registerPreload(loadPicks);
type IntroProps = Parameters<typeof import("./PlaceIntro").PlaceIntro>[0];
const PlaceIntro = lazyPage<IntroProps>(() =>
  import("./PlaceIntro").then((m) => ({ default: m.PlaceIntro })),
);
const loadIntro = () => import("./PlaceIntro");
type DeckInfo = import("./PlaceIntro").DeckInfo;
const NO_PICKS: EditorPick[] = [];
/** Run `fn` once the pictures on screen are in (or after 6 s) and the phone is idle; returns a cancel. On a slow phone
 *  network the window's load event comes before Home has even asked for its pictures, so it is not enough to wait for. */
function afterLoad(fn: () => void): () => void {
  let done = false;
  let idle = 0;
  const timers: number[] = [];
  const run = () => {
    if (done) return;
    done = true;
    if (typeof window.requestIdleCallback === "function")
      idle = window.requestIdleCallback(fn, { timeout: 2000 });
    else fn();
  };
  // let React put the first screen's pictures in the page, then wait for those still loading
  timers.push(
    window.setTimeout(() => {
      const pending = [...document.images].filter(
        (im) => !im.complete && im.loading !== "lazy",
      );
      let left = pending.length;
      if (!left) return run();
      for (const im of pending) {
        const one = () => --left <= 0 && run();
        im.addEventListener("load", one, { once: true });
        im.addEventListener("error", one, { once: true });
      }
    }, 400),
    window.setTimeout(run, 6000),
  );
  return () => {
    done = true;
    timers.forEach((t) => window.clearTimeout(t));
    if (idle) window.cancelIdleCallback?.(idle);
  };
}

import { MapToolbar } from "./MapToolbar";
import { PickRoute } from "./PickRoute";
import { backdropSrc } from "./backdrop";
import { edgeTone, paintBrowserBands } from "./edgeTone";
import { ONEMAP_CREDIT } from "./mapCredit";
import { lazyPage, registerPreload } from "../../pages/lazyPage";
import { SkyControls } from "./SkyControls";
import type { View3DSky } from "../../features/nearby/components/View3D";
import styles from "./DiscoveryHome.module.css";

type Level = "regions" | "areas" | "places" | "picks" | "pick" | "near";
const DEPTH: Record<Level, number> = {
  regions: 0,
  areas: 1,
  places: 2,
  picks: 1,
  pick: 2,
  near: 1,
};

// Where Locate last found you, for this tab only: kept out of the URL, so a shared link never carries your position.
const HERE_KEY = "intentai:home-here";
function readHere(): LatLng | null {
  try {
    const v = JSON.parse(
      sessionStorage.getItem(HERE_KEY) ?? "null",
    ) as LatLng | null;
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lng)
      ? { lat: v.lat, lng: v.lng }
      : null;
  } catch {
    return null;
  }
}
function saveHere(v: LatLng) {
  try {
    sessionStorage.setItem(HERE_KEY, JSON.stringify(v));
  } catch {
    // private mode: Near you lasts until the page reloads
  }
}
const isPickLevel = (l: Level) => l === "picks" || l === "pick";
/** The tool rail's room over the map's right edge (MapToolbar.module.css .rail: 44 px keys, 5 px padding, 10 px in;
 *  under 360 px, 36 px keys, 4 px padding, 6 px in). DiscoveryHome.module.css keeps the crumb and the row clear of it. */
const RAIL_W = 64;
const RAIL_W_NARROW = 50;
const NARROW = "(max-width: 359px)";
/** How much taller the map gets with its tab dragged up (DiscoveryHome.module.css .device: --grow × 180 px). */
const TALL_PX = 180;

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(NARROW).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return narrow;
}

/** The last of these pictures to finish loading (the first one at once), so a background never fades in blank. */
function useLoadedImage(src: string) {
  const [shown, setShown] = useState(src);
  useEffect(() => {
    if (src === shown) return;
    let live = true;
    const img = new Image();
    img.onload = () => live && setShown(src);
    img.src = src;
    return () => {
      live = false;
    };
  }, [src, shown]);
  return shown;
}

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

/** v2: a place's Tourism 2040 category (from the catalogue). */
const tourismOfId = (id: string): TourismCategory | undefined => {
  const c = curatedPlace(id);
  return c ? tourismOf(c) : undefined;
};

/** An area's places, ranked by your category order (tourismOrder: your ranking from onboarding, then the rest in STB
 *  order), as Home's "Picked for you" ranks them; inside a category, in their own order. Exported for the tests. */
export const homePlacesIn = (
  areaId: string,
  order: readonly TourismCategory[] = [],
): HomePlace[] => {
  const list = ALL_HOME_PLACES.filter((p) => areaOfPlace(p.id)?.id === areaId);
  if (!order.length) return list;
  const rank = (p: HomePlace) => {
    const c = tourismOfId(p.id);
    const i = c ? order.indexOf(c) : -1;
    return i < 0 ? order.length : i;
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
};

const HOME_BY_ID = new Map(ALL_HOME_PLACES.map((p) => [p.id, p]));
const homeOf = (id: string): HomePlace | undefined => HOME_BY_ID.get(id);

function pickProgress(pick: EditorPick, visited: Set<string>): UnlockProgress {
  const n = pick.stops.filter((s) => visited.has(s.place.id)).length;
  return {
    visited: n,
    total: pick.stops.length,
    status: n === 0 ? "none" : n === pick.stops.length ? "done" : "exploring",
  };
}

/** Where Locate last found you (this tab only), for Home's "Picked for you" distance chips. */
export const readHomeHere = (): LatLng | null => readHere();

interface DiscoveryHomeProps {
  onPlaceOpenChange?: (open: boolean) => void;
  /** v2 category chips (?cat=): other categories' pins dim, the deck shows only this category's places, the badges
   *  and region / area cards count it. */
  category?: TourismFilter;
  /** v2 Home sections above the map (chips, the leaderboard card) and below the deck (Challenges, Picked for you).
   *  Hidden while a place is open: the notebook is a page of its own. */
  /** Under the page's bar, staying with it at the top (the chips). */
  bar?: ReactNode;
  top?: ReactNode;
  bottom?: ReactNode;
  /** Locate found you (or the home base stood in). */
  onHere?: (at: LatLng) => void;
}

export default function DiscoveryHome({ onPlaceOpenChange, category = "all", bar, top, bottom, onHere }: DiscoveryHomeProps) {
  const cat = category === "all" ? null : category;
  const matches = useCallback((id: string) => !cat || tourismOfId(id) === cat, [cat]);
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const [params, setParams] = useSearchParams();
  const personal = useExplorePersonal();
  const visited = useMemo(() => visitedSet(personal), [personal]);
  const [profile] = usePersistentStore(profileV3Store);
  const order = useMemo(() => tourismOrder(profile), [profile]);

  // ---- level and selection, from the URL ----
  const region = (uraRegion(params.get("r") ?? undefined)?.id ??
    DEFAULT_REGION) as RegionId;
  const areaList = useMemo(() => sortedAreas(region), [region]);
  const areaParam = uraArea(params.get("a") ?? undefined);
  const area =
    areaParam?.region === region
      ? areaParam
      : (areaList.find((a) => a.id === BASE_AREA?.id) ?? areaList[0]);
  const placeList = useMemo(
    () => homePlacesIn(area.id, order),
    [area.id, order],
  );
  const [loadedPicks, setLoadedPicks] = useState<EditorPick[] | null>(
    () => picksModule?.editorPicks(localToday()) ?? null,
  );
  useEffect(() => {
    let live = true;
    const fetchPicks = () =>
      void loadPicks().then(
        (m) =>
          live && setLoadedPicks((had) => had ?? m.editorPicks(localToday())),
      );
    // a link straight into the picks needs them now; otherwise they wait until the page's own pictures are in
    if (isPickLevel(params.get("lvl") as Level)) fetchPicks();
    const cancel = afterLoad(() => {
      fetchPicks();
      void loadIntro();
    });
    return () => {
      live = false;
      cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);
  // until they arrive, a ?lvl=picks link shows the regions; the URL is left alone, so the picks open when ready
  const picks = loadedPicks ?? NO_PICKS;
  // ---- Near you (Locate): places and Picks within 2 km ----
  const [here, setHere] = useState<LatLng | null>(readHere);
  const near = useMemo(
    () => (here ? nearYou(here, ALL_HOME_PLACES, picks) : null),
    [here, picks],
  );
  // the selected item near you is kept in this page only: the URL never names what is nearest you (privacy)
  const [nearPick, setNearPick] = useState<string | null>(null);
  const nearSel =
    near?.items.find((i) => i.id === nearPick) ?? near?.items[0];
  const pick = picks.find((k) => k.id === params.get("k")) ?? picks[0];
  const lvlParam = params.get("lvl");
  const level: Level =
    lvlParam === "areas" ||
    (lvlParam === "places" && placeList.length > 0) ||
    ((lvlParam === "picks" || lvlParam === "pick") && pick) ||
    (lvlParam === "near" && !!near?.items.length)
      ? (lvlParam as Level)
      : "regions";
  const place = placeList.find((p) => p.id === params.get("p")) ?? placeList[0];
  const stop =
    pick?.stops.find((st) => st.place.id === params.get("p")) ?? pick?.stops[0];
  const routeMode =
    level === "pick" &&
    pick?.kind === "walk" &&
    !!pick.links?.length &&
    params.get("route") === "1";

  const go = (next: {
    lvl?: Level;
    r?: string;
    a?: string;
    p?: string;
    open?: string;
    k?: string;
    route?: boolean;
  }) => {
    const q = new URLSearchParams();
    const lvl = next.lvl ?? level;
    if (lvl !== "regions") q.set("lvl", lvl);
    // the category chips' ?cat= stays through every move on the map
    const catParam = params.get("cat");
    const commit = () => {
      if (catParam) q.set("cat", catParam);
      setParams(q, { replace: true });
    };
    if (lvl === "near") {
      // the area you were browsing stays in the URL (never the one Locate found you in: a shared link must not tell
      // where you are), so ↩ and the other decks go on from there
      q.set("r", next.r ?? region);
      q.set("a", next.a ?? area.id);
      if (next.open) q.set("open", next.open);
      commit();
      return;
    }
    if (isPickLevel(lvl)) {
      // the region and area stay in the URL, so leaving the picks returns to them
      q.set("r", region);
      q.set("a", area.id);
      const k = next.k ?? pick?.id;
      if (k) q.set("k", k);
      if (lvl === "pick") {
        const p =
          next.p ??
          (k === pick?.id
            ? stop?.place.id
            : picks.find((x) => x.id === k)?.stops[0]?.place.id);
        if (p) q.set("p", p);
        if (next.open) q.set("open", next.open);
        if (next.route ?? (routeMode && k === pick?.id)) q.set("route", "1");
      }
      commit();
      return;
    }
    q.set("r", next.r ?? region);
    if (lvl !== "regions" || next.a) q.set("a", next.a ?? area.id);
    if (lvl === "places" && (next.p ?? place?.id))
      q.set("p", next.p ?? place!.id);
    if (lvl === "places" && next.open) q.set("open", next.open);
    commit();
  };

  const enterRegion = (id: string) =>
    go({
      lvl: "areas",
      r: id,
      a: id === region ? area.id : sortedAreas(id as RegionId)[0].id,
    });
  const enterArea = (id: string) =>
    placesInArea(id).length
      ? go({ lvl: "places", a: id, p: homePlacesIn(id, order)[0]?.id })
      : go({ a: id });
  // A place opens as a sheet over Home; the URL keeps it (?open=), so Back closes it and a reload keeps it open.
  const location = useLocation();
  const openId =
    level === "places" || level === "pick" || level === "near"
      ? params.get("open")
      : null;
  // A place's notebook is a page of its own: the tab bar steps away (TodayPage) and ↩ is the way back.
  useLayoutEffect(() => onPlaceOpenChange?.(!!openId), [onPlaceOpenChange, openId]);
  const openPlace = (id: string) => {
    const q = new URLSearchParams(params);
    // a stop tapped on the Editor's Pick map: it opens inside its pick, so ↩ goes back to the pick's stops
    if (level === "picks") {
      q.set("lvl", "pick");
      if (pick) q.set("k", pick.id);
    }
    q.set("p", id);
    q.set("open", id);
    setParams(q, { state: { sheet: true } });
  };
  // Toolbar: a place or area picked by hand, or where you are now.
  const pickArea = (id: string) => {
    const a = uraArea(id);
    if (!a) return;
    const ps = homePlacesIn(id, order);
    go(
      ps.length
        ? { lvl: "places", r: a.region, a: id, p: ps[0].id }
        : { lvl: "areas", r: a.region, a: id },
    );
  };
  const pickPlace = (id: string) => {
    const a = areaOfPlace(id);
    if (a) go({ lvl: "places", r: a.region, a: a.id, p: id, open: id });
  };
  const [locating, setLocating] = useState(false);
  // a place's sky (time of day, weather) stays as chosen while the deck moves to other places
  const [sky, setSky] = useState<View3DSky>({ time: "now", wx: "clear" });

  // a place is open: its 3D view is the top of the notebook's first page, and turns away with it
  const deviceRef = useRef<HTMLDivElement>(null);
  const [mapAway, setMapAway] = useState(false);
  // the deck an open place was picked from, named under its notebook (an area's deck: PlaceIntro names the area)
  const openDeck = useMemo((): DeckInfo | undefined => {
    if (!openId) return undefined;
    if (level === "pick" && pick) {
      const p = pickProgress(pick, visited);
      return { kind: "Editor's Pick", name: pick.title, visited: p.visited, total: p.total, status: p.status };
    }
    if (level === "near" && near) {
      const ps = near.items.filter((i) => i.kind === "place");
      const v = ps.filter((i) => visited.has(i.id)).length;
      return {
        kind: "Nearby",
        name: "Near you",
        visited: v,
        total: ps.length,
        status: v === 0 ? "none" : v === ps.length ? "done" : "exploring",
      };
    }
    return undefined;
  }, [openId, level, pick, near, visited]);
  const onIntroTurn = useCallback((position: number) => {
    deviceRef.current?.style.setProperty(
      "--away",
      String(Math.max(0, Math.min(1, position))),
    );
    setMapAway(position >= 0.999);
  }, []);
  useEffect(() => {
    if (!openId) setMapAway(false);
  }, [openId]);
  // The map stretches (owner, 31 Oct 2026: "the screen can stretch"): drag the tab at its top up, or tap it, for a
  // taller map. While the finger moves, --grow is set on the card directly (no React render per move); the state
  // changes once, on release.
  const [tall, setTallState] = useState(() => {
    try {
      return sessionStorage.getItem("home.mapTall") === "1";
    } catch {
      return false;
    }
  });
  const grow = tall ? 1 : 0; // 0 (normal) … 1 (tall)
  const growNow = useRef(grow);
  const grip = useRef<{ y: number; g: number; moved: boolean } | null>(null);
  const gripDragged = useRef(false);
  const paintGrow = (g: number, dragging: boolean) => {
    growNow.current = g;
    const el = deviceRef.current;
    if (!el) return;
    el.style.setProperty("--grow", String(g));
    // the card follows the finger; the eased transition is for taps and the snap on release
    el.style.transition = dragging ? "none" : "";
  };
  const setTall = (on: boolean) => {
    paintGrow(on ? 1 : 0, false);
    setTallState(on);
    try {
      sessionStorage.setItem("home.mapTall", on ? "1" : "0");
    } catch {
      /* private mode: just not remembered */
    }
  };
  const gripProps = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      grip.current = { y: e.clientY, g: growNow.current, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const g = grip.current;
      if (!g) return;
      const dy = e.clientY - g.y;
      if (Math.abs(dy) > 4) g.moved = true;
      if (g.moved) paintGrow(Math.max(0, Math.min(1, g.g - dy / TALL_PX)), true);
    },
    onPointerUp: () => {
      const g = grip.current;
      grip.current = null;
      if (!g) return;
      if (!g.moved) return; // a tap: the click toggles
      gripDragged.current = true;
      setTimeout(() => (gripDragged.current = false), 0);
      setTall(growNow.current > 0.5);
    },
    onPointerCancel: () => {
      if (!grip.current) return;
      grip.current = null;
      setTall(growNow.current > 0.5);
    },
  };
  // Locate (owner, 1 Nov 2026): what is near you, within 2 km: landmarks and Editor's Picks, nearest first
  const showNear = (at: LatLng) => {
    setHere(at);
    saveHere(at);
    setNearPick(null);
    onHere?.(at);
    void loadPicks().then((m) =>
      setLoadedPicks((had) => had ?? m.editorPicks(localToday())),
    );
    // the URL keeps the area you were browsing; where you are stays in this tab's sessionStorage
    go({ lvl: "near" });
  };
  const locate = () => {
    const fallback = (why: string) => {
      setLocating(false);
      showToast(
        `${why} Showing what is near your home base, ${HOME_BASE_LABEL}.`,
      );
      showNear(HOME_BASE);
    };
    if (!navigator.geolocation)
      return fallback("Location is not available here.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const q = toXY(at);
        if (!areaAt(q.x, q.y))
          return fallback("You seem to be outside Singapore.");
        showNear(at);
      },
      () => fallback("Location is off."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };
  const closePlace = () => {
    if ((location.state as { sheet?: boolean } | null)?.sheet) navigate(-1);
    else {
      const q = new URLSearchParams(params);
      q.delete("open");
      setParams(q, { replace: true });
    }
  };

  // the deck shows the picked category's places only (the map keeps them all, the others faded)
  const deckPlaces = useMemo(() => placeList.filter((p) => matches(p.id)), [placeList, matches]);
  const deckPlace = place && matches(place.id) ? place : deckPlaces[0];

  // a place opens over Home; a pick opens its deck of stops
  const enterNear = (id: string) => {
    const it = near?.items.find((i) => i.id === id);
    if (it) setNearPick(it.id);
    if (it?.kind === "pick") go({ lvl: "pick", k: it.id, p: it.stopId });
    else if (it) openPlace(it.id);
  };
  // a tap on the row: a place opens; a pick shows its stops
  const onShelf = (id: string) =>
    level === "near" ? enterNear(id) : level === "picks" ? go({ lvl: "pick", k: id }) : openPlace(id);
  const deckStop = stop && matches(stop.place.id) ? stop : pick?.stops.find((st) => matches(st.place.id));

  // ---- the compact row over the map's lower edge (what the deck listed), or a status line when there is none ----
  const shelf = useMemo((): { label: string; items: ShelfItem[]; current?: string } | null => {
    const catLabel = (id: string) => {
      const c = tourismOfId(id);
      return c ? TOURISM_INFO[c].label : "";
    };
    const pickLine = (k: EditorPick) =>
      k.kind === "walk" ? `Walk · ${k.stops.length} stops` : `List · ${k.stops.length} places`;
    const pickDetail = (k: EditorPick) => {
      const pr = pickProgress(k, visited);
      return `${pickLine(k)}, ${pr.visited} of ${pr.total} checked in`;
    };
    const pickDone = (k: EditorPick) => pickProgress(k, visited).status === "done";
    if (level === "places")
      return {
        label: `${area.name} places`,
        current: deckPlace?.id,
        items: deckPlaces.map((p) => ({
          id: p.id,
          title: p.name,
          sub: p.kind,
          detail: [catLabel(p.id), p.kind, p.distance].filter(Boolean).join(", "),
          mark: { kind: "cat", cat: tourismOfId(p.id) },
          done: visited.has(p.id),
        })),
      };
    if (level === "picks")
      return {
        label: "Editor's Pick",
        current: pick?.id,
        items: picks.map((k) => ({
          id: k.id,
          title: k.title,
          sub: pickLine(k),
          detail: pickDetail(k),
          mark: { kind: "pick" },
          done: pickDone(k),
        })),
      };
    if (level === "pick" && pick)
      return {
        label: `${pick.title}: ${pick.kind === "walk" ? "stops" : "places"}`,
        current: deckStop?.place.id,
        items: pick.stops.flatMap((st, i): ShelfItem[] => {
          if (!matches(st.place.id)) return [];
          const where = homeOf(st.place.id)?.area ?? st.place.kind;
          return [
            {
              id: st.place.id,
              title: st.place.name,
              sub: pick.kind === "walk" ? `Stop ${i + 1} · ${where}` : where,
              detail: [pick.kind === "walk" ? `Stop ${i + 1}` : "", catLabel(st.place.id), where].filter(Boolean).join(", "),
              mark: pick.kind === "walk" ? { kind: "num", n: i + 1 } : { kind: "cat", cat: tourismOfId(st.place.id) },
              done: visited.has(st.place.id),
            },
          ];
        }),
      };
    if (level === "near" && near)
      return {
        label: near.within ? `Near you · ${NEAR_M / 1000} km` : "Nearest to you",
        current: nearSel?.id,
        items: near.items.flatMap((it): ShelfItem[] => {
          const away = shortDistance(it.m);
          if (it.kind === "pick")
            return [
              {
                id: it.id,
                title: it.pick.title,
                sub: `${away} · ${it.pick.kind === "walk" ? "Walk" : "List"}`,
                detail: `${away} away, Editor's Pick, ${pickDetail(it.pick)}`,
                mark: { kind: "pick" },
                done: pickDone(it.pick),
              },
            ];
          if (!matches(it.id)) return [];
          return [
            {
              id: it.id,
              title: it.place.name,
              sub: `${away} · ${it.place.kind}`,
              detail: [`${away} away`, catLabel(it.id), it.place.kind].filter(Boolean).join(", "),
              mark: { kind: "cat", cat: tourismOfId(it.id) },
              done: visited.has(it.id),
            },
          ];
        }),
      };
    return null;
  }, [level, area.name, deckPlace, deckPlaces, picks, pick, deckStop, near, nearSel, visited, matches]);
  const notice =
    level === "areas" && placesInArea(area.id).length === 0
      ? `${area.name} has no places yet. Pick another area.`
      : shelf && !shelf.items.length && cat
        ? `No ${TOURISM_INFO[cat].label} places here. Pick All to see every place.`
        : undefined;

  const regionName = uraRegion(region)?.name ?? "";
  const crumbs =
    level === "near"
      ? ["Singapore", "Near you"]
      : isPickLevel(level)
        ? [
            "Singapore",
            "Editor's Pick",
            ...(level === "pick" && pick ? [pick.title] : []),
          ]
        : [
            "Singapore",
            ...(level === "regions" ? [] : [regionName]),
            ...(level === "places" ? [area.name] : []),
          ];
  const title =
    level === "near"
      ? near?.within
        ? `Near you · ${NEAR_M / 1000} km`
        : "Nearest to you"
      : level === "picks"
        ? "Editor's Pick"
        : level === "pick"
          ? (pick?.title ?? "")
          : level === "regions"
            ? "Regions"
            : level === "areas"
              ? `${regionName} · planning areas`
              : area.name;
  const up = () =>
    level === "pick"
      ? go({ lvl: "picks" })
      : level === "places"
        ? go({ lvl: "areas" })
        : go({ lvl: "regions" });
  const upLabel =
    level === "pick"
      ? "Back to Editor's Pick"
      : level === "places"
        ? `Back to ${regionName} areas`
        : "Back to regions";
  const inPicks = isPickLevel(level);
  const openArea = openId ? areaOfPlace(openId) : undefined;
  const wantedBackdrop = backdropSrc(
    openId
      ? openArea
        ? { level: "places", areaId: openArea.id }
        : { level: "picks" }
      : level === "regions"
        ? { level: "regions" }
        : level === "areas"
          ? { level: "areas", region }
          : level === "places" || level === "near"
            ? { level: "places", areaId: area.id }
            : { level: "picks" },
  );
  const shownBackdrop = useLoadedImage(wantedBackdrop);
  // Safari's bands above and below the page take the map's own paper colour, and the map fades into them.
  const [tone, setTone] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    edgeTone(shownBackdrop, window.innerWidth, window.innerHeight).then((t) => {
      if (!live || !t) return;
      setTone(t);
      // v2: the paper shows only behind an open place; the rest of Home is the app's plain ground
      if (openRef.current) paintBrowserBands(t);
    });
    return () => {
      live = false;
    };
  }, [shownBackdrop]);
  const openRef = useRef(!!openId);
  openRef.current = !!openId;
  useEffect(() => {
    if (openId) {
      if (tone) paintBrowserBands(tone);
      return;
    }
    const ground = getComputedStyle(document.documentElement).getPropertyValue("--bg-app").trim();
    if (ground) paintBrowserBands(ground);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on opening and closing a place
  }, [!!openId]);
  const mapPlaces = useMemo(
    () =>
      level === "near"
        ? (near?.places.map((p) => ({
            id: p.id,
            name: p.name,
            point: p.point,
            tourism: tourismOfId(p.id),
          })) ?? [])
        : inPicks
          ? (pick?.stops.map((st) => ({
              id: st.place.id,
              name: st.place.name,
              point: {
                lat: st.place.coordinates.lat,
                lng: st.place.coordinates.lng,
              },
              tourism: tourismOfId(st.place.id),
            })) ?? [])
          : placeList.map((p) => ({ id: p.id, name: p.name, point: p.point, tourism: tourismOfId(p.id) })),
    [inPicks, pick, placeList, level, near],
  );
  // one array per region, so the map's markers are not rebuilt (and its frame loop restarted) on every render
  const areaOrder = useMemo(() => areaList.map((a) => a.id), [areaList]);
  const narrow = useNarrow();
  // the badges stay below the crumb: its real bottom in the map card, measured (it wraps, and the text size changes)
  const crumbRef = useRef<HTMLDivElement>(null);
  const [crumbBottom, setCrumbBottom] = useState(0);
  // and where the tool rail ends, so a region's area badges can use the room under it
  const [railBottom, setRailBottom] = useState(0);
  const showCrumb = !routeMode && !openId;
  useLayoutEffect(() => {
    const el = crumbRef.current;
    const card = el?.parentElement;
    const rail = card?.querySelector<HTMLElement>('[role="toolbar"]');
    if (!showCrumb || !el || !card) {
      setCrumbBottom(0);
      setRailBottom(0);
      return undefined;
    }
    const measure = () => {
      setCrumbBottom(el.offsetTop + el.offsetHeight);
      setRailBottom(rail ? Math.round(rail.getBoundingClientRect().bottom - card.getBoundingClientRect().top) : 0);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    if (rail) ro?.observe(rail);
    return () => ro?.disconnect();
  }, [showCrumb]);


  // Enter (the ↵ key, or the keyboard's Enter): open what the deck has selected; in a place's notebook, the next page
  const book = useRef<BookControls | null>(null);
  const enter = () => {
    if (openId) return book.current?.turn(1);
    if (level === "regions") enterRegion(region);
    else if (level === "areas") enterArea(area.id);
    else if (level === "places" && (deckPlace ?? place)) openPlace((deckPlace ?? place)!.id);
    else if (level === "picks" && pick) go({ lvl: "pick", k: pick.id });
    else if (level === "pick" && stop) openPlace(stop.place.id);
    else if (level === "near" && nearSel) enterNear(nearSel.id);
  };
  const enterLabel = openId
    ? "Next page"
    : level === "regions"
      ? `Enter ${regionName}`
      : level === "areas"
        ? `Enter ${area.name}`
        : level === "picks"
          ? `Open ${pick?.title ?? "pick"}`
          : level === "near"
            ? `Open ${nearSel?.kind === "pick" ? nearSel.pick.title : (nearSel?.place.name ?? "place")}`
            : `Open ${(level === "pick" ? stop?.place.name : place?.name) ?? "place"}`;
  const enterRef = useRef(enter);
  enterRef.current = enter;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== "Enter" ||
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      // only when nothing that takes Enter itself has focus
      const t = e.target instanceof Element ? e.target : null;
      if (
        t &&
        t !== document.body &&
        t.closest(
          'button, a, input, textarea, select, [role="slider"], [tabindex], [contenteditable], [role="dialog"] [data-no-flip]',
        )
      )
        return;
      e.preventDefault();
      enterRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const keys = (
    <MapToolbar
      layout={openId ? "row" : "rail"}
      // ↩ is the one back key (owner, 1 Nov 2026: it replaces the one at the top left): out of a place, else up a level
      canUndo={!!openId || (level !== "regions" && !routeMode)}
      undoLabel={openId ? "Back to the map" : upLabel}
      onEnter={enter}
      canEnter={!routeMode}
      enterLabel={enterLabel}
      locating={locating}
      onLocate={locate}
      onUndo={openId ? closePlace : up}
      onPickArea={pickArea}
      onPickPlace={pickPlace}
      picksOn={isPickLevel(level)}
      onPicks={() =>
        isPickLevel(level) ? go({ lvl: "regions" }) : go({ lvl: "picks" })
      }
      picks={picks}
      onPickPick={(id) => go({ lvl: "pick", k: id })}
      onSearchOpen={() =>
        void loadPicks().then((m) =>
          setLoadedPicks((had) => had ?? m.editorPicks(localToday())),
        )
      }
    />
  );

  return (
    // One screen with a deck that reaches the screen edges: bleeds past the column on purpose.
    <div className={openId ? `${styles.home} ${styles.homeOpen}` : styles.home} data-allow-bleed style={tone ? ({ "--tone": tone } as React.CSSProperties) : undefined}>
      {/* the deck's own map; the old one fades out once the new one has loaded (v2: only behind an open place) */}
      <AnimatePresence initial={false}>
        <motion.div
          key={shownBackdrop}
          className={openId ? styles.backdrop : `${styles.backdrop} ${styles.backdropIdle}`}
          style={{ backgroundImage: `url(${shownBackdrop})` }}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, delay: 0.25 } }}
          transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
        />
      </AnimatePresence>
      <h1 className={styles.srOnly}>Explore Singapore</h1>
      {!openId && (
        <>
        {/* v2: the bar and the chips stay at the top while Home scrolls under them */}
        <div className={styles.head}>
          <PageBar
            title="Home"
            tone="light"
            heading={false}
            className={styles.pageBar}
          />
          {bar}
        </div>
          {top}
        </>
      )}

      {/* The map card stays mounted when a place opens: it becomes the live 3D view on top of the intro (no reload).
          With the keys it is one piece, like a phone: the map as its screen, the keys in its rounded bottom. With a
          place open the same leather board holds the notebook, with the keys still in its foot (the wrappers are
          always there, and step aside while no place is open, so the map is never mounted again). */}
      <div className={openId ? styles.board : styles.boardIdle}>
        <div className={openId ? styles.boardBook : styles.boardIdle}>
        <div
          ref={deviceRef}
          className={
            openId
              ? `${styles.device} ${styles.deviceOpen}${mapAway ? ` ${styles.mapAway}` : ""}`
              : styles.device
          }
          aria-hidden={(openId && mapAway) || undefined}
          {...{ inert: openId && mapAway ? "" : undefined }}
          style={openId ? undefined : ({ "--grow": grow } as React.CSSProperties)}
        >
          {!openId && (
            <button
              type="button"
              className={styles.grip}
              aria-label={tall ? "Smaller map" : "Bigger map"}
              aria-expanded={tall}
              onClick={() => {
                if (!gripDragged.current) setTall(!tall);
              }}
              {...gripProps}
            />
          )}
          <div
            className={
              openId ? `${styles.mapCard} ${styles.mapHero}` : styles.mapCard
            }
          >
            {routeMode && pick && !openId ? (
              <PickRoute
                pick={pick}
                visited={visited}
                onClose={() => go({ route: false })}
              />
            ) : (
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
                  level={openId && level !== "near" ? "places" : level}
                  region={openId ? (openArea?.region ?? region) : region}
                  areaId={openId ? (openArea?.id ?? area.id) : area.id}
                  areaOrder={areaOrder}
                  places={mapPlaces}
                  selectedPlaceId={
                    openId ??
                    (level === "places"
                      ? (deckPlace ?? place)?.id
                      : level === "pick"
                        ? (deckStop ?? stop)?.place.id
                        : level === "near"
                          ? nearSel?.kind === "pick"
                            ? nearSel.stopId
                            : nearSel?.id
                          : undefined)
                  }
                  numbered={isPickLevel(level) && pick?.kind === "walk"}
                  path={pick?.kind === "walk"}
                  visited={visited}
                  label={`Map of Singapore's planning areas. ${title}.`}
                  onPickRegion={(id) => enterRegion(id)}
                  onPickArea={(id) => enterArea(id)}
                  onPickPlace={(id) => openPlace(id)}
                  here={level === "near" ? (here ?? undefined) : undefined}
                  sky={openId ? sky : undefined}
                  category={category}
                  insetRight={narrow ? RAIL_W_NARROW : RAIL_W}
                  insetTop={crumbBottom ? crumbBottom + 6 : 6}
                  railBottom={railBottom || undefined}
                />
              </Suspense>
            )}
            {openId && (
              // the way back is the ↩ key in the row below, which stays while the pages turn
              <div className={`${styles.mapTop} ${styles.mapTopEnd}`}>
                <SkyControls sky={sky} onChange={setSky} />
              </div>
            )}
            {showCrumb && (
              <div ref={crumbRef} className={styles.mapTop}>
                <div className={styles.crumbBox}>
                  <span className={styles.dots} aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className={
                          d <= DEPTH[level] ? styles.dotOn : styles.dot
                        }
                      />
                    ))}
                  </span>
                  <p className={styles.crumbs} aria-label="Where you are">
                    {crumbs.join(" › ")}
                  </p>
                </div>
                {level === "pick" &&
                  pick?.kind === "walk" &&
                  !!pick.links?.length && (
                    <button
                      type="button"
                      className={styles.routeKey}
                      onClick={() => go({ route: true })}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h4M18 9v6a4 4 0 0 1-4 4h-4" />
                      </svg>
                      2D route
                    </button>
                  )}
              </div>
            )}
            {!openId && (
              <div className={styles.shelfSlot}>
                {!routeMode && shelf && shelf.items.length > 0 && (
                  <MapShelf label={shelf.label} items={shelf.items} currentId={shelf.current} onPick={onShelf} />
                )}
                <MapNotice>{routeMode ? undefined : notice}</MapNotice>
              </div>
            )}
            {!openId && !routeMode && keys}
            {!routeMode && !openId && (
              <details className={styles.credits}>
                <summary>Map data · OneMap</summary>
                <p>
                  Street map:{" "}
                  <a
                    href={ONEMAP_CREDIT.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ONEMAP_CREDIT.text}
                  </a>
                  . Planning areas: {URA_SOURCE.title}, {URA_SOURCE.publisher} (
                  {URA_SOURCE.licence}). {URA_SOURCE.note}
                </p>
              </details>
            )}
          </div>
        </div>
        {openId && (
          <Suspense fallback={null}>
            <AnimatePresence mode="popLayout">
              <PlaceIntro
                key="intro"
                placeId={openId}
                distance={homeOf(openId)?.distance}
                onClose={closePlace}
                onTurn={onIntroTurn}
                book={book}
                deck={openDeck}
              />
            </AnimatePresence>
          </Suspense>
        )}
        </div>
        {openId && <div className={styles.keysOpen}>{keys}</div>}
      </div>

      {/* v2 (owner, 8 Nov 2026): no card deck under the map; the map itself drills down. The level's name stays for
          screen readers. */}
      <h2 className={styles.srOnly}>{title}</h2>
      {!openId && bottom}
    </div>
  );
}
