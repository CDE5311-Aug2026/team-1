import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  buildDays,
  clockOf,
  dayOfTime,
  dayParts,
  type JournalDay,
  type JournalEntry,
  type Picture,
} from "../../../data/journal/journal";
import {
  addPhoto,
  deletePhoto,
  listPhotos,
  onPhotosChanged,
  photoTime,
  updatePhoto,
  type JournalPhoto,
} from "../../../data/journal/photos";
import { areaName, placeNamed } from "../../../data/journal/placePhotos";
import { framesOf, type Frame } from "../../../data/journal/travelogue";
import { groundCrop, placePicture } from "../../../data/home/nearbyCards";
import { usePersistentStore } from "../../../data/persistentStore";
import { placeStoriesStore } from "../../../data/stores";
import { storyPlace } from "../../../data/stories/places";
import { useExplorePersonal } from "../../../features/nearby/actions";
import { curatedPlace } from "../../../features/nearby/catalogue";
import type { CuratedPlace } from "../../../features/nearby/domain";
import CityMap, { MAP_ATTRIBUTION, OneMapCredit } from "../../../features/nearby/map/CityMap";
import { localToday } from "../../../features/nearby/personal";
import { showToast } from "../../../hooks/useToast";
import groundUrl from "../../../assets/nearby/sg-ground.webp";
import {
  chapters,
  shortChapter,
  type Chapter,
} from "../../HuntPage/notebook/chapters";
import { storyRecords, took } from "../../HuntPage/notebook/record";
import Icon from "../../OnboardingPage/v3/icons";
import Sheet from "../Sheet/Sheet";
import Travelogue from "../Travelogue/Travelogue";
import styles from "./Journal.module.css";

const SHOWN = 4;
/** Cards shown per day before "Show all". */
const ENTRIES = 4;
const PLACE_KINDS = new Set(["visit", "checkin", "stamp"]);

type Shot = JournalPhoto & { url: string };
/** Where a new photo goes: its day, and the place and time it was taken at when it is added from a place's card. */
interface Preset {
  day: string;
  place?: string;
  at?: number;
}
/** A place you can file a photo under, by day. */
type PlaceOption = { id: string; title: string };

/** Photos from the device store, with an object URL each (revoked when the list changes or the page leaves). */
function usePhotos(): Shot[] {
  const [photos, setPhotos] = useState<Shot[]>([]);
  useEffect(() => {
    let live = true;
    let urls: string[] = [];
    const load = () =>
      listPhotos().then((list) => {
        if (!live) return;
        urls.forEach((u) => URL.revokeObjectURL(u));
        const next = list.map((p) => ({
          ...p,
          url: URL.createObjectURL(p.blob),
        }));
        urls = next.map((p) => p.url);
        setPhotos(next);
      });
    load();
    const off = onPhotosChanged(load);
    return () => {
      live = false;
      off();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);
  return photos;
}

/** A published place's picture: its card photo or a real photo of it. Never the 3D model view (owner, 2 Nov 2026:
 *  "no building renders here"); a place without a photo shows the map around it. */
function placePic(place: CuratedPlace | undefined): Picture | undefined {
  if (!place) return undefined;
  const p = placePicture(place);
  if (!p.src || (p.kind !== "card" && p.kind !== "photo")) return undefined;
  return { src: p.src, kind: "photo", credit: p.credit };
}

const pinOf = (place: CuratedPlace | undefined) =>
  place
    ? { lat: place.coordinates.lat, lng: place.coordinates.lng }
    : undefined;

/** "16:40" on `day` as a time, or undefined for an empty field. */
const timeOn = (day: string, hm: string) =>
  hm ? new Date(`${day}T${hm}:00`).getTime() : undefined;
const hmOf = (at?: number) => (at === undefined ? "" : clockOf(at));

/**
 * A day-by-day field journal (1 Nov 2026; places in full, 2 Nov): for each day you explored, the date, the places as
 * prints, a map of the day with the places joined in the order you went, and a card for each place with its picture
 * (your own photo of it, a real photo, the hunt's film still or the 3D view). The map, the prints and the cards move
 * together: pick a place on one and the others show it. Your photos can be filed under a place, moved to another day
 * or time, retitled and replaced.
 */
export default function Journal({ onSnap }: { onSnap?: () => void } = {}) {
  const personal = useExplorePersonal();
  const [stories] = usePersistentStore(placeStoriesStore);
  const photos = usePhotos();
  const records = useMemo(() => storyRecords(), []);
  const books = useMemo(() => {
    const out = new Map<string, Chapter>();
    try {
      for (const ch of [...chapters(), shortChapter()]) out.set(ch.routeId, ch);
    } catch {
      // the hunt's books did not load: stamps keep their names
    }
    return out;
  }, []);
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState<{
    file: File;
    url: string;
    preset: Preset;
  } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const today = localToday();

  const days = useMemo(() => {
    const out: JournalEntry[] = [];
    for (const p of personal.places) {
      if (!p.visited || !p.visitedOn) continue;
      const place = curatedPlace(p.placeKey);
      if (place) {
        const area = areaName(place);
        out.push({
          id: `v-${p.placeKey}`,
          kind: "visit",
          day: p.visitedOn,
          title: place.name,
          note: area ?? "",
          tag: place.kind,
          real: (() => {
            const pic = placePic(place);
            return pic ? { src: pic.src, credit: pic.credit ?? "" } : undefined;
          })(),
          picture: placePic(place),
          area,
          place: `v-${p.placeKey}`,
          pin: pinOf(place),
          detail: place.summary,
        });
      }
    }
    for (const [id, s] of Object.entries(stories)) {
      if (!s.stamped || !s.stampedOn) continue;
      const place = storyPlace(id);
      if (!place) continue;
      const at = placeNamed(place.name);
      const credit = place.hero.credit.replace(/^Photos?: /, "");
      out.push({
        id: `c-${id}`,
        kind: "checkin",
        day: s.stampedOn,
        title: place.name,
        note: place.location,
        tag: "Check-in",
        image: place.hero.src,
        real: { src: place.hero.src, credit },
        picture: { src: place.hero.src, kind: "photo", credit },
        area: areaName(at),
        place: `c-${id}`,
        pin: pinOf(at),
        detail: place.cards.map((c) => c.title).join(" · "),
      });
    }
    for (const r of records) {
      const book = books.get(r.id);
      for (const st of r.stamps) {
        if (st.at <= 0) continue;
        const at = placeNamed(st.name);
        const stop = book?.stops.find((s) => s.id === st.stop);
        const still = stop?.films[0]?.poster;
        const real = at ? placePic(at) : undefined;
        const found = stop?.discovery;
        out.push({
          id: `s-${r.id}-${st.stop}`,
          kind: "stamp",
          day: dayOfTime(st.at),
          at: st.at,
          title: st.name,
          note: r.title,
          tag: "Hunt stamp",
          image: book?.image,
          real: real?.kind === "photo" ? { src: real.src, credit: real.credit ?? "" } : undefined,
          picture: still
            ? { src: still, kind: "still", credit: `From ${r.title}` }
            : (real ?? (book?.image ? { src: book.image, kind: "still", credit: `From ${r.title}` } : undefined)),
          area: areaName(at) ?? r.place,
          place: `s-${r.id}-${st.stop}`,
          pin: stop?.pin ? { lat: stop.pin.lat, lng: stop.pin.lng } : pinOf(at),
          detail: found
            ? found.text.startsWith(found.title)
              ? found.text
              : `${found.title}. ${found.text}`
            : undefined,
        });
      }
      if (r.finished && r.finishedAt) {
        const t = took(r);
        out.push({
          id: `f-${r.id}`,
          kind: "finish",
          day: dayOfTime(r.finishedAt),
          at: r.finishedAt,
          title: `Finished ${r.title}`,
          note: t ? `${r.place} · solved in ${t}` : r.place,
          tag: "Story",
          image: book?.image,
          picture: book?.image ? { src: book.image, kind: "still", credit: `From ${r.title}` } : undefined,
          detail: book?.ending ? `${book.ending.title}. ${book.ending.text}` : undefined,
        });
      }
    }
    for (const p of photos)
      out.push({
        id: `p-${p.id}`,
        kind: "photo",
        day: p.day,
        at: photoTime(p, dayOfTime),
        title: p.caption || "A photo",
        note: "",
        tag: "Photo",
        image: p.url,
        photoId: p.id,
        place: p.place,
        picture: { src: p.url, kind: "own" },
      });
    return buildDays(out);
  }, [personal.places, stories, records, books, photos]);

  // the places of each day, to file a photo under
  const placesOn = (day: string): PlaceOption[] => {
    const d = days.find((x) => x.day === day);
    const seen = new Set<string>();
    return (d?.entries ?? []).flatMap((e) =>
      PLACE_KINDS.has(e.kind) && e.place && !seen.has(e.place) && seen.add(e.place)
        ? [{ id: e.place, title: e.title }]
        : [],
    );
  };

  const pick = (preset: Preset) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setAdding({ file, url: URL.createObjectURL(file), preset });
  };
  const closeAdd = () => {
    if (adding) URL.revokeObjectURL(adding.url);
    setAdding(null);
  };

  const shown = all ? days : days.slice(0, SHOWN);
  const photo = viewing ? photos.find((p) => p.id === viewing) : undefined;
  const sharingDay = sharing ? days.find((d) => d.day === sharing) : undefined;

  return (
    <section className={styles.journal} aria-labelledby="journal-title">
      <div className={styles.head}>
        <h2 id="journal-title">Journal</h2>
        <span className={styles.tools}>
          {onSnap && (
            <button
              type="button"
              className={styles.add}
              onClick={onSnap}
              aria-label="Snap a moment with the camera"
              title="Snap a moment"
            >
              <Icon name="camera" size={20} />
            </button>
          )}
          {/* a label around the input: iOS Safari only opens its picker for a real tap on the file input */}
          <label className={styles.add} title="Add a photo">
            <Icon name="gallery" size={20} />
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              aria-label="Add a photo"
              onChange={pick({ day: today })}
            />
          </label>
        </span>
      </div>

      {days.length === 0 ? (
        <Day
          day={{
            day: today,
            entries: [],
            stats: { places: 0, stamps: 0, photos: 0 },
          }}
          onView={setViewing}
          onPick={pick}
        />
      ) : (
        shown.map((d) => (
          <Day
            key={d.day}
            day={d}
            onView={setViewing}
            onPick={pick}
            onShare={d.entries.length ? () => setSharing(d.day) : undefined}
          />
        ))
      )}
      {days.length > SHOWN && (
        <button
          type="button"
          className={styles.more}
          onClick={() => setAll((v) => !v)}
        >
          {all
            ? "Show fewer days"
            : `Show ${days.length - SHOWN} earlier ${days.length - SHOWN === 1 ? "day" : "days"}`}
        </button>
      )}

      {adding && (
        <PhotoSheet
          mode="add"
          src={adding.url}
          preset={adding.preset}
          today={today}
          placesOn={placesOn}
          onSave={async (v) => {
            const ok = await addPhoto(adding.file, v.day, v.caption, Date.now(), {
              taken: v.taken,
              place: v.place,
            });
            if (!ok) {
              showToast("Photo not saved: storage is full or private browsing is on");
              return false;
            }
            showToast("Added to your journal");
            return true;
          }}
          onClose={closeAdd}
        />
      )}
      {photo && (
        <PhotoSheet
          mode="edit"
          src={photo.url}
          preset={{ day: photo.day, place: photo.place, at: photoTime(photo, dayOfTime) }}
          caption={photo.caption}
          today={today}
          placesOn={placesOn}
          onSave={async (v) => {
            const ok = await updatePhoto(photo.id, {
              caption: v.caption,
              day: v.day,
              taken: v.taken ?? null,
              place: v.place ?? null,
              file: v.file,
            });
            if (!ok) {
              showToast("Change not saved: storage is full or private browsing is on");
              return false;
            }
            showToast("Photo updated");
            return true;
          }}
          onRemove={async () => {
            await deletePhoto(photo.id);
            showToast("Photo removed");
          }}
          onClose={() => setViewing(null)}
        />
      )}
      {sharingDay && (
        <Travelogue day={sharingDay} onClose={() => setSharing(null)} />
      )}
    </section>
  );
}

const FAN = [
  { x: 0, y: 0, r: -3 },
  { x: 16, y: -6, r: 5 },
  { x: -14, y: -10, r: -9 },
  { x: 22, y: -14, r: 10 },
  { x: -6, y: -18, r: -14 },
];

/**
 * The day's places as a fan of prints in 3D: swipe the top one away to see the next (it slides to the back, and the
 * map and the cards show its place), tap it to make the day's travelogue. A place picked elsewhere comes to the top.
 */
function PhotoStack({
  frames,
  label,
  top,
  onTop,
  onOpen,
}: {
  frames: Frame[];
  label: string;
  /** The frame to show on top (the picked place). */
  top?: string;
  onTop?: (id: string) => void;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const n = frames.length;
  const [order, setOrder] = useState(() => frames.map((_, i) => i));
  useEffect(() => setOrder(frames.map((_, i) => i)), [frames]);
  useEffect(() => {
    const i = frames.findIndex((f) => f.id === top);
    if (i < 0) return;
    setOrder((o) => {
      if (o[0] === i) return o;
      const k = o.indexOf(i);
      return k < 0 ? o : [...o.slice(k), ...o.slice(0, k)];
    });
  }, [top, frames]);
  // a drag that ends on the card must not also open the studio
  const dragged = useRef(0);
  const fling = (_: unknown, info: PanInfo) => {
    dragged.current = Date.now();
    if (Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 450)
      setOrder((o) => {
        const next = [...o.slice(1), o[0]];
        const f = frames[next[0]];
        if (f) onTop?.(f.id);
        return next;
      });
  };
  const open = () => {
    if (Date.now() - dragged.current > 300) onOpen();
  };
  return (
    <div className={styles.stack} role="group" aria-label={label}>
      {frames.map((f, i) => {
        const depth = order.indexOf(i);
        const fan = FAN[Math.min(depth, FAN.length - 1)];
        const first = depth === 0;
        return (
          <motion.button
            key={f.id}
            type="button"
            className={styles.polaroid}
            style={{ zIndex: n - depth, touchAction: "pan-y" }}
            tabIndex={first ? 0 : -1}
            aria-hidden={!first}
            aria-label={
              first ? `${f.title}. Make a travelogue of this day` : undefined
            }
            initial={
              reduce
                ? false
                : { x: 0, y: 30, rotate: 0, scale: 0.9, opacity: 0 }
            }
            animate={{
              x: fan.x,
              y: fan.y,
              rotate: fan.r,
              scale: 1 - Math.min(depth, 4) * 0.045,
              opacity: depth < FAN.length ? 1 : 0,
              rotateY: first ? 0 : depth % 2 ? -8 : 8,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
              delay: reduce ? 0 : Math.min(depth, 4) * 0.06,
            }}
            drag={first && n > 1 ? "x" : false}
            dragSnapToOrigin
            dragElastic={0.7}
            whileDrag={{ scale: 1.04, rotate: 0, cursor: "grabbing" }}
            onDragStart={() => (dragged.current = Date.now())}
            onDragEnd={fling}
            onTap={first ? open : undefined}
          >
            <img src={f.src} alt="" draggable={false} />
            <span>{f.title}</span>
          </motion.button>
        );
      })}
      {n > 1 && (
        <span className={styles.count} aria-hidden="true">
          {order[0] + 1}/{n}
        </span>
      )}
    </div>
  );
}

/** A card's picture: your photo, the place's photo, a film still or its 3D view; the ground map only as a last resort. */
function Pic({ pic, pin, big = false }: { pic?: Picture; pin?: { lat: number; lng: number }; big?: boolean }) {
  if (pic) return <img src={pic.src} alt="" loading="lazy" draggable={false} />;
  if (pin)
    return (
      <span
        className={styles.ground}
        style={{ backgroundImage: `url(${groundUrl})`, ...groundCrop(pin, big ? 2400 : 1600) }}
        aria-hidden="true"
      >
        <i />
      </span>
    );
  return <Icon name="pin" size={big ? 28 : 18} />;
}

const KIND_CREDIT: Record<Picture["kind"], string> = {
  own: "Your photo",
  photo: "Photo",
  still: "From the hunt",
};

function Day({
  day,
  onView,
  onPick,
  onShare,
}: {
  day: JournalDay;
  onView: (id: string) => void;
  onPick: (preset: Preset) => (e: ChangeEvent<HTMLInputElement>) => void;
  onShare?: () => void;
}) {
  const reduce = useReducedMotion();
  const { num, month, weekday } = dayParts(day.day);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  // the cards: every place, story and photo of the day, except photos filed under a place shown that day (those sit
  // on their place's card); places with a pin are numbered in the order of the day, as on the map
  const { cards, mine } = useMemo(() => {
    const placeIds = new Set(
      day.entries.flatMap((e) => (PLACE_KINDS.has(e.kind) && e.place ? [e.place] : [])),
    );
    const mine = new Map<string, JournalEntry[]>();
    for (const e of day.entries)
      if (e.kind === "photo" && e.place && placeIds.has(e.place))
        mine.set(e.place, [...(mine.get(e.place) ?? []), e]);
    const seen = new Set<string>();
    let n = 0;
    const cards = day.entries.flatMap((e) => {
      if (e.kind === "photo" && e.place && placeIds.has(e.place)) return [];
      // one card per place (two stamps at one stop are one place)
      if (e.place && PLACE_KINDS.has(e.kind)) {
        if (seen.has(e.place)) return [];
        seen.add(e.place);
      }
      return [{ e, n: e.pin && PLACE_KINDS.has(e.kind) ? ++n : undefined }];
    });
    return { cards, mine };
  }, [day.entries]);
  const picOf = (e: JournalEntry): Picture | undefined => {
    const own = e.place ? mine.get(e.place) : undefined;
    return own?.length ? own[own.length - 1].picture : e.picture;
  };
  const keyOf = (e: JournalEntry) => e.place ?? e.id;

  const located = cards.filter((c) => c.n !== undefined);
  // the map is drawn afresh, fitted to the day's places, whenever they change (no glide from an older view)
  const placesKey = located.map((c) => c.e.id).join("|");
  const focus = useMemo(
    () => ({ id: 1, points: located.map((c) => c.e.pin!) }),
    // the day's places, not their pictures
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placesKey],
  );
  const frames = useMemo(() => {
    const out: Frame[] = [];
    const seen = new Set<string>();
    for (const { e } of cards) {
      const pic = picOf(e);
      if (!pic || seen.has(pic.src)) continue;
      seen.add(pic.src);
      out.push({ id: keyOf(e), src: pic.src, title: e.kind === "finish" ? e.title.replace(/^Finished /, "") : e.title, own: pic.kind === "own" });
    }
    if (out.length) return out.slice(0, 8);
    const real = framesOf(day, 5);
    return real;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, mine, day]);

  const choose = (key: string, from: "map" | "card" | "print") => {
    const next = from === "card" && sel === key ? null : key;
    setSel(next);
    if (!next || from === "card") return;
    const i = cards.findIndex((c) => keyOf(c.e) === next);
    if (i >= ENTRIES) setOpen(true);
    requestAnimationFrame(() =>
      document
        .getElementById(`card-${day.day}-${next}`)
        ?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }),
    );
  };

  const areas = [
    ...new Set(day.entries.flatMap((e) => (e.area ? [e.area] : []))),
  ];
  const tally = [
    [day.stats.places, "place", "places"],
    [day.stats.stamps, "stamp", "stamps"],
    [day.stats.photos, "photo", "photos"],
  ] as const;
  const shown = open ? cards : cards.slice(0, ENTRIES);
  return (
    <article className={styles.day}>
      <div className={styles.top}>
        <div className={styles.side}>
          <p className={styles.date}>
            <b>{num}</b>
            <span>{month}</span>
            <small>{weekday}</small>
          </p>
          {areas.length > 0 && (
            <p className={styles.areas}>
              {areas.slice(0, 3).map((a) => (
                <span key={a}>{a}</span>
              ))}
            </p>
          )}
          {day.entries.length > 0 && (
            <dl className={styles.tally}>
              {tally
                .filter(([n]) => n > 0)
                .map(([n, one, many]) => (
                  <div key={one}>
                    <dt>{n}</dt>
                    <dd>{n === 1 ? one : many}</dd>
                  </div>
                ))}
            </dl>
          )}
          {onShare && (
            <button
              type="button"
              className={styles.shareDay}
              onClick={onShare}
              aria-label={`Share ${weekday} ${num} ${month} as a travelogue`}
            >
              <Icon name="share" size={20} />
            </button>
          )}
        </div>
        {frames.length > 0 && (
          <PhotoStack
            frames={frames}
            label={`Places of ${weekday} ${num} ${month}`}
            top={sel ?? undefined}
            onTop={(id) => choose(id, "print")}
            onOpen={onShare ?? (() => undefined)}
          />
        )}
      </div>
      <div className={styles.log}>
        {located.length > 0 && (
          <figure className={styles.map}>
            <CityMap
              key={placesKey}
              label={`Map of ${weekday} ${num} ${month}: ${located.length} ${located.length === 1 ? "place" : "places"} in the order you went`}
              height={200}
              // the day's places fit left of the zoom buttons (a pin under them is hidden) and above the credit
              insets={{ top: 8, left: 76, right: 44, bottom: 44 }}
              attribution="hidden"
              pins={located.map(({ e, n }) => ({
                key: keyOf(e),
                name: `${n}. ${e.title}`,
                location: e.pin!,
                category: "culture",
                visited: true,
                label: String(n),
              }))}
              path={located.length > 1 ? located.map((c) => c.e.pin!) : undefined}
              clusterPins={false}
              selectedKey={sel ?? undefined}
              onSelect={(key) => choose(key, "map")}
              focus={focus}
            />
            {/* the map's credits, under it (on it they would sit over the day's places) */}
            <figcaption className={styles.credit}>
              {MAP_ATTRIBUTION} · <OneMapCredit />
            </figcaption>
          </figure>
        )}
        <ol className={styles.cards}>
          {cards.length === 0 && (
            <li className={styles.card}>
              <span className={styles.thumb}>
                <Icon name="pin" size={18} />
              </span>
              <span className={styles.body}>
                <b>Nothing logged yet</b>
                <span>Check in at a place, or add a photo of today.</span>
              </span>
            </li>
          )}
          {shown.map(({ e, n }, i) => {
            const key = keyOf(e);
            const pic = picOf(e);
            const isOpen = sel === key;
            const own = e.place ? (mine.get(e.place) ?? []) : [];
            const lone = e.kind === "photo";
            return (
              <motion.li
                key={e.id}
                id={`card-${day.day}-${key}`}
                className={isOpen ? `${styles.card} ${styles.open}` : styles.card}
                initial={reduce ? false : { opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "0px 0px -24px 0px" }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 26,
                  delay: (i % ENTRIES) * 0.05,
                }}
              >
                <button
                  type="button"
                  className={styles.row}
                  aria-expanded={lone ? undefined : isOpen}
                  onClick={() => (lone && e.photoId ? onView(e.photoId) : choose(key, "card"))}
                >
                  <span className={styles.thumb}>
                    <Pic pic={pic} pin={e.pin} />
                    {n !== undefined && <i className={styles.num}>{n}</i>}
                  </span>
                  <span className={styles.body}>
                    <b>{e.title}</b>
                    {e.note && <span>{e.note}</span>}
                    <small>
                      {e.tag}
                      {e.at !== undefined && <time> · {clockOf(e.at)}</time>}
                      {own.length > 0 && ` · ${own.length} ${own.length === 1 ? "photo" : "photos"}`}
                    </small>
                  </span>
                </button>
                {isOpen && !lone && (
                  <motion.div
                    className={styles.more2}
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <figure className={styles.print}>
                      <Pic pic={pic} pin={e.pin} big />
                      {pic && <figcaption>{pic.kind === "own" ? KIND_CREDIT.own : pic.credit || KIND_CREDIT[pic.kind]}</figcaption>}
                    </figure>
                    {e.detail && <p className={styles.detail}>{e.detail}</p>}
                    {PLACE_KINDS.has(e.kind) && (
                      <div className={styles.shots}>
                        {own.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={styles.shot}
                            onClick={() => p.photoId && onView(p.photoId)}
                            aria-label={`Edit your photo: ${p.title}`}
                          >
                            <img src={p.image} alt="" />
                          </button>
                        ))}
                        <label className={styles.addShot} title="Add your photo of this place">
                          <Icon name="camera" size={20} />
                          <input
                            className={styles.file}
                            type="file"
                            accept="image/*"
                            aria-label={`Add your photo of ${e.title}`}
                            onChange={onPick({ day: day.day, place: e.place, at: e.at })}
                          />
                        </label>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>
      {cards.length > ENTRIES && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : `Show all ${cards.length}`}
          <Icon
            name="chevron"
            size={16}
            style={{ transform: `rotate(${open ? -90 : 90}deg)` }}
          />
        </button>
      )}
      {day.from !== undefined && day.to !== undefined && (
        <p className={styles.span}>
          <Icon name="clock" size={14} />
          {clockOf(day.from) === clockOf(day.to)
            ? clockOf(day.from)
            : `${clockOf(day.from)} – ${clockOf(day.to)}`}
        </p>
      )}
    </article>
  );
}

interface PhotoValues {
  caption: string;
  day: string;
  taken?: number;
  place?: string;
  file?: File;
}

/** Add a photo, or change one you kept: its caption, day, time, the place it shows and the picture itself. */
function PhotoSheet({
  mode,
  src,
  preset,
  caption: caption0 = "",
  today,
  placesOn,
  onSave,
  onRemove,
  onClose,
}: {
  mode: "add" | "edit";
  src: string;
  preset: Preset;
  caption?: string;
  today: string;
  placesOn: (day: string) => PlaceOption[];
  onSave: (v: PhotoValues) => Promise<boolean>;
  onRemove?: () => Promise<void>;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(caption0);
  const [day, setDay] = useState(preset.day);
  // a new photo of today: now; one added to a place: that place's time; else as it was kept
  const [hm, setHm] = useState(() =>
    hmOf(preset.at ?? (mode === "add" && preset.day === today ? Date.now() : undefined)),
  );
  const [place, setPlace] = useState(preset.place ?? "");
  const [file, setFile] = useState<{ file: File; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url);
    },
    [file],
  );
  const listed = placesOn(day);
  // a photo moved to another day leaves a place it was not at
  const moveTo = (next: string) => {
    setDay(next);
    if (!placesOn(next).some((o) => o.id === place)) setPlace("");
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave({ caption, day: day || today, taken: timeOn(day || today, hm), place: place || undefined, file: file?.file });
    setSaving(false);
    if (ok) onClose();
  };
  const { num, month, weekday } = dayParts(day || today);
  return (
    <Sheet title={mode === "add" ? "Add to your journal" : caption0 || "Your photo"} onClose={onClose}>
      <div className={styles.sheetBody}>
        <div className={styles.previewBox}>
          <img className={styles.preview} src={file?.url ?? src} alt={caption || "Your photo"} />
          {mode === "edit" && (
            <label className={styles.replace} title="Replace the picture">
              <Icon name="gallery" size={18} />
              <input
                className={styles.file}
                type="file"
                accept="image/*"
                aria-label="Replace the picture"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setFile({ file: f, url: URL.createObjectURL(f) });
                }}
              />
            </label>
          )}
        </div>
        <label className={styles.field}>
          <span>Caption</span>
          <input
            value={caption}
            maxLength={80}
            placeholder="What was this?"
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <div className={styles.pair}>
          <label className={styles.field}>
            <span>Day</span>
            <input
              type="date"
              value={day}
              max={today}
              onChange={(e) => moveTo(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Time</span>
            <input type="time" value={hm} onChange={(e) => setHm(e.target.value)} />
          </label>
        </div>
        <label className={styles.field}>
          <span>Place</span>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">{listed.length ? "Not one of the day’s places" : `No places on ${weekday} ${num} ${month}`}</option>
            {listed.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.save} onClick={save} disabled={saving}>
          {saving ? "Saving…" : mode === "add" ? "Add to journal" : "Save changes"}
        </button>
        {onRemove && (
          <button
            type="button"
            className={confirm ? styles.danger : styles.ghost}
            onClick={async () => {
              if (!confirm) return setConfirm(true);
              await onRemove();
              onClose();
            }}
          >
            {confirm ? "Tap again to remove it" : "Remove photo"}
          </button>
        )}
      </div>
    </Sheet>
  );
}
