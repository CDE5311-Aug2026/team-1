// Nearby → Saved (NBR 24, 27): saved and visited places, removal with Undo, JSON backup and restore.
import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import Dialog from '../../components/Dialog/Dialog';
import { dataGeneration, explorePersonalStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { markVisited, toggleSave, useExplorePersonal } from '../../features/nearby/actions';
import { curatedPlace } from '../../features/nearby/catalogue';
import { NearbyHeader, SectionNav, StorageWarning } from '../../features/nearby/components/NearbyChrome';
import PlaceCard from '../../features/nearby/components/PlaceCard';
import styles from '../../features/nearby/components/Nearby.module.css';
import type { PersonalPlaceState } from '../../features/nearby/domain';
import { exportData, mergeImport, parseImport, MAX_IMPORT_BYTES, type MergePreview } from '../../features/nearby/personal';
import { toItem } from '../../features/nearby/ranking';
import { paths } from '../../routes';

function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function SavedPage() {
  const personal = useExplorePersonal();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'visited' ? 'visited' : 'saved';
  const fileInput = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [importState, setImportState] = useState<
    { records: PersonalPlaceState[]; preview: MergePreview; unknown: number; skipped: number } | { error: string } | null
  >(null);

  const list = personal.places
    .filter((s) => (tab === 'saved' ? s.saved : s.visited))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(personal), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intentai-explore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportState({ error: 'This file is larger than 1 MB.' });
      return;
    }
    const text = await readText(file);
    const parsed = parseImport(text, file.size);
    if (!parsed.ok) {
      setImportState({ error: parsed.error });
      return;
    }
    const { preview } = mergeImport(explorePersonalStore.get(), parsed.records);
    const unknown = parsed.records.filter((r) => !curatedPlace(r.placeKey)).length;
    setImportState({ records: parsed.records, preview, unknown, skipped: parsed.skipped });
  };

  const confirmImport = () => {
    if (!importState || 'error' in importState) return;
    const generation = dataGeneration();
    const before = explorePersonalStore.get();
    explorePersonalStore.set((d) => mergeImport(d, importState.records).data);
    setImportState(null);
    showToast('Backup merged', {
      undo: () => {
        if (dataGeneration() === generation) explorePersonalStore.set(before);
      },
    });
  };

  return (
    <AppShell background="var(--bg-screen-b)" chrome="status">
      <div className={styles.screen}>
        <NearbyHeader title="Nearby" />
        <SectionNav />
        <StorageWarning />
        <div className={styles.segmented} role="group" aria-label="Show">
          <button type="button" className={styles.segment} aria-pressed={tab === 'saved'} onClick={() => setParams({}, { replace: true })}>
            Saved ({personal.places.filter((s) => s.saved).length})
          </button>
          <button type="button" className={styles.segment} aria-pressed={tab === 'visited'} onClick={() => setParams({ tab: 'visited' }, { replace: true })}>
            Checked in ({personal.places.filter((s) => s.visited).length})
          </button>
        </div>

        {list.length === 0 ? (
          <p className={styles.empty}>
            {tab === 'saved' ? 'Nothing saved yet.' : 'No check-ins yet.'}
            <br />
            <Link className={styles.textLink} to={paths.nearby}>
              Explore places
            </Link>
          </p>
        ) : (
          <ul className={styles.rows} ref={listRef} tabIndex={-1} aria-label={tab === 'saved' ? 'Saved places' : 'Checked-in places'}>
            {list.map((s) => {
              const place = curatedPlace(s.placeKey);
              if (!place) {
                // Unknown id (renamed or removed place, or from a newer backup): keep it recoverable.
                return (
                  <li key={s.placeKey}>
                    <article className={styles.card}>
                      <p className={styles.cardName}>Place not in this catalogue</p>
                      <p className={styles.meta}>{s.placeKey}</p>
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => (tab === 'saved' ? toggleSave(s.placeKey, 'Place') : markVisited(s.placeKey, 'Place', false))}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  </li>
                );
              }
              return (
                <li key={s.placeKey}>
                  <div
                    onClickCapture={(e) => {
                      // Unsaving here removes the card: keep keyboard focus on the list instead of losing it.
                      if (tab === 'saved' && (e.target as HTMLElement).closest('button[aria-pressed="true"]')) {
                        setTimeout(() => listRef.current?.focus(), 0);
                      }
                    }}
                  >
                    <PlaceCard
                      item={toItem(place)}
                      state={s}
                      onToggleVisited={tab === 'visited' ? () => markVisited(place.id, place.name, !s.visited) : undefined}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <section className={styles.panel} aria-labelledby="backup-title">
          <h2 id="backup-title" className={styles.panelTitle}>
            Back up or restore
          </h2>
          <p className={styles.note}>Your list lives in this browser only. Back it up to keep it.</p>
          <div className={styles.row}>
            <button type="button" className={styles.secondary} onClick={download}>
              Download backup
            </button>
            <button type="button" className={styles.secondary} onClick={() => fileInput.current?.click()}>
              Restore from a file
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} aria-label="Backup file" />
          </div>
        </section>
      </div>

      {importState && (
        <Dialog title={'error' in importState ? 'Could not restore' : 'Restore this backup?'} onClose={() => setImportState(null)}>
          {'error' in importState ? (
            <>
              <p className={styles.body}>{importState.error} Your saved places were not changed.</p>
              <button type="button" className={styles.primary} onClick={() => setImportState(null)}>
                OK
              </button>
            </>
          ) : (
            <>
              <p className={styles.body}>
                {importState.preview.total} records: {importState.preview.newSaved} new saved, {importState.preview.newVisited} new visits,{' '}
                {importState.preview.datesChanged > 0 && `${importState.preview.datesChanged} earlier visit dates, `}
                {importState.preview.unchanged} already here.
              </p>
              {importState.unknown > 0 && (
                <p className={styles.note}>
                  {importState.unknown} {importState.unknown === 1 ? 'record names a place' : 'records name places'} not in this catalogue. They are
                  kept but do not count towards collections.
                </p>
              )}
              {importState.skipped > 0 && <p className={styles.note}>{importState.skipped} invalid records will be skipped.</p>}
              <div className={styles.row}>
                <button type="button" className={styles.primary} onClick={confirmImport}>
                  Merge
                </button>
                <button type="button" className={styles.secondary} onClick={() => setImportState(null)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </AppShell>
  );
}
