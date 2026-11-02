import { Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useReduceMotionSetting } from './data/motion';
import { useTextSizeSetting } from './data/textSize';
import { usePersistentStore } from './data/persistentStore';
import { onboardingStore } from './data/stores';
import TodayPage from './pages/TodayPage/TodayPage';
import { lazyPage } from './pages/lazyPage';
import { ADMIN_PATH, TEST_PATH, paths, patterns } from './routes';
import PageTracker from './usage/PageTracker';
import UserGate from './components/UserGate/UserGate';
import HelpCenter from './components/HelpCenter/HelpCenter';
import CrashSwitch from './components/PageError/CrashSwitch';
import PageErrorBoundary from './components/PageError/PageError';
import NetStatus from './components/NetStatus/NetStatus';
import useTestVersion from './hooks/useTestVersion';

// Every screen but Today loads on demand, so a phone opening the app downloads Today's code only (the place catalogue,
// the community posts, the atlas and the map stay out of it). Nearby Explorer screens were already split this way.
const HolidayPage = lazyPage(() => import('./pages/HolidayPage/HolidayPage'));
const HuntPage = lazyPage(() => import('./pages/HuntPage/HuntPage'));
const MomentsPage = lazyPage(() => import('./pages/MomentsPage/MomentsPage'));
const MySpacePage = lazyPage(() => import('./pages/MySpacePage/MySpacePage'));
const MySpaceSettingsPage = lazyPage(() => import('./pages/MySpacePage/SettingsPage'));
const MySpacePrivacyPage = lazyPage(() => import('./pages/MySpacePage/PrivacyPage'));
const MySpaceLicencesPage = lazyPage(() => import('./pages/MySpacePage/LicencesPage'));
const NoticeDetailsPage = lazyPage(() => import('./pages/MySpacePage/NoticeDetailsPage'));
const NoticeEditPage = lazyPage(() => import('./pages/MySpacePage/NoticeEditPage'));
const NoticeResultPage = lazyPage(() => import('./pages/MySpacePage/NoticeResultPage'));
const NoticesPage = lazyPage(() => import('./pages/MySpacePage/NoticesPage'));
const QuizPage = lazyPage(() => import('./pages/OnboardingPage/QuizPage'));
const ResultPage = lazyPage(() => import('./pages/OnboardingPage/ResultPage'));
const TimePage = lazyPage(() => import('./pages/OnboardingPage/TimePage'));
const TopicsPage = lazyPage(() => import('./pages/OnboardingPage/TopicsPage'));
const WelcomePage = lazyPage(() => import('./pages/OnboardingPage/WelcomePage'));
const TodaySetupPage = lazyPage(() => import('./pages/TodaySetup/TodaySetupPage'));
const AdminPage = lazyPage(() => import('./pages/AdminPage/AdminPage'));
const AbTestPage = lazyPage(() => import('./pages/AbTestPage/AbTestPage'));
const ExplorePage = lazyPage(() => import('./pages/NearbyPage/ExplorePage'));
const LocationPage = lazyPage(() => import('./pages/NearbyPage/LocationPage'));
const PlaceDetailPage = lazyPage(() => import('./pages/NearbyPage/PlaceDetailPage'));
const CollectionsPage = lazyPage(() => import('./pages/NearbyPage/CollectionsPage'));
const CollectionDetailPage = lazyPage(() => import('./pages/NearbyPage/CollectionDetailPage'));
const SavedPage = lazyPage(() => import('./pages/NearbyPage/SavedPage'));
const RoutesPage = lazyPage(() => import('./pages/NearbyPage/RoutesPage'));
const RouteDetailPage = lazyPage(() => import('./pages/NearbyPage/RouteDetailPage'));
const RoutePlanPage = lazyPage(() => import('./pages/NearbyPage/RoutePlanPage'));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="route-loading" aria-busy="true">
          Loading…
        </main>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  const [onboarding] = usePersistentStore(onboardingStore);
  const { pathname } = useLocation();
  const reduceMotion = useReduceMotionSetting();
  const version = useTestVersion();
  useTextSizeSetting();

  return (
    // "user" follows the system setting; the app's own Reduce motion switch forces it off everywhere.
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <PageTracker />
      <HelpCenter />
      <NetStatus />
      <UserGate>
        {/* a screen that breaks shows a note with a way on, not a blank page; another screen clears it */}
        <PageErrorBoundary resetKey={pathname}>
        <Lazy>
          <CrashSwitch />
          <Routes>
            <Route
              path={paths.today}
              element={
                onboarding.done ? (
                  <TodayPage />
                ) : (
                  // First visit starts at Welcome (Figma page 7); "Start learning" sets done.
                  <Navigate to={paths.welcome} replace />
                )
              }
            />
            <Route path={paths.holiday} element={<HolidayPage />} />
            <Route path={paths.moments} element={<MomentsPage />} />
            <Route path={paths.hunt} element={version === 'A' ? <Navigate to={paths.today} replace /> : <HuntPage />} />
            <Route path={paths.nearby} element={<ExplorePage />} />
            <Route path={paths.nearbyLocation} element={<LocationPage />} />
            <Route path={patterns.nearbyPlace} element={<PlaceDetailPage />} />
            <Route path={paths.collections} element={<CollectionsPage />} />
            <Route path={patterns.collection} element={<CollectionDetailPage />} />
            <Route path={paths.saved} element={<SavedPage />} />
            <Route path={paths.routes} element={<RoutesPage />} />
            <Route path={patterns.routePlan} element={<RoutePlanPage />} />
            <Route path={patterns.route} element={<RouteDetailPage />} />
            <Route path={paths.mySpace} element={<MySpacePage />} />
            <Route path={paths.mySpaceSettings} element={<MySpaceSettingsPage />} />
            <Route path={paths.mySpacePrivacy} element={<MySpacePrivacyPage />} />
            <Route path={paths.licences} element={<MySpaceLicencesPage />} />
            <Route path={paths.notices} element={<NoticesPage />} />
            <Route path={paths.noticeDetails} element={<NoticeDetailsPage />} />
            <Route path={paths.noticeEdit} element={<NoticeEditPage />} />
            <Route path={paths.noticeConfirmed} element={<NoticeResultPage outcome="confirmed" />} />
            <Route path={paths.noticeRejected} element={<NoticeResultPage outcome="rejected" />} />
            <Route path={paths.welcome} element={<WelcomePage />} />
            <Route path={paths.onboardingTime} element={<TimePage />} />
            <Route path={paths.onboardingTopics} element={<TopicsPage />} />
            <Route path={paths.onboardingQuiz} element={<QuizPage />} />
            <Route path={paths.onboardingResult} element={<ResultPage />} />
            <Route path={paths.todaySetup} element={<TodaySetupPage />} />
            <Route path={ADMIN_PATH} element={<AdminPage />} />
            <Route path={TEST_PATH} element={<AbTestPage />} />
            <Route path="*" element={<Navigate to={paths.today} replace />} />
          </Routes>
        </Lazy>
        </PageErrorBoundary>
      </UserGate>
    </MotionConfig>
  );
}
