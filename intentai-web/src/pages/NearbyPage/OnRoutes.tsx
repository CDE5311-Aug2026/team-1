// A Nearby place page's "On routes: …" line: the team's and the atlas's routes that stop at this place (loaded on demand).
import { Link } from 'react-router-dom';
import { routesWithPlace, routeTextLang, type LocalText } from '../../data/atlas/atlasRoutes';
import { teamRoutesWithPlace } from '../../data/routes/teamRoutes';
import styles from '../../features/nearby/components/Nearby.module.css';
import { paths } from '../../routes';

export default function OnRoutes({ placeKey }: { placeKey: string }) {
  const routes: { id: string; title: LocalText }[] = [
    ...teamRoutesWithPlace(placeKey).map((r) => ({ id: r.id, title: { text: r.title, lang: 'en' as const } })),
    ...routesWithPlace(placeKey).map((r) => ({ id: r.id, title: routeTextLang(r.id, 'title') })),
  ];
  if (!routes.length) return null;
  return (
    <p className={styles.body}>
      <strong>On {routes.length === 1 ? 'a route' : 'routes'}:</strong>{' '}
      {routes.map((r, i) => {
        const t = r.title;
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

