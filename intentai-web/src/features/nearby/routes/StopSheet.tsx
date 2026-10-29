// A route stop that is not in the Nearby catalogue yet: the atlas record in a bottom sheet (native <dialog>: focus
// trap, Escape, focus return). Summary, fun fact with its source, hours, price, access, booking, a review summary
// with platform and date, and the research sources.
import { useEffect, useId, useRef } from 'react';
import { ATLAS_CATEGORY_LABEL, atlasCollections, atlasTextLang } from '../../../data/atlas/atlas';
import { Icon } from '../components/icons';
import type { AtlasPlace } from '../../../data/atlas/atlas';
import type { RouteStop } from './model';
import { StopPicture, Txt } from './parts';
import styles from './Routes.module.css';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function StopSheet({ stop, number, onClose }: { stop: RouteStop & { atlas: AtlasPlace }; number: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const backdrop = (event: MouseEvent) => {
      if (event.target === dialog) onCloseRef.current();
    };
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('click', backdrop);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('click', backdrop);
      if (dialog.open) dialog.close();
      if (previous && previous !== document.body && previous.isConnected) previous.focus();
    };
  }, []);

  const p = stop.atlas;
  const t = (f: Parameters<typeof atlasTextLang>[1]) => atlasTextLang(p.id, f);
  const review = p.review;
  const collections = atlasCollections(p.id);
  const rows: [string, ReturnType<typeof t>][] = [
    ['Hours', t('hours')],
    ['Price', t('price')],
    ['Getting in', t('access_notes')],
    ['Booking', t('booking_note')],
  ];

  return (
    <dialog ref={ref} className={styles.sheet} aria-labelledby={titleId}>
      <div className={styles.sheetPanel}>
        <span className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetHeading}>
          <StopPicture stop={stop} size="small" />
          <div className={styles.sheetTitleText}>
            <p className={styles.kicker}>Stop {number}</p>
            <h2 id={titleId} className={styles.sheetTitle}>
              {stop.name}
            </h2>
            <p className={styles.zhName} lang="zh-Hans">
              {p.name_zh}
            </p>
          </div>
          <button type="button" className={styles.sheetClose} aria-label="Close" onClick={onClose} autoFocus>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={styles.sheetBody}>
          <p className={styles.meta}>
            {ATLAS_CATEGORY_LABEL[p.category]} · <Txt t={t('area')} /> · about {stop.visitMinutes} min
          </p>
          {stop.warnings.length > 0 && (
            <ul className={styles.warnings} aria-label="Before you go">
              {stop.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p className={styles.text}>
            <Txt t={t('summary')} />
          </p>
          {t('fun_fact') && (
            <div className={styles.fact}>
              <h3 className={styles.factTitle}>Fun fact</h3>
              <p className={styles.text}>
                <Txt t={t('fun_fact')} />
              </p>
              {p.fun_fact_source && (
                <a className={styles.link} href={p.fun_fact_source} target="_blank" rel="noopener noreferrer">
                  Source: {hostOf(p.fun_fact_source)}
                  <span className={styles.srOnly}> (opens in a new tab)</span>
                </a>
              )}
            </div>
          )}
          <dl className={styles.facts}>
            {rows
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <div key={label} className={styles.factRow}>
                  <dt>{label}</dt>
                  <dd>
                    <Txt t={v} />
                  </dd>
                </div>
              ))}
            {p.address && (
              <div className={styles.factRow}>
                <dt>Address</dt>
                <dd>{p.address}</dd>
              </div>
            )}
          </dl>
          {stop.approximate && <p className={styles.note}>The position on the map is approximate.</p>}
          {review?.summary && (
            <div className={styles.fact}>
              <h3 className={styles.factTitle}>What a reviewer said</h3>
              <p className={styles.text}>
                <Txt t={t('review_summary')} />
              </p>
              <p className={styles.note}>
                {review.platform}
                {review.review_date ? ` · ${review.review_date}` : ''} · one person’s visit, not an overall rating
              </p>
              {review.url && (
                <a className={styles.link} href={review.url} target="_blank" rel="noopener noreferrer">
                  Read it on {review.platform}
                  <span className={styles.srOnly}> (opens in a new tab)</span>
                </a>
              )}
            </div>
          )}
          {collections.length > 0 && (
            <p className={styles.note}>
              In the atlas’s collections:{' '}
              {collections.map((c, i) => (
                <span key={c.text}>
                  {i > 0 && ', '}
                  <Txt t={c} />
                </span>
              ))}
            </p>
          )}
          {p.maps_url && (
            <a className={styles.secondaryLink} href={p.maps_url} target="_blank" rel="noopener noreferrer">
              <Icon name="map" size={18} />
              Open in Google Maps
              <span className={styles.srOnly}> (opens in a new tab)</span>
            </a>
          )}
          {p.sources.length > 0 && (
            <details className={styles.fold}>
              <summary className={styles.foldSummary}>Sources ({p.sources.length})</summary>
              <ul className={styles.sources}>
                {p.sources.map((s) => (
                  <li key={s.url + s.title}>
                    <a className={styles.link} href={s.url} target="_blank" rel="noopener noreferrer" lang="zh-Hans">
                      {s.title}
                    </a>{' '}
                    <span className={styles.note}>({hostOf(s.url)})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className={styles.note}>From the Singapore Culture Atlas research snapshot (29 Oct 2026). This place is not in Nearby’s catalogue yet.</p>
        </div>
      </div>
    </dialog>
  );
}
