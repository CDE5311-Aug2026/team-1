// The last two pages of every story book. Field notes: a sticky note for each stop, yours to write on and to move about
// the page (kept on this phone). The record: each stop with its stamp and the time you stamped it, and how long the whole
// story took — the same facts the display case shows, in the book they belong to.
import { useEffect, useRef, useState } from 'react';
import { StickyNote, type NoteTone } from '../../../components/Notebook/StickyNote';
import { bookOf, type BookId } from './Bookshelf';
import { clock, dayOf, readNotes, took, writeNote, type StopRow, type StoryRecord } from './record';
import p from './bookPage.module.css';
import b from './backPages.module.css';

const TONES: NoteTone[] = ['butter', 'rose', 'sage', 'sky'];

export function NotesPage({ story, stops }: { story: BookId; stops: { id: string; name: string }[] }) {
  const [notes, setNotes] = useState(() => readNotes(story));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const board = useRef<HTMLUListElement>(null);
  const keys = [...stops, { id: 'general', name: 'Anything else' }];
  const open = (id: string) => {
    setDraft(notes[id] ?? '');
    setEditing(id);
  };
  const save = () => {
    if (!editing) return;
    writeNote(story, editing, draft);
    setNotes(readNotes(story));
    setEditing(null);
  };
  const editingName = keys.find((k) => k.id === editing)?.name;
  return (
    <div className={p.page}>
      <header className={p.head}>
        <span>Field notes</span>
        <span>{bookOf(story)?.place}</span>
      </header>
      <ul className={`${b.board} ${keys.length > 5 ? b.many : ''}`} ref={board} data-nodrag>
        {keys.map((k, i) => (
          <StickyNote key={k.id} tone={TONES[i % TONES.length]} tilt={((i * 37) % 7) - 3} bounds={board} label={`Note: ${k.name}`} className={b.note} onTap={() => open(k.id)}>
            <small>{k.id === 'general' ? k.name : `${i + 1} · ${k.name}`}</small>
            <p className={notes[k.id] ? '' : b.empty}>{notes[k.id] || 'Nothing yet.'}</p>
            <Pencil onClick={() => open(k.id)} label={`Write a note for ${k.name}`} />
          </StickyNote>
        ))}
      </ul>
      {editing && (
        <div className={b.pad} data-nodrag>
          <label>
            <small>{editingName}</small>
            <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} maxLength={600} placeholder="What did you notice here?" />
          </label>
          <div className={b.padRow}>
            <button type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="button" className={b.stick} onClick={save}>
              Stick it in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The note's pencil: a press on it writes, it never picks the note up (the drag listens natively on the note). */
function Pencil({ onClick, label }: { onClick(): void; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('pointerdown', stop);
    return () => el.removeEventListener('pointerdown', stop);
  }, []);
  return (
    <button ref={ref} type="button" className={b.pencil} onClick={onClick} aria-label={label}>
      ✎
    </button>
  );
}

export function RecordPage({ record, rows }: { record: StoryRecord; rows: StopRow[] }) {
  const t = took(record);
  return (
    <div className={p.page}>
      <header className={p.head}>
        <span>The record</span>
        <span>{record.place}</span>
      </header>
      <div className={b.summary}>
        <em className={record.finished ? b.done : b.open}>{record.finished ? 'Finished' : `${record.done} of ${record.total} found`}</em>
        <dl>
          <div>
            <dt>Started</dt>
            <dd>{record.startedAt ? dayOf(record.startedAt) : '—'}</dd>
          </div>
          <div>
            <dt>Finished</dt>
            <dd>{record.finishedAt ? dayOf(record.finishedAt) : '—'}</dd>
          </div>
          <div>
            <dt>Time taken</dt>
            <dd>{t ?? '—'}</dd>
          </div>
        </dl>
      </div>
      <ol className={b.rows}>
        {rows.map((r, i) => (
          <li key={r.id}>
            <span className={b.n}>{i + 1}</span>
            <span className={b.stop}>{r.name}</span>
            {r.stamped ? (
              <span className={b.stamp} title="Checked in on site">
                Stamped{r.stampedAt ? <small>{clock(r.stampedAt)}</small> : null}
              </span>
            ) : r.solved ? (
              <span className={b.afar}>From afar</span>
            ) : (
              <span className={b.none}>Not yet</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
