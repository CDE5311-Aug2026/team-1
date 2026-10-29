// A route generated from an MRT / LRT station. Everything is in the query (station, budget in hours, mode, theme,
// date, booking), so the address can be shared and opens the same route.
import { useSearchParams } from 'react-router-dom';
import { localToday } from '../../features/nearby/personal';
import { generatedRoute, parsePlan, planSearch } from '../../features/nearby/routes/model';
import RouteDetail from '../../features/nearby/routes/RouteDetail';
import { RouteNotFound } from './RouteDetailPage';

export default function RoutePlanPage() {
  const [params] = useSearchParams();
  const options = parsePlan(params, localToday());
  const view = options ? generatedRoute(options) : undefined;
  if (!options || !view) return <RouteNotFound message="Pick an MRT or LRT station to make a route from." />;
  return <RouteDetail key={planSearch(options)} view={view} />;
}
