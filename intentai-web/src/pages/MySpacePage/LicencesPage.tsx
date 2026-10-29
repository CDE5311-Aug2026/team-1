// My Space › Settings › Terms & licences (ported from PR #5's LicencesPage, was a sheet in Settings): the one-line
// terms, the map attribution and every photo credit in the app, grouped by where the photos appear.
import type { ReactNode } from 'react';
import { STORY_IMAGES } from '../../assets/stories';
import { V3_PHOTO_CREDITS } from '../../assets/v3/credits';
import AppShell from '../../components/AppShell/AppShell';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import placePhotos from '../../data/explore/photos.json';
import { HOME_PLACES } from '../../data/homePlaces';
import { curatedPlace } from '../../features/nearby/catalogue';
import { THUMB_CREDIT } from '../../features/nearby/thumbs';
import { paths } from '../../routes';
import { SubHeader } from './v3/Parts';
import styles from './v3/MySpace.module.css';

export const TERMS = 'IntentAI is a student prototype for a user test. Your data stays on this phone.';
export const OSM_CREDIT = '© OpenStreetMap contributors';

interface Credit {
  subject: string;
  credit: string;
  href?: string;
}

/** One entry per subject and credit line. */
const unique = (list: Credit[]) => list.filter((c, i) => list.findIndex((o) => o.subject === c.subject && o.credit === c.credit) === i);

export function creditGroups(): { title: string; items: Credit[] }[] {
  const nearby = Object.entries((placePhotos as { photos: Record<string, { credit: string; source: string }> }).photos).map(([id, p]) => ({
    subject: curatedPlace(id)?.name ?? id,
    credit: `${p.credit}, via Wikimedia Commons`,
    href: p.source,
  }));
  return [
    { title: 'Maps', items: [{ subject: 'Map picture', credit: OSM_CREDIT }, { subject: '3D map views', credit: THUMB_CREDIT }] },
    {
      title: 'Culture cards',
      items: unique([
        ...Object.values(ARTICLE_IMAGES).map((p) => ({ subject: p.alt, credit: p.credit, href: p.url })),
        ...V3_PHOTO_CREDITS.map((c) => ({ subject: c.subject, credit: c.credit })),
      ]),
    },
    { title: 'Place stories', items: unique(Object.values(STORY_IMAGES).map((p) => ({ subject: p.alt, credit: p.credit }))) },
    {
      title: 'Home places',
      items: unique(HOME_PLACES.filter((p) => p.credit !== THUMB_CREDIT).map((p) => ({ subject: p.name, credit: p.credit }))),
    },
    { title: 'Nearby places', items: unique(nearby) },
    {
      title: 'Community',
      items: [
        { subject: 'Community avatars', credit: 'DiceBear “Notionists” by Zoish · CC0 1.0', href: 'https://www.dicebear.com/styles/notionists/' },
        {
          subject: 'Community portraits and question photos',
          credit: 'IntentAI community card kit: AI-generated illustrations of fictional people and everyday scenes',
        },
        { subject: 'Demo community', credit: 'This demo build shows illustrative community members, questions and activity.' },
      ],
    },
  ];
}

function Item({ c }: { c: Credit }): ReactNode {
  return (
    <li>
      <span className={styles.creditSubject}>{c.subject}</span>
      {c.href ? (
        <a href={c.href} target="_blank" rel="noreferrer">
          {c.credit}
        </a>
      ) : (
        <span>{c.credit}</span>
      )}
    </li>
  );
}

export default function LicencesPage() {
  return (
    <AppShell background="#edebe5">
      <div className={styles.screen}>
        <SubHeader back={paths.mySpaceSettings} />
        <h1 className={styles.pageTitle}>Terms &amp; licences</h1>
        <p className={styles.licenceTerms}>{TERMS}</p>
        {creditGroups().map((g) => (
          <section key={g.title} className={styles.licenceSection} aria-labelledby={`licences-${g.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <h2 className={styles.kicker} id={`licences-${g.title.toLowerCase().replace(/\s+/g, '-')}`}>
              {g.title}
            </h2>
            <ul className={`${styles.card} ${styles.licenceList}`}>
              {g.items.map((c) => (
                <Item key={`${c.subject}|${c.credit}`} c={c} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
