import { Navigate, Route, Routes } from 'react-router-dom';
import { usePersistentStore } from './data/persistentStore';
import { onboardingStore } from './data/stores';
import AskPage from './pages/AskPage/AskPage';
import CommunityPage from './pages/CommunityPage/CommunityPage';
import HolidayPage from './pages/HolidayPage/HolidayPage';
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
import TodaySetupPage from './pages/TodaySetup/TodaySetupPage';
import AdminPage from './pages/AdminPage/AdminPage';
import { ADMIN_PATH, paths, patterns } from './routes';
import PageTracker from './usage/PageTracker';

export default function App() {
  const [onboarding] = usePersistentStore(onboardingStore);

  return (
    <>
      <PageTracker />
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
        <Route path={paths.ask} element={<AskPage />} />
        <Route path={paths.community} element={<CommunityPage />} />
        <Route path={patterns.question} element={<QuestionPage />} />
        <Route path={paths.moments} element={<MomentsPage />} />
        <Route path={paths.nearby} element={<NearbyPage />} />
        <Route path={paths.places} element={<PlacesPage />} />
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
        <Route path={paths.todaySetup} element={<TodaySetupPage />} />
        <Route path={ADMIN_PATH} element={<AdminPage />} />
        <Route path="*" element={<Navigate to={paths.today} replace />} />
      </Routes>
    </>
  );
}
