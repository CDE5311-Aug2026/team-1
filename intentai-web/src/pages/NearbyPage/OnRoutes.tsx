// A Nearby place page's "On routes: …" line: the atlas's editor routes that stop at this place (loaded on demand).
import { Link } from 'react-router-dom';
import { routesWithPlace, routeTextLang } from '../../data/atlas/atlasRoutes';
import styles from '../../features/nearby/components/Nearby.module.css';
import { paths } from '../../routes';

export default function OnRoutes({ placeKey }: { placeKey: string }) {
  const routes = routesWithPlace(placeKey);
  if (!routes.length) return null;
  return (
    <p className={styles.body}>
      <strong>On {routes.length === 1 ? 'a route' : 'routes'}:</strong>{' '}
      {routes.map((r, i) => {
        const t = routeTextLang(r.id, 'title');
        return (
          <span key={r.id}>
            {i > 0 && ', '}
            <Link className={styles.textLink} to={paths.route(r.id)} lang={t.lang === 'zh-Hans' ? 'zh-Hans' : undefined}>
              {t.text}
            </Link>
          </span>
        );
      })}
    </p>
  );
}

