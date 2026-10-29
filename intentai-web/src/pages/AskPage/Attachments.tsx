// Files and quick context in the Ask composer.
// Files: a photo, an audio recording or a document, shown above the input before sending and in the sent bubble.
// Only their name, kind, size and type are kept in History; the files stay in this tab. Ask has no model, so it
// never claims to read a photo, a recording or a PDF; it reads the opening of a .txt document only.
// Context: a card, a phrase, a question or a Community thread, picked from Hints, Moments or Community.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotionConfig } from 'motion/react';
import Dialog from '../../components/Dialog/Dialog';
import type { AskAttachmentKind, AskAttachmentMeta, AskContextKind, AskContextRef } from '../../data/domain';
import type { MemoryItem } from '../../data/memory';
import { paths } from '../../routes';
import styles from './Attachments.module.css';

/* ---------- Files ---------- */

export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ACCEPT: Record<AskAttachmentKind, string> = {
  photo: 'image/*',
  audio: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,.mp3,.m4a,.mp4,.wav',
  document: '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
};

const KIND_LABEL: Record<AskAttachmentKind, string> = { photo: 'Photo', audio: 'Recording', document: 'Document' };
const EXTENSIONS: Record<Exclude<AskAttachmentKind, 'photo'>, string[]> = {
  audio: ['mp3', 'm4a', 'mp4', 'wav'],
  document: ['pdf', 'doc', 'docx', 'txt'],
};

/** A file waiting in the composer, or sent with a question (url only while this tab is open). */
export interface AttachedFile extends AskAttachmentMeta {
  id: string;
  file?: File;
  url?: string;
}

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

function fits(kind: AskAttachmentKind, file: File): boolean {
  if (kind === 'photo') return file.type.startsWith('image/');
  return EXTENSIONS[kind].includes(extOf(file.name)) || (kind === 'audio' && file.type.startsWith('audio/'));
}

/** "1.2 MB", "820 KB", "12 B". */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** jsdom and some old browsers have no object URLs: the chip then shows without a preview. */
function previewUrl(file: File): string | undefined {
  try {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined;
  } catch {
    return undefined;
  }
}

export function releaseUrl(url: string | undefined) {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
}

let counter = 0;

/** New files for the composer, and a friendly error for the ones that can't be added. */
export function addFiles(existing: readonly AttachedFile[], files: readonly File[], kind: AskAttachmentKind): { added: AttachedFile[]; error?: string } {
  const added: AttachedFile[] = [];
  let error: string | undefined;
  for (const file of files) {
    if (existing.length + added.length >= MAX_ATTACHMENTS) {
      error = `You can add up to ${MAX_ATTACHMENTS} files to one question.`;
      break;
    }
    if (!fits(kind, file)) {
      error = kind === 'audio' ? `${file.name} isn’t an MP3, M4A, MP4 or WAV recording.` : kind === 'document' ? `${file.name} isn’t a PDF, Word or text document.` : `${file.name} isn’t a photo.`;
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      error = `${file.name} is ${formatSize(file.size)}. Files can be up to 25 MB.`;
      continue;
    }
    counter += 1;
    added.push({
      id: `f${Date.now().toString(36)}${counter}`,
      name: file.name,
      kind,
      size: file.size,
      mime: file.type,
      file,
      url: kind === 'document' ? undefined : previewUrl(file),
    });
  }
  return { added, error };
}

export const metaOf = ({ name, kind, size, mime }: AttachedFile): AskAttachmentMeta => ({ name, kind, size, mime });

export const isTextDoc = (f: AttachedFile) => f.kind === 'document' && (extOf(f.name) === 'txt' || f.mime === 'text/plain');

function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** The first ~300 characters of the first .txt document, or undefined. */
export async function textOpening(files: readonly AttachedFile[]): Promise<{ name: string; text: string } | undefined> {
  const doc = files.find((f) => isTextDoc(f) && f.file);
  if (!doc?.file) return undefined;
  try {
    const text = (await readText(doc.file)).replace(/\s+/g, ' ').trim().slice(0, 300);
    return text ? { name: doc.name, text } : undefined;
  } catch {
    return undefined;
  }
}

/** The one calm line an answer adds about the files that came with the question. */
export function filesNote(files: readonly AskAttachmentMeta[], read?: { name: string; found?: string }): string {
  const n = files.length;
  const kept = n === 1 ? 'I’ve kept your file with this question.' : `I’ve kept your ${n} files with this question.`;
  if (read?.found) return `${kept} ${read.name} mentions ${read.found}.`;
  if (read) return `${kept} I read the start of ${read.name}; it doesn’t name a phrase or place I know yet, so the answer comes from your words.`;
  return `${kept} The answer below comes from your words.`;
}

/* ---------- Icons ---------- */

function Icon({ kind, size = 18 }: { kind: AskAttachmentKind | 'context' | 'play' | 'pause'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (kind) {
    case 'photo':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m21 16-5-5-8 8" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...common}>
          <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
        </svg>
      );
    case 'document':
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      );
    case 'context':
      return (
        <svg {...common}>
          <path d="M5 4h10l4 4v12H5z" />
          <path d="M9 12h6M9 16h6M12 8V4" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="6.5" y="5" width="4" height="14" rx="1" />
          <rect x="13.5" y="5" width="4" height="14" rx="1" />
        </svg>
      );
  }
}

/* ---------- The + sheet ---------- */

export function AddSheet({
  onFile,
  onContext,
  onClose,
  children,
}: {
  onFile: (kind: AskAttachmentKind) => void;
  onContext: () => void;
  onClose: () => void;
  /** The cards and Describe the situation (Conversation.tsx). */
  children: ReactNode;
}) {
  const options: { kind: AskAttachmentKind; label: string; hint: string }[] = [
    { kind: 'photo', label: 'Photo', hint: 'A sign, a menu, a screenshot' },
    { kind: 'audio', label: 'Audio recording', hint: 'MP3, M4A or WAV, kept for later' },
    { kind: 'document', label: 'Document', hint: 'A guide or letter · PDF, Word, TXT' },
  ];
  return (
    <Dialog title="Bring a little context." onClose={onClose}>
      <section className={styles.sheetSection} aria-labelledby="ask-add-files">
        <h3 id="ask-add-files" className={styles.sectionTitle}>
          Attach
        </h3>
        <div className={styles.fileGrid}>
          {options.map((o) => (
            <button
              key={o.kind}
              type="button"
              className={styles.fileOption}
              onClick={(event) => {
                // Close the modal first: the hidden file inputs sit outside it, and a modal makes the rest inert.
                event.currentTarget.closest('dialog')?.close?.();
                onFile(o.kind);
              }}
            >
              <span className={styles.fileMark}>
                <Icon kind={o.kind} size={20} />
              </span>
              <strong>{o.label}</strong>
              <span>{o.hint}</span>
            </button>
          ))}
        </div>
        <p className={styles.limitNote}>Up to {MAX_ATTACHMENTS} files, 25 MB each. They stay on this device.</p>
      </section>
      <section className={styles.sheetSection} aria-labelledby="ask-add-context">
        <h3 id="ask-add-context" className={styles.sectionTitle}>
          Add context
        </h3>
        <button type="button" className={styles.contextOption} onClick={onContext}>
          <span className={styles.fileMark}>
            <Icon kind="context" size={20} />
          </span>
          <span>
            <strong>Pick from Hints, Moments or Community</strong>
            <span>Cards, phrases you saved, questions you joined</span>
          </span>
        </button>
        {children}
      </section>
    </Dialog>
  );
}

/* ---------- Context ---------- */

/** A context item in the composer: what it is, how it's labelled, and what Ask uses. */
export interface ContextItem extends AskContextRef {
  key: string;
  /** card: the card to answer about. */
  cardId?: string;
  /** phrase: the phrase to read. */
  phrase?: string;
  /** question / thread: its title and body, used as the situation. */
  title?: string;
  body?: string;
  /** One line under the label in the picker. */
  hint?: string;
  /** The question to send when the input is empty. */
  ask?: string;
}

export const MAX_CONTEXT = 3;

export const contextRef = ({ kind, label }: ContextItem): AskContextRef => ({ kind, label });

const CONTEXT_PREFIX: Record<AskContextKind, string> = { card: 'About', phrase: 'Phrase', question: 'Question', thread: 'Thread' };
export const contextLabel = (c: AskContextRef) => `${CONTEXT_PREFIX[c.kind]}: ${c.label}`;

export type PickerTab = 'hints' | 'moments' | 'mine' | 'community' | 'joined';

const TABS: { id: PickerTab; label: string; empty: string }[] = [
  { id: 'hints', label: 'Hints', empty: 'No hints match.' },
  { id: 'moments', label: 'Moments', empty: 'Cards you open and phrases you save show up here.' },
  { id: 'mine', label: 'My questions', empty: 'Questions you ask in Community show up here.' },
  { id: 'community', label: 'Community', empty: 'No Community questions match.' },
  { id: 'joined', label: 'Joined', empty: 'Threads you reply to, follow or like show up here.' },
];

export function ContextPicker({
  lists,
  chosen,
  onPick,
  onClose,
}: {
  lists: Record<PickerTab, ContextItem[]>;
  chosen: readonly string[];
  onPick: (item: ContextItem) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PickerTab>('hints');
  const [query, setQuery] = useState('');
  const base = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const q = query.trim().toLowerCase();
  const items = useMemo(
    () => lists[tab].filter((i) => !q || `${i.label} ${i.hint ?? ''} ${i.body ?? ''}`.toLowerCase().includes(q)).slice(0, 40),
    [lists, tab, q],
  );
  const full = chosen.length >= MAX_CONTEXT;

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = event.key === 'ArrowRight' ? (i + 1) % TABS.length : event.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const current = TABS.find((t) => t.id === tab)!;
  return (
    <Dialog title="Add context" onClose={onClose}>
      <div className={styles.picker}>
        <input
          type="search"
          className={styles.search}
          aria-label="Search context"
          placeholder="Search cards, phrases, questions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.tabs} role="tablist" aria-label="Where to look">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${base}-panel`}
              tabIndex={tab === t.id ? 0 : -1}
              className={styles.tab}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKey}
            >
              {t.label}
              <span className={styles.tabCount}>{lists[t.id].length}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${tab}`} className={styles.panel}>
          {full && <p className={styles.limitNote}>You can add up to {MAX_CONTEXT} items. Remove one to add another.</p>}
          {items.length === 0 ? (
            <p className={styles.empty}>{q ? 'Nothing matches that search.' : current.empty}</p>
          ) : (
            <ul className={styles.pickList}>
              {items.map((item) => {
                const added = chosen.includes(item.key);
                return (
                  <li key={item.key}>
                    <button type="button" className={styles.pickItem} onClick={() => onPick(item)} disabled={added || full} aria-label={`${contextLabel(item)}${added ? ' (added)' : ''}`}>
                      <span className={styles.pickKind}>{CONTEXT_PREFIX[item.kind]}</span>
                      <strong>{item.label}</strong>
                      {item.hint && <span className={styles.pickHint}>{item.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- Composer tray ---------- */

function AudioToggle({ url, name }: { url: string; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) void audio.play?.()?.catch?.(() => setPlaying(false));
    else audio.pause();
  };
  return (
    <>
      <button type="button" className={styles.play} onClick={toggle} aria-label={`${playing ? 'Pause' : 'Play'} ${name}`} aria-pressed={playing}>
        <Icon kind={playing ? 'pause' : 'play'} size={14} />
      </button>
      <audio ref={ref} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </>
  );
}

export function ComposerTray({
  files,
  context,
  error,
  onRemoveFile,
  onRemoveContext,
}: {
  files: readonly AttachedFile[];
  context: readonly ContextItem[];
  error?: string;
  onRemoveFile: (id: string) => void;
  onRemoveContext: (key: string) => void;
}) {
  const reduce = useReducedMotionConfig();
  const pop = reduce ? {} : { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 }, transition: { duration: 0.18 } };
  if (files.length === 0 && context.length === 0 && !error) return null;
  return (
    <div className={styles.tray}>
      {(files.length > 0 || context.length > 0) && (
        <ul className={styles.trayList} aria-label="Added to your question">
          <AnimatePresence initial={false}>
            {context.map((c) => (
              <motion.li key={c.key} className={styles.contextChip} {...pop}>
                <span className={styles.chipText}>{contextLabel(c)}</span>
                <button type="button" className={styles.remove} onClick={() => onRemoveContext(c.key)} aria-label={`Remove ${contextLabel(c)}`}>
                  ×
                </button>
              </motion.li>
            ))}
            {files.map((f) => (
              <motion.li key={f.id} className={f.kind === 'photo' && f.url ? styles.photoChip : styles.fileChip} {...pop}>
                {f.kind === 'photo' && f.url ? (
                  <img src={f.url} alt={f.name} className={styles.thumb} />
                ) : f.kind === 'audio' && f.url ? (
                  <AudioToggle url={f.url} name={f.name} />
                ) : (
                  <span className={styles.fileMarkSmall}>
                    <Icon kind={f.kind} size={16} />
                  </span>
                )}
                {!(f.kind === 'photo' && f.url) && (
                  <span className={styles.chipText}>
                    <strong>{f.name}</strong>
                    <span>
                      {KIND_LABEL[f.kind]} · {formatSize(f.size)}
                    </span>
                  </span>
                )}
                <button type="button" className={styles.remove} onClick={() => onRemoveFile(f.id)} aria-label={`Remove ${f.name}`}>
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- In the sent bubble ---------- */

export function SentExtras({ files = [], context = [] }: { files?: readonly AttachedFile[]; context?: readonly AskContextRef[] }) {
  if (files.length === 0 && context.length === 0) return null;
  const photos = files.filter((f) => f.kind === 'photo' && f.url);
  const rest = files.filter((f) => !(f.kind === 'photo' && f.url));
  return (
    <span className={styles.sent}>
      {context.length > 0 && (
        <span className={styles.sentRow}>
          {context.map((c) => (
            <span key={`${c.kind}:${c.label}`} className={styles.sentContext}>
              {contextLabel(c)}
            </span>
          ))}
        </span>
      )}
      {photos.length > 0 && (
        <span className={styles.sentPhotos}>
          {photos.map((f) => (
            <img key={f.id} src={f.url} alt={f.name} className={styles.sentPhoto} />
          ))}
        </span>
      )}
      {rest.map((f) =>
        f.kind === 'audio' && f.url ? (
          <span key={f.id} className={styles.sentAudio}>
            <span className={styles.sentFileName}>{f.name}</span>
            <audio controls src={f.url} preload="metadata" aria-label={`Recording ${f.name}`} />
          </span>
        ) : (
          <span key={f.id} className={styles.sentFile}>
            <span className={styles.fileMarkSmall}>
              <Icon kind={f.kind} size={16} />
            </span>
            <span className={styles.chipText}>
              <strong>{f.kind === 'document' || f.file ? f.name : `${KIND_LABEL[f.kind]} · ${f.name}`}</strong>
              <span>{f.kind === 'document' || f.file ? `${KIND_LABEL[f.kind]} · ${formatSize(f.size)}` : formatSize(f.size)}</span>
            </span>
          </span>
        ),
      )}
    </span>
  );
}

/** Under the user's bubble: what memory just kept, and where to manage it. */
export function RememberedNote({ text }: { text: string }) {
  return (
    <p className={styles.remembered}>
      <span>Remembered: {text}</span>
      <span aria-hidden="true"> · </span>
      <Link to={`${paths.mySpaceSettings}?section=memory`} className={styles.manage}>
        Manage<span className={styles.srOnly}> memory</span>
      </Link>
    </p>
  );
}

/** In the answer: the one line about attached files. */
export function FilesNote({ text }: { text: string }) {
  return <p className={styles.filesNote}>{text}</p>;
}

/* ---------- Using memory ---------- */

export function MemoryPill({ items }: { items: readonly MemoryItem[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  if (items.length === 0) return null;
  return (
    <div
      className={styles.memory}
      ref={wrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          wrap.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button type="button" className={styles.memoryPill} aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span className={styles.memoryDot} aria-hidden="true" />
        Using memory · {items.length}
      </button>
      {open && (
        <div id={id} className={styles.memoryPop} role="region" aria-label="What Ask remembers">
          <p className={styles.memoryTitle}>Ask keeps this in mind</p>
          <ul>
            {items.slice(0, 8).map((m) => (
              <li key={m.id}>{m.text}</li>
            ))}
          </ul>
          {items.length > 8 && <p className={styles.memoryMore}>and {items.length - 8} more</p>}
          <Link to={`${paths.mySpaceSettings}?section=memory`} className={styles.manage}>
            Manage memory
          </Link>
        </div>
      )}
    </div>
  );
}
