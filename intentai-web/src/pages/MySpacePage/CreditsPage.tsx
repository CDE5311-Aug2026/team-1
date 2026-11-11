// My Space › Photo credits (board 22), split out of Terms & licences. The Nearby place photos (photos.json) are grouped
// by their Tourism 2040 category, as on the board; the other photo groups of creditGroups() follow under their own
// names. Every line is the credit as recorded with the photo, linked to its source where there is one.
import AppShell from '../../components/AppShell/AppShell';
import CategoryGlyph from '../../components/Category/CategoryGlyph';
import { categoryPhoto } from '../../components/ProfileEditors/TourismRanker';
import placePhotos from '../../data/explore/photos.json';
import { TOURISM_CATEGORIES, TOURISM_INFO, tourismOf, type TourismCategory } from '../../data/tourism';
import { curatedPlace } from '../../features/nearby/catalogue';
import { paths } from '../../routes';
import Icon from '../OnboardingPage/v3/icons';
import { creditGroups, type Credit } from './LicencesPage';
import { Kraft, SubHeader } from './v3/Parts';
import book from './v3/Booklet.module.css';
import styles from './v3/MySpace.module.css';

interface Group {
  key: string;
  title: string;
  items: Credit[];
  category?: TourismCategory;
}

/** Nearby place photos by category; a place not yet sorted into one goes under "Other places". */
export function placePhotoGroups(): Group[] {
  const photos = (placePhotos as { photos: Record<string, { credit: string; source: string }> }).photos;
  const by = new Map<TourismCategory | 'other', Credit[]>();
  for (const [id, p] of Object.entries(photos)) {
    const place = curatedPlace(id);
    const key = (place && tourismOf(place)) ?? 'other';
    const list = by.get(key) ?? [];
    list.push({ subject: place?.name ?? id, credit: p.credit, href: p.source });
    by.set(key, list);
  }
  const sorted = (list: Credit[]) => [...list].sort((a, b) => a.subject.localeCompare(b.subject));
  const groups: Group[] = TOURISM_CATEGORIES.filter((c) => by.has(c)).map((c) => ({
    key: c,
    title: TOURISM_INFO[c].label,
    items: sorted(by.get(c)!),
    category: c,
  }));
  if (by.has('other')) groups.push({ key: 'other', title: 'Other places', items: sorted(by.get('other')!) });
  return groups;
}

/** Every group the page shows: places by category, then the app's other photo groups. */
export function photoCreditGroups(): Group[] {
  const rest = creditGroups()
    .filter((g) => !['Maps', 'Community', 'Nearby places'].includes(g.title))
    .map((g) => ({ key: g.title, title: g.title, items: g.items }));
  return [...placePhotoGroups(), ...rest];
}

const idOf = (key: string) => `credits-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function CreditGroup({ g }: { g: Group }) {
  const info = g.category ? TOURISM_INFO[g.category] : undefined;
  const thumb = g.category ? categoryPhoto(g.category) : undefined;
  return (
    <section
      className={styles.creditCard}
      aria-labelledby={idOf(g.key)}
      style={info ? ({ '--head-tint': info.tint, '--head-ink': info.ink } as React.CSSProperties) : undefined}
    >
      <div className={styles.creditHead}>
        {thumb ? (
          <img className={styles.creditThumb} src={thumb.src} alt="" />
        ) : (
          <span className={styles.creditThumb} aria-hidden="true">
            {g.category ? <CategoryGlyph category={g.category} size={18} color={info!.ink} /> : <Icon name="gallery" size={18} />}
          </span>
        )}
        <h2 className={styles.creditTitle} id={idOf(g.key)}>
          {g.title}
        </h2>
        <span className={styles.creditCount}>
          {g.items.length} {g.items.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>
      <ul className={styles.creditRows}>
        {g.items.map((c) => (
          <li key={`${c.subject}|${c.credit}`}>
            <span>{c.subject}</span>
            <span className={styles.creditBy}>
              {c.href ? (
                <a href={c.href} target="_blank" rel="noreferrer">
                  {c.credit}
                </a>
              ) : (
                c.credit
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CreditsPage() {
  return (
    <AppShell background="var(--bg-app)" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Photo credits" back={paths.licences} />
        <p className={styles.lead}>
          Place photos come from Wikimedia Commons contributors and the other sources shown, under the licences named on each line. Tap a credit to
          open its source.
        </p>
        {photoCreditGroups().map((g) => (
          <CreditGroup key={g.key} g={g} />
        ))}
      </div>
    </AppShell>
  );
}
