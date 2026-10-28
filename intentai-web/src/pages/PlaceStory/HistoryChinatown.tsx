import { CollectCard, SampleVideo, StoryHeader, Timeline, useCountUp, type TimelineRow } from '../../components/story';
import { CHINATOWN_HISTORY as H } from '../../data/stories/chinatown';
import { paths } from '../../routes';
import styles from './HistoryChinatown.module.css';

interface HistoryChinatownProps {
  placeId: string;
}

/** History card 4 of 4 for Chinatown: the 1822 town plan to today, with the passport stamp. */
export default function HistoryChinatown({ placeId }: HistoryChinatownProps) {
  const k = useCountUp(900, 1500);
  const count = (to: number) => Math.round(to * k).toLocaleString('en-US');

  const rows: TimelineRow[] = [
    {
      date: '1822 · THE TOWN PLAN',
      text: H.planText,
      dot: 'fill',
      delay: 0.5,
      dotDelay: 0.6,
      extra: (
        <>
          <div className={styles.map}>
            <img className={styles.plan} src={H.plan.src} alt={H.plan.alt} />
            <span aria-hidden="true" className={styles.oval}>
              <span className={`mark ${styles.ring}`} />
              <span className={`${styles.ring} ${styles.fillRing}`} />
            </span>
            <span className={styles.label}>{H.plan.label}</span>
          </div>
          <p className={styles.credit}>{H.plan.credit}</p>
        </>
      ),
    },
    {
      date: '1824',
      text: (
        <>
          <b className={styles.num}>{count(H.people.to)}</b>
          {H.people.after}
        </>
      ),
      dot: 'ring',
      delay: 0.7,
      dotDelay: 0.8,
    },
    { date: 'THE NAME', text: H.nameText, dot: 'ring', delay: 0.85, dotDelay: 0.95 },
    {
      date: 'STREET BY STREET',
      text: H.streetText,
      dot: 'ring',
      delay: 1,
      dotDelay: 1.1,
      extra: (
        <div className={styles.chips}>
          {H.chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
            </span>
          ))}
        </div>
      ),
    },
    {
      date: '1989 · 7 JUL',
      text: (
        <>
          <b className={styles.num}>{count(H.buildings.to)}</b>
          {H.buildings.after}
        </>
      ),
      dot: 'fill',
      delay: 1.15,
      dotDelay: 1.25,
    },
    { date: '2002 → TODAY', text: H.todayText, dot: 'here', delay: 1.3, dotDelay: 1.4, image: H.today },
  ];

  return (
    <>
      <StoryHeader kicker={H.kicker} icon="history" title={H.title} subtitle={H.subtitle} />

      <SampleVideo poster={H.video.poster} title={H.video.title} duration={H.video.duration} captions={H.video.captions} top={16} />

      <Timeline rows={rows} source={H.source} longSpine />

      <CollectCard
        placeId={placeId}
        title={H.collect.title}
        note={H.collect}
        stampIcon="house"
        secondary={{ label: 'Home', to: paths.today, state: { focusPlace: placeId }, replace: true }}
      />
    </>
  );
}
