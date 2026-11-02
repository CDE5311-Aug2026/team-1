// Photos the visitor adds to their journal, kept on this device only (IndexedDB; nothing is uploaded anywhere).
// Each photo is scaled down to a JPEG of at most MAX_SIDE px before it is stored.

export interface JournalPhoto {
  id: string;
  /** Local calendar day it belongs to (YYYY-MM-DD). */
  day: string;
  /** When it was added (ms). */
  at: number;
  caption: string;
  blob: Blob;
  /** When it was taken (ms), set by hand: a photo filed under an earlier day keeps its own time of that day. */
  taken?: number;
  /** The journal place it shows (a place entry's key, e.g. `s-telok-ayer-telok-ayer-02`): its card shows the photo. */
  place?: string;
}

/** What can be changed on a kept photo; `taken` / `place` null clear them; `file` replaces the picture. */
export interface PhotoEdit {
  caption?: string;
  day?: string;
  taken?: number | null;
  place?: string | null;
  file?: Blob;
}

/** The photo's time on its own day: the hand-set time, else when it was added if that was the same day. */
export function photoTime(p: Pick<JournalPhoto, 'day' | 'at' | 'taken'>, dayOf: (at: number) => string): number | undefined {
  if (p.taken !== undefined && dayOf(p.taken) === p.day) return p.taken;
  return dayOf(p.at) === p.day ? p.at : undefined;
}

const DB = 'findsg-journal';
const STORE = 'photos';
const MAX_SIDE = 1280;
const CHANGED = 'journal-photos-changed';

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(req.result);
          tx.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function listPhotos(): Promise<JournalPhoto[]> {
  const all = await run<JournalPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<JournalPhoto[]>);
  return (all ?? []).sort((a, b) => a.at - b.at);
}

export async function addPhoto(
  file: Blob,
  day: string,
  caption: string,
  now = Date.now(),
  more: { taken?: number; place?: string } = {},
): Promise<JournalPhoto | null> {
  const blob = await shrink(file);
  const photo: JournalPhoto = { id: `p${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, day, at: now, caption: caption.trim(), blob };
  if (more.taken !== undefined) photo.taken = more.taken;
  if (more.place) photo.place = more.place;
  const ok = await run('readwrite', (s) => s.put(photo));
  if (ok === null) return null;
  window.dispatchEvent(new Event(CHANGED));
  return photo;
}

export async function updatePhoto(id: string, edit: PhotoEdit): Promise<JournalPhoto | null> {
  const old = await run<JournalPhoto | undefined>('readonly', (s) => s.get(id) as IDBRequest<JournalPhoto | undefined>);
  if (!old) return null;
  const next: JournalPhoto = { ...old };
  if (edit.caption !== undefined) next.caption = edit.caption.trim();
  if (edit.day) next.day = edit.day;
  if (edit.taken === null) delete next.taken;
  else if (edit.taken !== undefined) next.taken = edit.taken;
  if (edit.place === null) delete next.place;
  else if (edit.place !== undefined) next.place = edit.place;
  if (edit.file) next.blob = await shrink(edit.file);
  const ok = await run('readwrite', (s) => s.put(next));
  if (ok === null) return null;
  window.dispatchEvent(new Event(CHANGED));
  return next;
}

export async function deletePhoto(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
  window.dispatchEvent(new Event(CHANGED));
}

export function onPhotosChanged(fn: () => void): () => void {
  window.addEventListener(CHANGED, fn);
  return () => window.removeEventListener(CHANGED, fn);
}

/** Scale a picked image down to a JPEG no wider or taller than MAX_SIDE. Falls back to the original if it can't. */
async function shrink(file: Blob): Promise<Blob> {
  try {
    const img = await decode(file);
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const g = c.getContext('2d');
    if (!g) return file;
    g.drawImage(img.source, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return out ?? file;
  } catch {
    return file;
  }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const b = await createImageBitmap(file);
    return { source: b, width: b.width, height: b.height };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
