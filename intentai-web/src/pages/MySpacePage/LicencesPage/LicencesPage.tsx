import { STORY_IMAGES } from '../../../assets/stories';
import { ARTICLE_IMAGES } from '../../../data/articleImages';
import { HOME_PLACES } from '../../../data/homePlaces';
import { PHOTOS } from '../../Onboarding/options';
import MySpaceLayout from '../MySpaceLayout/MySpaceLayout';
import styles from './LicencesPage.module.css';

export const OSM_CREDIT = '© OpenStreetMap contributors';
export const TERMS = 'IntentAI is a student prototype. Your data stays on this phone.';

/** Every photo credit in the app, once each. */
export function photoCredits(): string[] {
  const all = [...Object.values(PHOTOS), ...Object.values(STORY_IMAGES), ...Object.values(ARTICLE_IMAGES), ...HOME_PLACES].map((p) => p.credit);
  return [...new Set(all.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Terms & licences: the one-line terms, the map attribution and the photo credits. */
export default function LicencesPage() {
  return (
    <MySpaceLayout subPage={{ title: 'Terms & licences' }}>
      <div className={styles.body}>
        <p className={styles.terms}>{TERMS}</p>
        <h2 className={styles.heading}>Maps</h2>
        <p className={styles.card}>{OSM_CREDIT}</p>
        <h2 className={styles.heading}>Photos</h2>
        <ul className={styles.card}>
          {photoCredits().map((credit) => (
            <li key={credit}>{credit}</li>
          ))}
        </ul>
      </div>
    </MySpaceLayout>
  );
}
