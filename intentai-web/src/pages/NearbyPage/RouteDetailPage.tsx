// An editor's route from the Singapore Culture Atlas (/nearby/routes/:routeId, optional ?date= for closures).
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { BackHeader } from '../../features/nearby/components/NearbyChrome';
import styles from '../../features/nearby/components/Nearby.module.css';
import { isLocalDate } from '../../features/nearby/domain';
import { localToday } from '../../features/nearby/personal';
import { editorRoute } from '../../features/nearby/routes/model';
import RouteDetail from '../../features/nearby/routes/RouteDetail';
import { paths } from '../../routes';

export function RouteNotFound({ message }: { message: string }) {
  return (
    <AppShell background="var(--bg-screen-b)">
      <div className={styles.screen}>
        <BackHeader title="Route not found" fallback={paths.routes} />
        <p className={styles.empty}>{message}</p>
        <Link className={styles.primary} to={paths.routes}>
          All routes
        </Link>
      </div>
    </AppShell>
  );
}

export default function RouteDetailPage() {
  const { routeId } = useParams();
  const [params] = useSearchParams();
  const raw = params.get('date');
  const date = raw && isLocalDate(raw) ? raw : localToday();
  const view = routeId ? editorRoute(routeId, date) : undefined;
  if (!view) return <RouteNotFound message="This route does not exist. It may have been renamed or removed." />;
  return <RouteDetail key={view.id} view={view} />;
}
