// Development only: open any screen with ?crash to make it fail on purpose, to check what a person sees when a
// screen breaks (user test round 1, heuristic 9). Does nothing in a production build.
import { useLocation } from 'react-router-dom';

export default function CrashSwitch() {
  const { search } = useLocation();
  if (import.meta.env.DEV && new URLSearchParams(search).has('crash')) throw new Error('Test crash (?crash)');
  return null;
}
