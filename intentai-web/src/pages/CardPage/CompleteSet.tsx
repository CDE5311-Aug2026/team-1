// Figma 6 / 11 "That's all N cards here" + Collect stamp. Shown once every card of the place is opened. Collecting
// fires a spark (React Bits ClickSpark) and points to Moments; the stamp itself is a Nearby check-in, so the block
// says where to check in when that hasn't happened yet. Nothing new is stored.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ClickSpark from '../../components/reactbits/ClickSpark';
import { isCheckedIn, type HomePlace } from '../../data/home/places';
import { usePersistentStore } from '../../data/persistentStore';
import { explorePersonalStore } from '../../data/stores';
import { paths } from '../../routes';
import HomeIcon from '../TodayPage/shared/HomeIcon';
import styles from './CardPage.module.css';

export default function CompleteSet({ place }: { place: HomePlace }) {
  const [personal] = usePersistentStore(explorePersonalStore);
  const [collected, setCollected] = useState(false);
  const checkedIn = isCheckedIn(place, personal);
  const n = place.cards.length;

  return (
    <section className={styles.complete} aria-labelledby="complete-title">
      <span className={styles.completeStamp} aria-hidden="true">
        <HomeIcon name="stamp" size={28} />
      </span>
      <h2 id="complete-title" className={styles.completeTitle}>
        {n === 1 ? 'That’s the only card here' : `That’s all ${n} cards here`}
      </h2>
      <p className={styles.completeText}>
        {checkedIn
          ? `You’re checked in at ${place.short}, so its stamp is in your passport.`
          : `Check in at ${place.short} to add it to your passport.`}
      </p>
      <div className={styles.completeActions}>
        <ClickSpark sparkColor={['#e4671f', '#f4b389', '#a3400a']} sparkCount={12} sparkRadius={34} sparkSize={9} disabled={collected}>
          <button type="button" className={styles.collect} onClick={() => setCollected(true)} aria-pressed={collected}>
            <HomeIcon name={collected ? 'check' : 'stamp'} size={18} stroke={2.2} />
            {collected ? 'Collected' : 'Collect stamp'}
          </button>
        </ClickSpark>
        <Link className={styles.completeLink} to={checkedIn ? paths.moments : paths.place(place.id)}>
          {checkedIn ? 'Open Moments' : 'Check in on the place page'}
        </Link>
      </div>
      {collected && (
        <p className={styles.completeNote} role="status">
          {checkedIn ? 'See it in Moments.' : 'Your stamp shows in Moments once you check in here.'}
        </p>
      )}
    </section>
  );
}
