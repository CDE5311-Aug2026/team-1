// My Space › Settings › Terms & licences (board 21): what FindSG is, the map sources, content licences and the short
// terms. Every photo credit now lives on its own Photo credits page (board 22, CreditsPage), which reads the same
// creditGroups() list kept here.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { STORY_IMAGES } from '../../assets/stories';
import { V3_PHOTO_CREDITS } from '../../assets/v3/credits';
import AppShell from '../../components/AppShell/AppShell';
import { ARTICLE_IMAGES } from '../../data/articleImages';
import { todaysHoliday } from '../../data/holiday';
import { PLACE_CARDS } from '../../data/explore/placeCards';
import placePhotos from '../../data/explore/photos.json';
import { HOME_PLACES } from '../../data/homePlaces';
import { URA_SOURCE } from '../../data/ura/ura';
import { curatedPlace } from '../../features/nearby/catalogue';
import { THUMB_CREDIT } from '../../features/nearby/thumbs';
import { paths } from '../../routes';
import Icon from '../OnboardingPage/v3/icons';
import { RowIcon, Section, type Tint } from './SettingsParts';
import type { IconName } from '../OnboardingPage/v3/icons';
import { Kraft, SubHeader } from './v3/Parts';
import book from './v3/Booklet.module.css';
import styles from './v3/MySpace.module.css';

export const TERMS = 'FindSG is a student prototype for a user test. Your data stays on this phone.';
export const OSM_CREDIT = '© OpenStreetMap contributors';

export interface Credit {
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
    {
      title: 'Maps',
      items: [
        { subject: 'Map picture', credit: OSM_CREDIT },
        { subject: 'Street-level map', credit: 'OneMap © contributors | Singapore Land Authority', href: 'https://www.onemap.gov.sg/' },
        { subject: '3D map views', credit: THUMB_CREDIT },
      ],
    },
    {
      title: 'Culture cards',
      items: unique([
        ...Object.values(ARTICLE_IMAGES).map((p) => ({ subject: p.alt, credit: p.credit, href: p.url })),
        ...V3_PHOTO_CREDITS.map((c) => ({ subject: c.subject, credit: c.credit })),
      ]),
    },
    { title: 'Holidays', items: [{ subject: todaysHoliday.image.alt, credit: todaysHoliday.image.credit, href: todaysHoliday.image.url }] },
    { title: 'Place stories', items: unique(Object.values(STORY_IMAGES).map((p) => ({ subject: p.alt, credit: p.credit }))) },
    {
      title: 'Home places',
      items: unique(HOME_PLACES.filter((p) => p.credit !== THUMB_CREDIT).map((p) => ({ subject: p.name, credit: p.credit }))),
    },
    { title: 'Nearby places', items: unique(nearby) },
    {
      title: 'Nearby place cards',
      items: unique(
        Object.values(PLACE_CARDS).flatMap((c) =>
          [c.clip?.poster, c.thenNow?.then, c.thenNow?.now]
            .filter((p) => !!p?.url)
            .map((p) => ({ subject: p!.alt, credit: p!.credit, href: p!.url })),
        ),
      ),
    },
    {
      title: 'Community',
      items: [
        { subject: 'Community avatars', credit: 'DiceBear “Notionists” by Zoish · CC0 1.0', href: 'https://www.dicebear.com/styles/notionists/' },
        {
          subject: 'Community portraits and question photos',
          credit: 'FindSG community card kit: AI-generated illustrations of fictional people and everyday scenes',
        },
        { subject: 'Demo community', credit: 'This demo build shows illustrative community members, questions and activity.' },
      ],
    },
  ];
}

const groupOf = (title: string) => creditGroups().find((g) => g.title === title)?.items ?? [];

function Line({ icon, tint, title, children, tag }: { icon: IconName; tint: Tint; title: string; children: ReactNode; tag?: string }) {
  return (
    <li className={styles.switchRow}>
      <RowIcon icon={icon} tint={tint} />
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSub}>{children}</span>
      </span>
      {tag && <span className={`${styles.tag} ${styles.tagBlue}`}>{tag}</span>}
    </li>
  );
}

const ext = (href: string | undefined, text: string) =>
  href ? (
    <a className={styles.inlineLink} href={href} target="_blank" rel="noreferrer">
      {text}
    </a>
  ) : (
    text
  );

export default function LicencesPage() {
  const [osm, onemap, thumbs] = groupOf('Maps');
  const community = groupOf('Community');
  const photoCount = creditGroups()
    .filter((g) => !['Maps', 'Community'].includes(g.title))
    .reduce((n, g) => n + g.items.length, 0);

  return (
    <AppShell background="var(--bg-app)" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Terms & licences" back={paths.mySpaceSettings} />
        <section className={styles.hero} aria-label="About FindSG">
          <span className={styles.heroShield} style={{ background: 'var(--assist-bg)', color: 'var(--accent-ink)' }} aria-hidden="true">
            <Icon name="book" size={20} />
          </span>
          <div>
            <h2 className={styles.heroTitle}>FindSG is a student prototype for a user test.</h2>
            <p className={styles.heroText}>
              Your data stays on this phone. The app is not affiliated with the Singapore Tourism Board; the four categories follow the public
              Tourism 2040 factsheet.
            </p>
          </div>
        </section>
        <p className={styles.srOnly}>{TERMS}</p>

        <Section title="Maps">
          <ul className={`${styles.card} ${styles.lines}`}>
            <Line icon="grid" tint="cru" title="Region shapes" tag="URA">
              {ext(URA_SOURCE.url, `${URA_SOURCE.title}, ${URA_SOURCE.publisher}`)} · {ext(URA_SOURCE.licenceUrl, URA_SOURCE.licence)}
            </Line>
            <Line icon="pin" tint="wel" title={onemap.subject}>
              {ext(onemap.href, onemap.credit)}
            </Line>
            <Line icon="globe" tint="cru" title={osm.subject}>
              {osm.credit}
            </Line>
            {thumbs && (
              <Line icon="cards" tint="purple" title={thumbs.subject}>
                {thumbs.credit}
              </Line>
            )}
          </ul>
        </Section>

        <Section title="Content">
          <ul className={`${styles.card} ${styles.lines}`}>
            <li>
              <Link to={paths.credits} className={styles.row}>
                <RowIcon icon="gallery" tint="lei" />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>Place photos</span>
                  <span className={styles.rowSub}>Wikimedia Commons contributors and others, each credited on Photo credits</span>
                </span>
                <span className={styles.rowValue}>{photoCount}</span>
                <Icon name="chevron" size={18} className={styles.rowChevron} />
              </Link>
            </li>
            {community.map((c, i) => (
              <Line key={c.subject} icon={i === 0 ? 'people' : 'user'} tint="purple" title={c.subject} tag={i === 0 ? 'CC0 1.0' : undefined}>
                {ext(c.href, c.credit)}
              </Line>
            ))}
            <Line icon="text" tint="att" title="Fonts">
              Oswald, Inter, IBM Plex Mono, IM Fell English (OFL) and Special Elite (Apache 2.0), bundled with the app via Fontsource
            </Line>
          </ul>
        </Section>

        <Section title="Terms">
          <ul className={`${styles.card} ${styles.lines}`}>
            <Line icon="badge" tint="att" title="Play, not prizes">
              Stamps, times and leaderboards confer no rights or rewards.
            </Line>
            <Line icon="lock" tint="wel" title="Your data stays here">
              What you save is kept on this phone; Privacy & data shows it and deletes it.
            </Line>
            <Line icon="flag" tint="lei" title="Content as is">
              Opening hours and prices may change; check before you go.
            </Line>
          </ul>
        </Section>
      </div>
    </AppShell>
  );
}
