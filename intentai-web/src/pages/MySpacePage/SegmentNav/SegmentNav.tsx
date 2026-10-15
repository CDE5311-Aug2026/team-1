import { useNavigate } from 'react-router-dom';
import bellActive from '../../../assets/my-space/seg-bell-active.svg';
import bell from '../../../assets/my-space/seg-bell.svg';
import userActive from '../../../assets/my-space/seg-user-active.svg';
import user from '../../../assets/my-space/seg-user.svg';
import { paths } from '../../../routes';
import styles from './SegmentNav.module.css';

export interface SegmentNodeIds {
  root: string;
  about: string;
  notices: string;
}

interface SegmentNavProps {
  active: 'about' | 'notices';
  count: number;
  nodeIds: SegmentNodeIds;
}

/** "Segment / My Space": switches between About you (12:40) and Notices (12:182). */
export default function SegmentNav({ active, count, nodeIds }: SegmentNavProps) {
  const navigate = useNavigate();
  const isAbout = active === 'about';
  const itemClass = (on: boolean) => (on ? `${styles.item} ${styles.active}` : styles.item);

  return (
    <nav className={styles.segment} aria-label="My Space" data-node-id={nodeIds.root}>
      <button
        type="button"
        className={itemClass(isAbout)}
        aria-current={isAbout ? 'page' : undefined}
        onClick={() => navigate(paths.mySpace)}
        data-node-id={nodeIds.about}
      >
        <img src={isAbout ? userActive : user} alt="" width={15} height={15} />
        About you
      </button>
      <button
        type="button"
        className={itemClass(!isAbout)}
        aria-current={isAbout ? undefined : 'page'}
        onClick={() => navigate(paths.notices)}
        data-node-id={nodeIds.notices}
      >
        <img src={isAbout ? bell : bellActive} alt="" width={15} height={15} />
        Notices
        <span className={styles.count}>
          <span className={styles.srOnly}>, </span>
          {count}
          <span className={styles.srOnly}> waiting</span>
        </span>
      </button>
    </nav>
  );
}
