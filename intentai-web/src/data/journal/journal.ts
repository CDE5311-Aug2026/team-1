// The Moments journal: everything the visitor did, grouped by day, newest day first.
// Sources: places marked visited in Nearby, Home story check-ins, Hunt stamps and finished stories, and photos.
// Places and Home stamps only keep a date; Hunt stamps and photos also keep a time.

export type EntryKind = "visit" | "checkin" | "stamp" | "finish" | "photo";

export interface JournalEntry {
  id: string;
  kind: EntryKind;
  /** Local calendar day (YYYY-MM-DD). */
  day: string;
  /** Exact time (ms) when the source keeps one. */
  at?: number;
  title: string;
  note: string;
  tag: string;
  /** Picture for the day's print (a photo URL or the place's own image). */
  image?: string;
  /** Set for the visitor's own photos. */
  photoId?: string;
  /** A real photo of the place (Commons or a card photo), for the travelogue. */
  real?: { src: string; credit: string };
  /** The URA planning area the place is in. */
  area?: string;
}

export interface JournalDay {
  day: string;
  entries: JournalEntry[];
  /** The day's print: the latest own photo, else the first picture from a place. */
  cover?: JournalEntry;
  stats: { places: number; stamps: number; photos: number };
  /** Earliest and latest known times that day (ms). */
  from?: number;
  to?: number;
}

const KIND_ORDER: Record<EntryKind, number> = {
  visit: 0,
  checkin: 1,
  stamp: 2,
  finish: 3,
  photo: 4,
};

/** The local calendar day of a time. */
export function dayOfTime(at: number): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function buildDays(entries: readonly JournalEntry[]): JournalDay[] {
  const byDay = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.day)) continue;
    const list = byDay.get(e.day) ?? [];
    list.push(e);
    byDay.set(e.day, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([day, list]) => {
      // in the order the day went: timed entries by time; untimed ones (date-only sources) first, by kind
      const sorted = [...list].sort((a, b) => {
        if (a.at !== undefined && b.at !== undefined) return a.at - b.at;
        if (a.at === undefined && b.at === undefined)
          return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
        return a.at === undefined ? -1 : 1;
      });
      const photos = sorted.filter((e) => e.kind === "photo");
      const cover = photos[photos.length - 1] ?? sorted.find((e) => e.image);
      const places = new Set(
        sorted
          .filter(
            (e) =>
              e.kind === "visit" || e.kind === "checkin" || e.kind === "stamp",
          )
          .map((e) => e.title),
      );
      const times = sorted.flatMap((e) => (e.at !== undefined ? [e.at] : []));
      return {
        day,
        entries: sorted,
        cover,
        stats: {
          places: places.size,
          stamps: sorted.filter(
            (e) => e.kind === "stamp" || e.kind === "checkin",
          ).length,
          photos: photos.length,
        },
        from: times.length ? Math.min(...times) : undefined,
        to: times.length ? Math.max(...times) : undefined,
      };
    });
}

/** "09:40" in 24-hour time. */
export function clockOf(at: number): string {
  return new Date(at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Big day number, short month and weekday for a YYYY-MM-DD day. */
export function dayParts(day: string): {
  num: string;
  month: string;
  weekday: string;
} {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    num: String(d),
    month: date.toLocaleDateString("en-GB", { month: "short" }),
    weekday: date.toLocaleDateString("en-GB", { weekday: "short" }),
  };
}
