import calendar from '../../assets/my-space/detail-calendar.svg';
import sliders from '../../assets/my-space/section-sliders.svg';
import user from '../../assets/my-space/section-user.svg';
import { useNavigate } from 'react-router-dom';
import { categoryLabel } from '../../data/culture';
import { canonicalPrefs } from '../../data/culturePrefs';
import { usePersistentStore } from '../../data/persistentStore';
import { culturePrefsStore, noticesStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import MySpaceLayout from './MySpaceLayout/MySpaceLayout';
import ProfileCard from './ProfileCard/ProfileCard';
import SectionHeading from './SectionHeading/SectionHeading';
import SegmentNav from './SegmentNav/SegmentNav';
import SwitchesCard from './SwitchesCard/SwitchesCard';
import { noticeCount } from './notices';
import styles from './MySpacePage.module.css';

/** Figma 12:40 "1 My Space — About you". */
export default function MySpacePage() {
  const [notices] = usePersistentStore(noticesStore);
  const [settings] = usePersistentStore(settingsStore);
  const count = noticeCount(notices.dismissed, settings.occasions ? notices.status : 'hidden');
  const [prefs] = usePersistentStore(culturePrefsStore);
  const { categories } = canonicalPrefs(prefs.categories);
  const navigate = useNavigate();

  return (
    <MySpaceLayout tabBarNodeId="12:155">
      <div className={styles.body}>
        <SegmentNav active="about" count={count} nodeIds={{ root: '21:1338', about: '21:1339', notices: '21:1341' }} />
        <SectionHeading icon={user} title="What the app knows" nodeId="21:1345" />
        <ProfileCard nodeId="21:1347" />
        <SectionHeading icon={sliders} title="Switches" aside="All off by default" nodeId="21:1380" />
        <SwitchesCard nodeId="21:1384" />
        {/* v2, no Figma frame: appended last so the Figma-measured sections above keep their place. */}
        <SectionHeading icon={calendar} title="Today" />
        <div className={styles.todayCard}>
          <p className={styles.todayPicks}>
            {categories.map(categoryLabel).join(', ')}
          </p>
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => navigate(`${paths.todaySetup}?from=my-space`)}
          >
            Change Today&apos;s Topics
          </button>
        </div>
      </div>
    </MySpaceLayout>
  );
}
