import sliders from '../../assets/my-space/section-sliders.svg';
import user from '../../assets/my-space/section-user.svg';
import { usePersistentStore } from '../../data/persistentStore';
import { noticesStore, settingsStore } from '../../data/stores';
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

  return (
    <MySpaceLayout tabBarNodeId="12:155">
      <div className={styles.body}>
        <SegmentNav active="about" count={count} nodeIds={{ root: '21:1338', about: '21:1339', notices: '21:1341' }} />
        <SectionHeading icon={user} title="What the app knows" nodeId="21:1345" />
        <ProfileCard nodeId="21:1347" />
        <SectionHeading icon={sliders} title="Switches" aside="All off by default" nodeId="21:1380" />
        <SwitchesCard nodeId="21:1384" />
      </div>
    </MySpaceLayout>
  );
}
