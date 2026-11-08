// The journal's days, worked out from the stores on every change (places visited, Home check-ins, Hunt stamps and
// finished stories, and your photos). Shared by the Moments journal and the Passport's journal carousel.
import { useEffect, useMemo, useState } from "react";
import { buildDays, dayOfTime, type JournalDay, type JournalEntry, type Picture } from "../../../data/journal/journal";
import { listPhotos, onPhotosChanged, photoTime, type JournalPhoto } from "../../../data/journal/photos";
import { areaName, placeNamed } from "../../../data/journal/placePhotos";
import { placePicture } from "../../../data/home/nearbyCards";
import { usePersistentStore } from "../../../data/persistentStore";
import { placeStoriesStore } from "../../../data/stores";
import { storyPlace } from "../../../data/stories/places";
import { useExplorePersonal } from "../../../features/nearby/actions";
import { curatedPlace } from "../../../features/nearby/catalogue";
import type { CuratedPlace } from "../../../features/nearby/domain";
import { chapters, shortChapter, type Chapter } from "../../HuntPage/notebook/chapters";
import { storyRecords, took } from "../../HuntPage/notebook/record";

export type Shot = JournalPhoto & { url: string };

/** The element id of a day in the Moments journal, for links such as /moments#day-2026-11-07. */
export const dayAnchor = (day: string) => `day-${day}`;

/** Photos from the device store, with an object URL each (revoked when the list changes or the page leaves). */
export function usePhotos(): Shot[] {
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
export function placePic(place: CuratedPlace | undefined): Picture | undefined {
  if (!place) return undefined;
  const p = placePicture(place);
  if (!p.src || (p.kind !== "card" && p.kind !== "photo")) return undefined;
  return { src: p.src, kind: "photo", credit: p.credit };
}

export const pinOf = (place: CuratedPlace | undefined) =>
  place
    ? { lat: place.coordinates.lat, lng: place.coordinates.lng }
    : undefined;

/** Every journal day, newest first, and the photos they were built from. */
export function useJournalDays(): { days: JournalDay[]; photos: Shot[] } {
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
  return { days, photos };
}
