// The display case under the shelf, filled from real progress only (see record.ts): a medal and a map for each story you
// finish, a stamp for each place you checked in at, and under it the stamp wheel: turn a story into its window to see
// each of its stops, stamped on site, solved from afar or not yet, and whether the story is finished.
import { useMemo, useState } from 'react';
import { readShort, SHORT_EPISODE } from '../../../findsg/book';
import type { BookId } from './Bookshelf';
import { chapters } from './chapters';
import { CaseScene } from './shelf3d/CaseScene';
import { STAMP_TOTAL, routeRows, storyRecords, type StopRow, type StoryRecord } from './record';
import { StampWheel } from './StampWheel';
import styles from './cabinet.module.css';

/** One row per stop of every story: the four routes from their saves, the prologue's two buildings from its own. */
function wheelRows(records: StoryRecord[]) {
  const out: Partial<Record<BookId, StopRow[]>> = {};
  for (const ch of chapters()) out[ch.routeId as BookId] = routeRows(ch.routeId, ch.stops);
  const on = readShort('manual'),
    far = readShort('preview');
  const short = records.find((r) => r.id === 'short');
  const [press, mosque] = SHORT_EPISODE.places;
  out.short = [
    { id: 'press', name: press.name, stamped: !!on.arrival1, stampedAt: on.arrival1 ? short?.startedAt : undefined, solved: on.deduce || far.deduce },
    {
      id: 'mosque',
      name: on.deduce || far.deduce ? mosque.name : 'Stop II · still hidden',
      stamped: !!on.arrival2,
      stampedAt: on.arrival2 ? (short?.finishedAt ?? short?.startedAt) : undefined,
      solved: on.bottle || far.bottle,
    },
  ];
  return out;
}

export function DisplayCase({
  onPassport,
  onPick,
  selected,
  onSelect,
}: {
  onPassport(): void;
  /** A medal or map tapped in the case: show that book on the shelf. */
  onPick(id: BookId): void;
  /** The book picked on the shelf; the wheel turns to it. */
  selected?: BookId;
  /** The wheel settled on a story: select it on the shelf, staying where we are. */
  onSelect?(id: BookId): void;
}) {
  const records = useMemo(() => storyRecords(), []);
  const rows = useMemo(() => wheelRows(records), [records]);
  const [flat, setFlat] = useState(() => typeof window === 'undefined' || !('WebGLRenderingContext' in window));
  const finished = records.filter((r) => r.finished).length;
  const stamps = records.reduce((n, r) => n + r.stamps.length, 0);
  return (
    <section className={styles.case} aria-labelledby="case-h">
      <div className={styles.head}>
        <h2 id="case-h">Your display case</h2>
        <button type="button" onClick={onPassport}>
          Passport ›
        </button>
      </div>
      {!flat && <CaseScene records={records} onPick={onPick} onFail={() => setFlat(true)} />}
      <p className={styles.tally}>
        <span>
          <b>{finished}</b> / {records.length} stories finished
        </span>
        <span>
          <b>{stamps}</b> / {STAMP_TOTAL} stamps
        </span>
      </p>
      <StampWheel records={records} rows={rows} selected={selected} onPick={onSelect ?? onPick} />
    </section>
  );
}
