import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import back from '../../assets/my-space/back-chevron.svg';
import check from '../../assets/my-space/button-check.svg';
import pencil from '../../assets/my-space/detail-pencil.svg';
import users from '../../assets/my-space/detail-users.svg';
import utensils from '../../assets/my-space/detail-utensils.svg';
import { usePersistentStore } from '../../data/persistentStore';
import { noticesStore, settingsStore } from '../../data/stores';
import { isRecord } from '../../data/validate';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import MySpaceLayout from './MySpaceLayout/MySpaceLayout';
import screen from './DetailScreen.module.css';
import pageStyles from './MySpacePage.module.css';
import type { EditField } from './NoticeDetailsPage';
import styles from './NoticeEditPage.module.css';
import { requireText } from '../../hooks/requireText';

const FIELDS: { key: EditField; label: string; icon: string; nodeId: string }[] = [
  { key: 'occasion', label: 'Occasion', icon: utensils, nodeId: '21:1598' },
  { key: 'with', label: 'With', icon: users, nodeId: '21:1605' },
];

/**
 * Figma 19:1107 "4 AI output — Edit". Real inputs replace the frame's drawn keyboard (the device
 * keyboard covers the same area), and like the frame it has no tab bar.
 */
export default function NoticeEditPage() {
  const [notices, setNotices] = usePersistentStore(noticesStore);
  const [settings] = usePersistentStore(settingsStore);
  const navigate = useNavigate();
  const { state } = useLocation();
  // Details passes which field was tapped; the frame shows "With" focused.
  const focusField: EditField = isRecord(state) && state.field === 'with' ? 'with' : 'occasion';

  const toDetails = () => navigate(paths.noticeDetails);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const occasion = requireText(event.currentTarget, 'occasion');
    if (occasion === null) return;
    const withWhom = requireText(event.currentTarget, 'with');
    if (withWhom === null) return;
    setNotices((previous) => ({ ...previous, occasion, with: withWhom }));
    toDetails();
    showToast('Details saved');
  };

  // Details and edit exist only for a pending notice, which needs Flag occasions on.
  if (!settings.occasions || notices.status !== 'pending') return <Navigate to={paths.notices} replace />;

  return (
    <MySpaceLayout>
      <div className={`${pageStyles.body} ${screen.body}`}>
        <button type="button" className={screen.back} onClick={toDetails}>
          <span className={screen.backRow} data-node-id="21:1591">
            <img src={back} alt="" width={16} height={16} />
            Back
          </span>
        </button>

        <form className={`${screen.card} ${styles.card}`} onSubmit={save} data-node-id="21:1595" noValidate>
          <h2 className={styles.title}>Edit details</h2>
          <div className={screen.fields}>
            {FIELDS.map((field) => (
              <label key={field.key} className={`${screen.field} ${styles.field}`} data-node-id={field.nodeId}>
                <img src={field.icon} alt="" width={18} height={18} />
                <span className={screen.fieldText}>
                  <span className={screen.fieldLabel}>{field.label}</span>
                  <input
                    name={field.key}
                    className={`${screen.fieldValue} ${styles.input}`}
                    defaultValue={notices[field.key]}
                    required
                    maxLength={80}
                    autoComplete="off"
                    autoFocus={field.key === focusField}
                  />
                </span>
                <img src={pencil} alt="" width={15} height={15} className={styles.pencil} />
              </label>
            ))}
          </div>
          <div className={screen.actions} data-node-id="21:1611">
            <button type="button" className={`${screen.button} ${screen.secondary}`} onClick={toDetails}>
              Cancel
            </button>
            <button type="submit" className={`${screen.button} ${screen.primary}`}>
              <img src={check} alt="" width={15} height={15} />
              Save
            </button>
          </div>
        </form>
      </div>
    </MySpaceLayout>
  );
}
