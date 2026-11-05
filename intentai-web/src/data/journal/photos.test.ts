import { afterEach, expect, test, vi } from 'vitest';
import { addPhoto, deleteAllPhotos, listPhotos, updatePhoto } from './photos';

/** Just enough IndexedDB for photos.ts. With `hold`, opening the database waits until `release` is called. */
function fakeDb(hold = false) {
  const rows = new Map<string, { id: string }>();
  let release = () => {};
  const gate = hold ? new Promise<void>((r) => (release = r)) : Promise.resolve();
  const db = {
    transaction() {
      const tx: { oncomplete?: () => void; onerror?: () => void; onabort?: () => void; objectStore(): unknown } = {
        objectStore: () => {
          const done = <T,>(result: T) => {
            queueMicrotask(() => tx.oncomplete?.());
            return { result };
          };
          return {
            put: (v: { id: string }) => (rows.set(v.id, v), done(v.id)),
            clear: () => (rows.clear(), done(undefined)),
            getAll: () => done([...rows.values()]),
            get: (id: string) => done(rows.get(id)),
            delete: (id: string) => (rows.delete(id), done(undefined)),
          };
        },
      };
      return tx;
    },
  };
  const indexedDB = {
    open() {
      const req: { result: unknown; onsuccess?: () => void } = { result: db };
      void gate.then(() => req.onsuccess?.());
      return req;
    },
  };
  vi.stubGlobal('indexedDB', indexedDB);
  return { rows, release: () => release() };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

test('deleteAllPhotos empties the journal', async () => {
  fakeDb();
  await addPhoto(new Blob(['a']), '2026-11-05', 'kept');
  expect(await listPhotos()).toHaveLength(1);
  await expect(deleteAllPhotos()).resolves.toBe(true);
  expect(await listPhotos()).toEqual([]);
});

test('with no IndexedDB there is nothing to delete', async () => {
  vi.stubGlobal('indexedDB', undefined);
  await expect(deleteAllPhotos()).resolves.toBe(true);
});

test('a photo still being prepared when everything is deleted does not come back', async () => {
  const { rows } = fakeDb();
  let finish: (v: never) => void = () => {};
  vi.stubGlobal('createImageBitmap', () => new Promise((_, reject) => (finish = reject)));
  const adding = addPhoto(new Blob(['a']), '2026-11-05', 'late');
  await deleteAllPhotos();
  finish(new Error('use the original') as never);
  await expect(adding).resolves.toBeNull();
  expect(rows.size).toBe(0);
});

test('an edit in flight when everything is deleted does not put the photo back', async () => {
  const { rows } = fakeDb();
  const photo = await addPhoto(new Blob(['a']), '2026-11-05', 'old');
  let finish: (v: never) => void = () => {};
  vi.stubGlobal('createImageBitmap', () => new Promise((_, reject) => (finish = reject)));
  const editing = updatePhoto(photo!.id, { file: new Blob(['b']) });
  await flush();
  await deleteAllPhotos();
  finish(new Error('use the original') as never);
  await expect(editing).resolves.toBeNull();
  expect(rows.size).toBe(0);
});

test('a database that never opens reports failure after 3 s, and a late open wipes nothing added since', async () => {
  const { rows, release } = fakeDb(true);
  vi.useFakeTimers();
  const deleting = deleteAllPhotos();
  await vi.advanceTimersByTimeAsync(3000);
  await expect(deleting).resolves.toBe(false);
  rows.set('added-after', { id: 'added-after' });
  release();
  await flush();
  expect(rows.has('added-after')).toBe(true);
});

test('a delete still queued when the time runs out is aborted, not left to run later', async () => {
  const abort = vi.fn();
  const tx: { oncomplete?: () => void; onerror?: () => void; onabort?: () => void; abort: () => void; objectStore(): unknown } = {
    abort,
    // the clear is accepted but waits behind another transaction: it would only run on completion
    objectStore: () => ({ clear: () => ({ result: undefined }) }),
  };
  vi.stubGlobal('indexedDB', {
    open() {
      const req: { result: unknown; onsuccess?: () => void } = { result: { transaction: () => tx } };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  });
  vi.useFakeTimers();
  const deleting = deleteAllPhotos();
  await vi.advanceTimersByTimeAsync(3000);
  await expect(deleting).resolves.toBe(false);
  expect(abort).toHaveBeenCalledOnce();
});
