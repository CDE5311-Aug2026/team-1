import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { usePersistentStore } from './data/persistentStore';
import { onboardingStore } from './data/stores';
import AskPage from './pages/AskPage/AskPage';
import CommunityPage from './pages/CommunityPage/CommunityPage';
import HolidayPage from './pages/HolidayPage/HolidayPage';
import PlacePage from './pages/PlaceStory/PlacePage';
import PlaceStoryPage from './pages/PlaceStory/PlaceStoryPage';
import QuestionPage from './pages/CommunityPage/QuestionPage';
import MomentsPage from './pages/MomentsPage/MomentsPage';
import MySpacePage from './pages/MySpacePage/MySpacePage';
import SettingsPage from './pages/MySpacePage/SettingsPage/SettingsPage';
import PrivacyPage from './pages/MySpacePage/PrivacyPage/PrivacyPage';
import LicencesPage from './pages/MySpacePage/LicencesPage/LicencesPage';
import OnboardingFlow from './pages/Onboarding/OnboardingFlow';
import NoticeDetailsPage from './pages/MySpacePage/NoticeDetailsPage';
import NoticeEditPage from './pages/MySpacePage/NoticeEditPage';
import NoticeResultPage from './pages/MySpacePage/NoticeResultPage';
import NoticesPage from './pages/MySpacePage/NoticesPage';
import NearbyPage from './pages/NearbyPage/NearbyPage';
import PlacesPage from './pages/NearbyPage/PlacesPage';
import TodayPage from './pages/TodayPage/TodayPage';
import TodaySetupPage from './pages/TodaySetup/TodaySetupPage';
import AdminPage from './pages/AdminPage/AdminPage';
import { ADMIN_PATH, paths, patterns } from './routes';
import PageTracker from './usage/PageTracker';
import UserGate from './components/UserGate/UserGate';
import { useAppPreferences } from './hooks/useAppPreferences';

// Nearby Explorer screens load on demand: the catalogue (~140 places) and the map stay out of Today's bundle.
const ExplorePage = lazy(() => import('./pages/NearbyPage/ExplorePage'));
const LocationPage = lazy(() => import('./pages/NearbyPage/LocationPage'));
const PlaceDetailPage = lazy(() => import('./pages/NearbyPage/PlaceDetailPage'));
const CollectionsPage = lazy(() => import('./pages/NearbyPage/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('./pages/NearbyPage/CollectionDetailPage'));
const SavedPage = lazy(() => import('./pages/NearbyPage/SavedPage'));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="route-loading" aria-busy="true">Loading Nearby…</main>}>{children}</Suspense>
  );
}

export default function App() {
  const [onboarding] = usePersistentStore(onboardingStore);
  useAppPreferences();

  return (
    <>
      <PageTracker />
      <UserGate>
        <Routes>
          <Route
            path={paths.today}
            element={
              onboarding.done ? (
                <TodayPage />
              ) : (
                // First visit starts onboarding; finishing the last step sets done.
                <Navigate to={paths.onboarding} replace />
              )
            }
          />
          <Route path={paths.holiday} element={<HolidayPage />} />
          <Route path={patterns.homePlace} element={<PlacePage />} />
          <Route path={patterns.placeCard} element={<PlaceStoryPage />} />
          <Route path={paths.ask} element={<AskPage />} />
          <Route path={paths.community} element={<CommunityPage />} />
          <Route path={patterns.question} element={<QuestionPage />} />
          <Route path={paths.moments} element={<MomentsPage />} />
          <Route path={paths.nearby} element={<Lazy><ExplorePage /></Lazy>} />
          <Route path={paths.phrases} element={<NearbyPage />} />
          <Route path={paths.places} element={<PlacesPage />} />
          <Route path={paths.nearbyLocation} element={<Lazy><LocationPage /></Lazy>} />
          <Route path={patterns.nearbyPlace} element={<Lazy><PlaceDetailPage /></Lazy>} />
          <Route path={paths.collections} element={<Lazy><CollectionsPage /></Lazy>} />
          <Route path={patterns.collection} element={<Lazy><CollectionDetailPage /></Lazy>} />
          <Route path={paths.saved} element={<Lazy><SavedPage /></Lazy>} />
          <Route path={paths.mySpace} element={<MySpacePage />} />
          <Route path={paths.mySpaceSettings} element={<SettingsPage />} />
          <Route path={paths.mySpacePrivacy} element={<PrivacyPage />} />
          <Route path={paths.licences} element={<LicencesPage />} />
          <Route path={paths.notices} element={<NoticesPage />} />
          <Route path={paths.noticeDetails} element={<NoticeDetailsPage />} />
          <Route path={paths.noticeEdit} element={<NoticeEditPage />} />
          <Route path={paths.noticeConfirmed} element={<NoticeResultPage outcome="confirmed" />} />
          <Route path={paths.noticeRejected} element={<NoticeResultPage outcome="rejected" />} />
          <Route path={paths.onboarding} element={<OnboardingFlow />} />
          <Route path={paths.todaySetup} element={<TodaySetupPage />} />
          <Route path={ADMIN_PATH} element={<AdminPage />} />
          <Route path="*" element={<Navigate to={paths.today} replace />} />
        </Routes>
      </UserGate>
    </>
  );
}
