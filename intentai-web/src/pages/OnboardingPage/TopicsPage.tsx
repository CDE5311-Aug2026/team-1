// Old onboarding route, kept so saved links work: the v3 flow asks one question per screen at /onboarding?step=N.
import { Navigate } from 'react-router-dom';
import { paths } from '../../routes';

export default function TopicsPage() {
  return <Navigate to={`${paths.welcome}?step=6`} replace />;
}
