import { useEffect, useState } from 'react';

const QUERY = '(max-width: 760px)';

/** The width at which a Hunt stop is one phone page. Its layout, tabs and back button all switch here, together. */
export function useCompactStop(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const list = window.matchMedia(QUERY);
    const on = () => setCompact(list.matches);
    list.addEventListener('change', on);
    return () => list.removeEventListener('change', on);
  }, []);
  return compact;
}
