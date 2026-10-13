import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import back from '../../assets/my-space/back-chevron.svg';
import check from '../../assets/my-space/button-check.svg';
import x from '../../assets/my-space/button-x.svg';
import calendar from '../../assets/my-space/detail-calendar.svg';
import pencil from '../../assets/my-space/detail-pencil.svg';
import users from '../../assets/my-space/detail-users.svg';
import utensils from '../../assets/my-space/detail-utensils.svg';
import chat from '../../assets/my-space/link-chat.svg';
import dotAmber from '../../assets/my-space/dot-amber.svg';
import { usePersistentStore } from '../../data/persistentStore';
import { noticesStore, settingsStore } from '../../data/stores';
import { paths } from '../../routes';
import AskLocalDialog from './AskLocalDialog/AskLocalDialog';
import MySpaceLayout from './MySpaceLayout/MySpaceLayout';
import cardStyles from './NoticeCard/NoticeCard.module.css';
import screen from './DetailScreen.module.css';
import pageStyles from './MySpacePage.module.css';
import { useResolveNotice } from './notices';
import styles from './NoticeDetailsPage.module.css';

export type EditField = 'occasion' | 'with';

/** Figma 14:512 "3 AI output — Details". */
export default function NoticeDetailsPage() {
  const [notices] = usePersistentStore(noticesStore);
  const [settings] = usePersistentStore(settingsStore);
  const [asking, setAsking] = useState(false);
  const navigate = useNavigate();
  const resolve = useResolveNotice();

  const edit = (field: EditField) => navigate(paths.noticeEdit, { state: { field } });

  const fields: { key: EditField; label: string; icon: string; value: string; nodeId: string }[] = [
    { key: 'occasion', label: 'Occasion', icon: utensils, value: notices.occasion, nodeId: '21:1568' },
    { key: 'with', label: 'With', icon: users, value: notices.with, nodeId: '21:1575' },
  ];

  // Details and edit exist only for a pending notice, which needs Flag occasions on.
  if (!settings.occasions || notices.status !== 'pending') return <Navigate to={paths.notices} replace />;

  return (
    <MySpaceLayout tabBarNodeId="14:627">
      <div className={`${pageStyles.body} ${screen.body}`}>
        <button type="button" className={screen.back} onClick={() => navigate(paths.notices)}>
          <span className={screen.backRow} data-node-id="21:1550">
            <img src={back} alt="" width={16} height={16} />
            Notices
          </span>
        </button>

        <article className={`${screen.card} ${styles.card}`} data-node-id="21:1554">
          <div className={styles.headline}>
            <span className={`${cardStyles.chip} ${cardStyles.chipAmber}`}>
              <img src={dotAmber} alt="" width={6} height={6} />
              AI · Medium confidence
            </span>
            <h2 className={styles.title}>Thursday dinner</h2>
            <p className={styles.subtitle}>Seating occasion · Thu 7 pm</p>
          </div>

          <section className={styles.why} aria-labelledby="why-label">
            <h3 id="why-label" className={screen.label}>
              WHY
            </h3>
            <div className={styles.quote}>
              <p className={styles.quoteTitle}>
                <img src={calendar} alt="" width={16} height={16} />
                “Team dinner @ Jumbo, Thu 7pm”
              </p>
              <p className={styles.quoteNote}>Only this calendar title was read.</p>
            </div>
          </section>

          <section className={styles.details} aria-labelledby="details-label">
            <h3 id="details-label" className={screen.label}>
              DETAILS
            </h3>
            <div className={screen.fields}>
              {fields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  className={screen.field}
                  onClick={() => edit(field.key)}
                  data-node-id={field.nodeId}
                >
                  <img src={field.icon} alt="" width={18} height={18} />
                  <span className={screen.fieldText}>
                    <span className={screen.srOnly}>Edit </span>
                    <span className={screen.fieldLabel}>{field.label}</span>
                    <span className={screen.fieldValue}>{field.value}</span>
                  </span>
                  <img src={pencil} alt="" width={15} height={15} />
                </button>
              ))}
            </div>
            <p className={styles.note}>Editing won’t change the confidence.</p>
          </section>

          <div className={screen.actions} data-node-id="21:1583">
            <button type="button" className={`${screen.button} ${screen.secondary}`} onClick={() => resolve('rejected')}>
              <img src={x} alt="" width={15} height={15} />
              Not right
            </button>
            <button type="button" className={`${screen.button} ${screen.primary}`} onClick={() => resolve('confirmed')}>
              <img src={check} alt="" width={15} height={15} />
              Confirm
            </button>
          </div>
        </article>

        <button type="button" className={styles.askLocal} onClick={() => setAsking(true)} data-node-id="21:1588">
          <span className={styles.askHint}>Not sure?</span>
          <img src={chat} alt="" width={14} height={14} />
          Ask a local
        </button>
      </div>

      {asking && <AskLocalDialog onClose={() => setAsking(false)} />}
    </MySpaceLayout>
  );
}
