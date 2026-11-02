import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  buildDays,
  clockOf,
  dayOfTime,
  dayParts,
  type EntryKind,
  type JournalDay,
  type JournalEntry,
} from "../../../data/journal/journal";
import {
  addPhoto,
  deletePhoto,
  listPhotos,
  onPhotosChanged,
  type JournalPhoto,
} from "../../../data/journal/photos";
import { usePersistentStore } from "../../../data/persistentStore";
import { placeStoriesStore } from "../../../data/stores";
import { storyPlace } from "../../../data/stories/places";
import { useExplorePersonal } from "../../../features/nearby/actions";
import { curatedPlace } from "../../../features/nearby/catalogue";
import { localToday } from "../../../features/nearby/personal";
import { showToast } from "../../../hooks/useToast";
import { chapter } from "../../HuntPage/notebook/chapters";
import { storyRecords, took } from "../../HuntPage/notebook/record";
import Icon from "../../OnboardingPage/v3/icons";
import Sheet from "../Sheet/Sheet";
import styles from "./Journal.module.css";

const ICON: Record<EntryKind, Parameters<typeof Icon>[0]["name"]> = {
  visit: "pin",
  checkin: "flag",
  stamp: "badge",
  finish: "book",
  photo: "camera",
};
const SHOWN = 4;

/** Photos from the device store, with an object URL each (revoked when the list changes or the page leaves). */
function usePhotos(): (JournalPhoto & { url: string })[] {
  const [photos, setPhotos] = useState<(JournalPhoto & { url: string })[]>([]);
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

const huntImage = (id: string) => {
  try {
    return id === "short" ? undefined : chapter(id).image;
  } catch {
    return undefined;
  }
};

/**
 * A day-by-day field journal (1 Nov 2026): for each day you explored, the date, a print of the day (your own photo when
 * you added one) with the day's tally behind it, and a dark log of what you did, each with its tag.
 */
export default function Journal({ onSnap }: { onSnap?: () => void } = {}) {
  const personal = useExplorePersonal();
  const [stories] = usePersistentStore(placeStoriesStore);
  const photos = usePhotos();
  const records = useMemo(() => storyRecords(), []);
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [viewing, setViewing] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const days = useMemo(() => {
    const out: JournalEntry[] = [];
    for (const p of personal.places) {
      if (!p.visited || !p.visitedOn) continue;
      const place = curatedPlace(p.placeKey);
      if (place)
        out.push({
          id: `v-${p.placeKey}`,
          kind: "visit",
          day: p.visitedOn,
          title: place.name,
          note: place.summary,
          tag: place.kind,
        });
    }
    for (const [id, s] of Object.entries(stories)) {
      if (!s.stamped || !s.stampedOn) continue;
      const place = storyPlace(id);
      if (place)
        out.push({
          id: `c-${id}`,
          kind: "checkin",
          day: s.stampedOn,
          title: place.name,
          note: place.location,
          tag: "Check-in",
          image: place.hero.src,
        });
    }
    for (const r of records) {
      for (const st of r.stamps) {
        if (st.at > 0)
          out.push({
            id: `s-${r.id}-${st.name}`,
            kind: "stamp",
            day: dayOfTime(st.at),
            at: st.at,
            title: st.name,
            note: `${r.title} · ${r.place}`,
            tag: "Hunt stamp",
            image: huntImage(r.id),
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
          image: huntImage(r.id),
        });
      }
    }
    for (const p of photos)
      out.push({
        id: `p-${p.id}`,
        kind: "photo",
        day: p.day,
        at: p.day === dayOfTime(p.at) ? p.at : undefined,
        title: p.caption || "A photo",
        note: "",
        tag: "Photo",
        image: p.url,
        photoId: p.id,
      });
    return buildDays(out);
  }, [personal.places, stories, records, photos]);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setAdding({ file, url: URL.createObjectURL(file) });
  };
  const closeAdd = () => {
    if (adding) URL.revokeObjectURL(adding.url);
    setAdding(null);
  };

  const today = localToday();
  const shown = all ? days : days.slice(0, SHOWN);
  const photo = viewing ? photos.find((p) => p.id === viewing) : undefined;

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
              aria-label="Snap"
            >
              <Icon name="cards" size={18} />
              <span aria-hidden="true">Snap</span>
            </button>
          )}
          {/* a label around the input: iOS Safari only opens its picker for a real tap on the file input */}
          <label className={styles.add}>
            <Icon name="camera" size={18} />
            <span>Add photo</span>
            <input
              ref={input}
              className={styles.file}
              type="file"
              accept="image/*"
              aria-label="Add a photo"
              onChange={pick}
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
        />
      ) : (
        shown.map((d) => <Day key={d.day} day={d} onView={setViewing} />)
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
        <AddSheet
          preview={adding.url}
          file={adding.file}
          today={today}
          onClose={closeAdd}
        />
      )}
      {photo && <PhotoSheet photo={photo} onClose={() => setViewing(null)} />}
    </section>
  );
}

function Day({
  day,
  onView,
}: {
  day: JournalDay;
  onView: (id: string) => void;
}) {
  const { num, month, weekday } = dayParts(day.day);
  const cover = day.cover;
  const tally = [
    [day.stats.places, "place", "places"],
    [day.stats.stamps, "stamp", "stamps"],
    [day.stats.photos, "photo", "photos"],
  ] as const;
  return (
    <article className={styles.day}>
      <div className={styles.top}>
        <p className={styles.date}>
          <b>{num}</b>
          <span>{month}</span>
          <small>{weekday}</small>
        </p>
        {(cover?.image || day.entries.length > 0) && (
          <div className={styles.prints}>
            <dl
              className={`${styles.tally} ${cover?.image ? "" : styles.tallyAlone}`}
            >
              {(tally.some(([n]) => n > 0)
                ? tally.filter(([n]) => n > 0)
                : tally.slice(0, 1)
              ).map(([n, one, many]) => (
                <div key={one}>
                  <dt>{n}</dt>
                  <dd>{n === 1 ? one : many}</dd>
                </div>
              ))}
            </dl>
            {cover?.image &&
              (cover.photoId ? (
                <button
                  type="button"
                  className={styles.print}
                  onClick={() => onView(cover.photoId!)}
                  aria-label={`Open photo: ${cover.title}`}
                >
                  <img src={cover.image} alt="" />
                </button>
              ) : (
                <span className={styles.print}>
                  <img src={cover.image} alt="" />
                </span>
              ))}
          </div>
        )}
      </div>
      <ul className={styles.log}>
        {day.entries.length === 0 && (
          <li className={styles.entry}>
            <span className={styles.icon}>
              <Icon name="pin" size={18} />
            </span>
            <span className={styles.body}>
              <b>Nothing logged yet</b>
              <span>Check in at a place, or add a photo of today.</span>
            </span>
          </li>
        )}
        {day.entries.map((e) => {
          const inner = (
            <>
              <span className={styles.icon}>
                {e.kind === "photo" && e.image ? (
                  <img src={e.image} alt="" />
                ) : (
                  <Icon name={ICON[e.kind]} size={18} />
                )}
              </span>
              <span className={styles.body}>
                <b>{e.title}</b>
                {e.note && <span>{e.note}</span>}
                <i className={styles.tag}>{e.tag}</i>
              </span>
              {e.at !== undefined && (
                <time className={styles.when}>{clockOf(e.at)}</time>
              )}
            </>
          );
          return (
            <li key={e.id}>
              {e.photoId ? (
                <button
                  type="button"
                  className={styles.entry}
                  onClick={() => onView(e.photoId!)}
                >
                  {inner}
                </button>
              ) : (
                <div className={styles.entry}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {day.from !== undefined && day.to !== undefined && (
        <p className={styles.span}>
          <Icon name="clock" size={14} />
          {day.from === day.to
            ? clockOf(day.from)
            : `${clockOf(day.from)} – ${clockOf(day.to)}`}
        </p>
      )}
    </article>
  );
}

function AddSheet({
  preview,
  file,
  today,
  onClose,
}: {
  preview: string;
  file: File;
  today: string;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [day, setDay] = useState(today);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const ok = await addPhoto(file, day || today, caption);
    setSaving(false);
    if (!ok) {
      showToast("This browser could not keep the photo");
      return;
    }
    showToast("Added to your journal");
    onClose();
  };
  return (
    <Sheet title="Add to your journal" onClose={onClose}>
      <div className={styles.sheetBody}>
        <img
          className={styles.preview}
          src={preview}
          alt="The photo you picked"
        />
        <label className={styles.field}>
          <span>Caption</span>
          <input
            value={caption}
            maxLength={80}
            placeholder="What was this?"
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Day</span>
          <input
            type="date"
            value={day}
            max={today}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={styles.save}
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Add to journal"}
        </button>
      </div>
    </Sheet>
  );
}

function PhotoSheet({
  photo,
  onClose,
}: {
  photo: JournalPhoto & { url: string };
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const { num, month, weekday } = dayParts(photo.day);
  return (
    <Sheet title={photo.caption || "A photo"} onClose={onClose}>
      <div className={styles.sheetBody}>
        <img
          className={styles.preview}
          src={photo.url}
          alt={photo.caption || "Your photo"}
        />
        <p className={styles.meta}>
          {weekday} {num} {month}
          {photo.day === dayOfTime(photo.at) && ` · ${clockOf(photo.at)}`}
        </p>
        <button
          type="button"
          className={confirm ? styles.danger : styles.ghost}
          onClick={async () => {
            if (!confirm) return setConfirm(true);
            await deletePhoto(photo.id);
            showToast("Photo removed");
            onClose();
          }}
        >
          {confirm ? "Tap again to remove it" : "Remove photo"}
        </button>
      </div>
    </Sheet>
  );
}
