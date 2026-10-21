// Nearby → Collections (NBR 22): real counts and progress; drafts are labelled as drafts.
import { Link } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { useExplorePersonal } from '../../features/nearby/actions';
import { COLLECTIONS, collectionProgress, collectionTitle, members } from '../../features/nearby/catalogue';
import { BackHeader, StorageWarning } from '../../features/nearby/components/NearbyChrome';
import styles from '../../features/nearby/components/Nearby.module.css';
import { COUNTRY_INFO } from '../../features/nearby/domain';
import { paths } from '../../routes';

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label}>
      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function CollectionsPage() {
  const personal = useExplorePersonal();
  return (
    <AppShell background="var(--bg-screen-b)" chrome="status">
      <div className={styles.screen}>
        <BackHeader title="Collections" fallback={paths.nearby} />
        <StorageWarning />
        <ul className={styles.list}>
          {COLLECTIONS.map((c) => {
            const p = collectionProgress(c, personal);
            const draft = !(c.status === 'published' && members(c).length === c.targetCount);
            return (
              <li key={c.id}>
                <article className={styles.panel} aria-labelledby={`coll-${c.id}`}>
                  <p className={styles.meta}>{COUNTRY_INFO[c.country].name}</p>
                  <h3 id={`coll-${c.id}`} className={styles.panelTitle}>
                    {collectionTitle(c)}
                  </h3>
                  <p className={styles.body}>{c.description}</p>
                  {draft && (
                    <p className={styles.note}>Draft: still waiting for the team editor’s check.</p>
                  )}
                  <p className={styles.body}>
                    <strong>
                      {p.visited} of {p.total} checked in
                    </strong>{' '}
                    · {p.percent}%
                  </p>
                  <ProgressBar percent={p.percent} label={`${collectionTitle(c)} progress`} />
                  <Link className={styles.primary} to={paths.collection(c.id)}>
                    Open the checklist
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
        <p className={styles.note}>Check-ins are self-reported and stay on this device.</p>
      </div>
    </AppShell>
  );
}
