// Settings › Look & feel › Text size (board 19) on mySpacePrefs.textSize. The size is the root font scale (TEXT_SCALE,
// applied to <html> app-wide), so it scales the app's text, headings included (plan B6: no Dynamic Type claim). The
// preview card is a real catalogue place with its own summary.
import AppShell from '../../components/AppShell/AppShell';
import { CATEGORY_PLACE, categoryPhoto } from '../../components/ProfileEditors/TourismRanker';
import { usePersistentStore } from '../../data/persistentStore';
import { TEXT_SCALE, TEXT_SIZES, TEXT_SIZE_LABELS, mySpacePrefsStore, type TextSize } from '../../data/profile/profile';
import { TOURISM_INFO } from '../../data/tourism';
import { curatedPlace } from '../../features/nearby/catalogue';
import { paths } from '../../routes';
import { Changes, Section, Segmented } from './SettingsParts';
import { Kraft, SubHeader } from './v3/Parts';
import book from './v3/Booklet.module.css';
import styles from './v3/MySpace.module.css';

/** Base size of the preview's body text (rem at the Default step); the preview sets it from the chosen step. */
const PREVIEW_REM = 0.875;

export default function TextSizePage() {
  const [prefs, setPrefs] = usePersistentStore(mySpacePrefsStore);
  const place = curatedPlace(CATEGORY_PLACE.att.id);
  const photo = categoryPhoto('att');
  const scale = TEXT_SCALE[prefs.textSize];

  return (
    <AppShell background="var(--bg-app)" chrome="status">
      <Kraft />
      <div className={`${styles.screen} ${book.screen} ${styles.kraft}`}>
        <SubHeader title="Text size" back={paths.mySpaceSettings} />
        <p className={styles.lead}>Pick the size that reads comfortably outdoors. It scales the app’s text on every screen, and buttons grow with it.</p>
        <Segmented<string>
          label="Text size"
          value={String(prefs.textSize)}
          options={TEXT_SIZES.map((s) => ({ id: String(s), label: TEXT_SIZE_LABELS[s] }))}
          onChange={(v) => setPrefs((p) => ({ ...p, textSize: Number(v) as TextSize }))}
        />

        {place && (
          <Section title="Preview">
            <article className={`${styles.card} ${styles.placeCard}`}>
              {photo ? <img className={styles.placePhoto} src={photo.src} alt="" /> : <span className={styles.placePhoto} aria-hidden="true" />}
              <span className={styles.rowText}>
                {/* Root-relative, so it shows the new size even before the page reflows around it. */}
                <span className={styles.placeKicker} style={{ fontSize: `${0.625 * scale}rem` }}>
                  {TOURISM_INFO.att.label} · {place.kind}
                </span>
                <span className={styles.placeName} style={{ fontSize: `${1 * scale}rem`, lineHeight: 1.25 }}>
                  {place.name}
                </span>
                <p className={styles.placeSummary} data-testid="text-preview" style={{ fontSize: `${PREVIEW_REM * scale}rem` }}>
                  {place.summary}
                </p>
              </span>
            </article>
          </Section>
        )}

        <Section title="What changes">
          <Changes
            items={[
              { icon: 'text', tint: 'att', title: 'All text', text: `${TEXT_SIZE_LABELS[prefs.textSize]}: ${Math.round(scale * 100)}% of the standard size, on every screen.` },
              { icon: 'badge', tint: 'att', title: 'Buttons and chips', text: 'Grow with the text so they stay easy to tap.' },
              { icon: 'gallery', tint: 'lei', title: 'Headings', text: 'Scale too, so the order on each screen stays clear.' },
              { icon: 'globe', tint: 'cru', title: 'Browser zoom', text: 'Your browser’s own zoom still works on top of this.' },
            ]}
          />
        </Section>
      </div>
    </AppShell>
  );
}
