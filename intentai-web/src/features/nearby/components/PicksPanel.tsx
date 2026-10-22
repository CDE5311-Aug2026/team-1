// Editor's picks: short themed lists (10 places each) plus the big collection, opened from the search bar's list
// button. Choosing one shows only its places on the map and in the sheet, as a checklist.
import { useEffect, useRef } from 'react';
import { useExplorePersonal } from '../actions';
import { MAIN_COLLECTION, PICKS, collectionProgress, collectionTitle, members } from '../catalogue';
import type { ExploreCollection } from '../domain';
import { Icon } from './icons';
import { PlaceThumb } from './PlaceCard';
import styles from './PicksPanel.module.css';

interface PicksPanelProps {
  id: string;
  activeId: string | null;
  onChoose: (c: ExploreCollection) => void;
  onClose: () => void;
}

export default function PicksPanel({ id, activeId, onChoose, onClose }: PicksPanelProps) {
  const personal = useExplorePersonal();
  const box = useRef<HTMLDivElement>(null);

  // Esc or a tap outside closes it; focus moves into it when it opens.
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (box.current && t && !box.current.contains(t) && !t.closest('[aria-controls="' + id + '"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [id, onClose]);

  const lists = [...PICKS, MAIN_COLLECTION].filter((c) => members(c).length > 0);
  return (
    <div ref={box} id={id} className={styles.panel} role="dialog" aria-label="Editor's picks">
      <div className={styles.head}>
        <h2 className={styles.title}>Editor’s picks</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
      </div>
      <ul className={styles.lists}>
        {lists.map((c) => {
          const p = collectionProgress(c, personal);
          const first = members(c)[0];
          return (
            <li key={c.id}>
              <button type="button" className={styles.list} aria-pressed={activeId === c.id} onClick={() => onChoose(c)}>
                <PlaceThumb id={first.id} category={first.category} size="row" />
                <span className={styles.text}>
                  <span className={styles.name}>{c.kind === 'picks' ? c.title : collectionTitle(c)}</span>
                  {c.titleZh && (
                    <span className={styles.zh} lang="zh-Hans">
                      {c.titleZh}
                    </span>
                  )}
                  <span className={styles.meta}>
                    {p.total} places{p.visited > 0 && <> · {p.visited} checked in</>}
                  </span>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
