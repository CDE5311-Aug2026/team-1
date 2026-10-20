import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { addLookup } from './data/domain';
import { dailyExpressions, phraseBank } from './data/expressions';
import { usePersistentStore } from './data/persistentStore';
import { learnedToday, markLearned, recordLearningDay } from './data/progress';
import { lookupsStore, onboardingStore, progressStore, streakStore } from './data/stores';
import useToday from './hooks/useToday';
import AskPage from './pages/AskPage/AskPage';
import CommunityPage from './pages/CommunityPage/CommunityPage';
import QuestionPage from './pages/CommunityPage/QuestionPage';
import MomentsPage from './pages/MomentsPage/MomentsPage';
import MySpacePage from './pages/MySpacePage/MySpacePage';
import NoticeDetailsPage from './pages/MySpacePage/NoticeDetailsPage';
import NoticeEditPage from './pages/MySpacePage/NoticeEditPage';
import NoticeResultPage from './pages/MySpacePage/NoticeResultPage';
import NoticesPage from './pages/MySpacePage/NoticesPage';
import NearbyPage from './pages/NearbyPage/NearbyPage';
import PlacesPage from './pages/NearbyPage/PlacesPage';
import QuizPage from './pages/OnboardingPage/QuizPage';
import ResultPage from './pages/OnboardingPage/ResultPage';
import TimePage from './pages/OnboardingPage/TimePage';
import TopicsPage from './pages/OnboardingPage/TopicsPage';
import WelcomePage from './pages/OnboardingPage/WelcomePage';
import TodayPage from './pages/TodayPage/TodayPage';
import { paths, patterns } from './routes';

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
  const [progress, setProgress] = usePersistentStore(progressStore);
  const [onboarding] = usePersistentStore(onboardingStore);
  const today = useToday();
  const daily = dailyExpressions(onboarding.topics);
  // Ids learned earlier today under other topics don't count towards these three.
  const learnedIds = learnedToday(progress, today).filter((id) => daily.some((e) => e.id === id));
  const learnedCount = learnedIds.length;

  const handleAdvance = (id: string) => {
    setProgress((p) => markLearned(p, id));
    streakStore.set((streak) => recordLearningDay(streak));
    // A finished lesson phrase is kept in Moments like any other lookup (v0 behaviour).
    const expression = phraseBank.find((e) => e.id === id);
    if (expression) {
      lookupsStore.set((list) =>
        addLookup(list, { id: expression.id, word: expression.title, meaning: expression.description }),
      );
    }
  };

  return (
    <Routes>
      <Route
        path={paths.today}
        element={
          onboarding.done ? (
            <TodayPage expressions={daily} learnedCount={learnedCount} learnedIds={learnedIds} onAdvance={handleAdvance} />
          ) : (
            // First visit starts at Welcome (Figma page 7); "Start learning" sets done.
            <Navigate to={paths.welcome} replace />
          )
        }
      />
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
      <Route path="*" element={<Navigate to={paths.today} replace />} />
    </Routes>
  );
}
