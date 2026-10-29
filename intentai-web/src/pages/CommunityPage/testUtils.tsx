import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { paths } from '../../routes';
import CommunityMapPage from './CommunityMapPage';
import CommunityPage from './CommunityPage';
import QuestionPage from './QuestionPage';

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname + useLocation().search}</div>;
}

/** Renders both Community routes at `path`, with a probe that shows the current pathname. */
export function renderCommunity(path: string) {
  return render(
    <MemoryRouter useTransitions={false} initialEntries={[path]}>
      <Routes>
        <Route path={paths.community} element={<CommunityPage />} />
        <Route path={paths.communityMap} element={<CommunityMapPage />} />
        <Route path="/community/:questionId" element={<QuestionPage />} />
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}
