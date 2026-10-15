import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import AppHeader from '../../components/AppHeader/AppHeader';
import Icon from '../../components/Icon/Icon';
import { paths } from '../../routes';
import type { IconName } from '../../types';
import styles from './PlaceholderPage.module.css';

interface PlaceholderPageProps {
  name: string;
  icon: IconName;
}

export default function PlaceholderPage({ name, icon }: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className={styles.page}>
        <AppHeader
          onBell={() => navigate(paths.notices)}
        />
        <div className={styles.body}>
          <Icon name={icon} size={32} />
          <h1 className={styles.heading}>{name}</h1>
          <p>Coming soon</p>
        </div>
      </div>
    </AppShell>
  );
}
