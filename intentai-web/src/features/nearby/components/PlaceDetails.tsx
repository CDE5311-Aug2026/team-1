// Practical details, like a maps app's place card: hours, address, phone, website, Apple Maps, and what people say
// (links to review pages and one sentence in our own words). Everything was checked on a page, shown in Sources;
// a detail that could not be confirmed is simply not here.
import { useState } from 'react';
import type { CuratedPlace, SourceReference } from '../domain';
import { appleMapsUrl } from '../links';
import { Icon, type IconName } from './icons';
import styles from './Nearby.module.css';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function Row({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <li className={styles.detailRow}>
      <span className={styles.detailIcon} aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.detailText}>
        <span className={styles.detailLabel}>{label}</span>
        <span className={styles.detailValue}>{children}</span>
      </span>
    </li>
  );
}

export default function PlaceDetails({ place, panel, idPrefix }: { place: CuratedPlace; panel: string; idPrefix: string }) {
  const d = place.details ?? {};
  const [copied, setCopied] = useState(false);
  const copyAddress = async () => {
    if (!d.address) return;
    try {
      await navigator.clipboard.writeText(d.address.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const sources: { what: string; s: SourceReference }[] = [
    d.hours && { what: 'Hours', s: d.hours.source },
    d.address && { what: 'Address', s: d.address.source },
    d.phone && { what: 'Phone', s: d.phone.source },
    d.website && d.website.source.url !== d.website.url && { what: 'Website', s: d.website.source },
    ...(d.reviewSummary?.sources ?? []).map((s) => ({ what: 'What people say', s })),
  ].filter((x): x is { what: string; s: SourceReference } => !!x);
  const checked = sources.map((x) => x.s.checkedAt).sort().pop();
  // one line per page: "Hours, Address, Phone: MICHELIN Guide page"
  const pages = new Map<string, { what: string[]; s: SourceReference }>();
  for (const { what, s: src } of sources) {
    const k = src.url || src.title;
    const g = pages.get(k);
    if (g) {
      if (!g.what.includes(what)) g.what.push(what);
    } else pages.set(k, { what: [what], s: src });
  }

  return (
    <section className={panel} aria-labelledby={`${idPrefix}-details-title`}>
      <h2 id={`${idPrefix}-details-title`} className={styles.panelTitle}>
        Details
      </h2>
      <ul className={styles.detailRows}>
        {d.hours && (
          <Row icon="clock" label="Hours">
            {d.hours.text}
            <span className={styles.detailNote}>Hours can change: check before you go.</span>
          </Row>
        )}
        {d.address && (
          <Row icon="pin" label="Address">
            <span lang="en-SG">{d.address.text}</span>
            <button type="button" className={styles.textButtonInline} onClick={copyAddress} aria-label={`Copy the address of ${place.name}`}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </Row>
        )}
        {d.phone && (
          <Row icon="phone" label="Phone">
            <a className={styles.detailLink} href={`tel:${d.phone.text.replace(/\s+/g, '')}`}>
              {d.phone.text}
            </a>
          </Row>
        )}
        {d.website && (
          <Row icon="globe" label="Website">
            <a className={styles.detailLink} href={d.website.url} target="_blank" rel="noopener noreferrer">
              {hostOf(d.website.url)} ↗
            </a>
          </Row>
        )}
        <Row icon="map" label="Maps">
          <a className={styles.detailLink} href={appleMapsUrl(place)} target="_blank" rel="noopener noreferrer" aria-label="Open in Apple Maps (opens Apple Maps)">
            Open in Apple Maps ↗
          </a>
        </Row>
      </ul>

      {(d.reviewSummary || (d.reviews && d.reviews.length > 0)) && (
        <div className={styles.reviews}>
          <h3 className={styles.reviewsTitle}>
            <Icon name="quote" size={16} /> What people say
          </h3>
          {d.reviewSummary && <p className={styles.body}>{d.reviewSummary.text}</p>}
          {d.reviews && d.reviews.length > 0 && (
            <ul className={styles.reviewLinks} aria-label="Reviews on other sites">
              {d.reviews.map((r) => (
                <li key={r.url}>
                  <a className={styles.reviewChip} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`${r.publisher}: ${r.title} (opens the site)`}>
                    {r.publisher} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
          {d.reviewSummary && <p className={styles.sourceLine}>Summary written by the IntentAI team from the pages in Sources. Read the full reviews on each site.</p>}
        </div>
      )}

      {sources.length > 0 && (
        <details className={styles.fold}>
          <summary className={styles.foldSummary}>Checked {checked} · Sources</summary>
          <div className={styles.foldBody}>
            {[...pages.entries()].map(([k, { what, s }]) => (
              <p key={k} className={styles.sourceLine}>
                {what.join(', ')}:{' '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>{' '}
                ({s.publisher}, checked {s.checkedAt})
              </p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
