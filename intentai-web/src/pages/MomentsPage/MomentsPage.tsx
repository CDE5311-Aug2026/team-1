import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import iconReview from '../../assets/moments/icon-review.svg';
import HomeLink from '../../components/HomeLink/HomeLink';
import AppShell from '../../components/AppShell/AppShell';
import type { Lookup } from '../../data/domain';
import { dailyExpressions } from '../../data/expressions';
import { usePersistentStore } from '../../data/persistentStore';
import { collect, passportStats, topicProgress } from '../../data/collection';
import { currentStreak, recordLearningDay } from '../../data/progress';
import { collectedStore, lookupsStore, onboardingStore, profileStore, streakStore } from '../../data/stores';
import useToday from '../../hooks/useToday';
import { showToast } from '../../hooks/useToast';
import { paths, type CommunityHandoff } from '../../routes';
import LookupCard from './LookupCard/LookupCard';
import Pagination from './Pagination/Pagination';
import PractiseDialog from './PractiseDialog/PractiseDialog';
import { clampPage, pageCount, pageSlice, showingCaption } from './paging';
import MyTopics from './MyTopics/MyTopics';
import PassportCard from './PassportCard/PassportCard';
import PlaceStamps from './PlaceStamps/PlaceStamps';
import TodaysThree from './TodaysThree/TodaysThree';
import { useSpan } from '../../usage/useSpan';
import styles from './MomentsPage.module.css';

/** Figma node ids of the three card slots on a page. */
const CARD_NODE_IDS = ['4:961', '4:977', '4:991'];

/** Figma 4:919 "Moments — Every lookup": every lookup saved on this device, three per page. */
export default function MomentsPage() {
  const [lookups, setLookups] = usePersistentStore(lookupsStore);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const [{ topics }] = usePersistentStore(onboardingStore);
  const [collected, setCollected] = usePersistentStore(collectedStore);
  const [profile] = usePersistentStore(profileStore);
  const [streak, setStreak] = usePersistentStore(streakStore);
  const today = useToday();
  const [requestedPage, setRequestedPage] = useState(1);
  const [practising, setPractising] = useState<Lookup | null>(null);
  useSpan('activity', 'Moments › practise', practising !== null);
  const navigate = useNavigate();

  // Derived, so the page stays valid however the list changes (deletes here, adds from Ask).
  const page = clampPage(requestedPage, lookups.length);
  const total = pageCount(lookups.length);

  const updateLookup = (id: string, change: (lookup: Lookup) => Lookup) =>
    setLookups((prev) => prev.map((item) => (item.id === id ? change(item) : item)));

  const toggleGot = (lookup: Lookup) => {
    const got = !lookup.got;
    updateLookup(lookup.id, (item) => ({ ...item, got }));
    showToast(got ? 'Marked as understood' : 'Marked as not understood yet');
  };

  const metAgain = (lookup: Lookup) => {
    updateLookup(lookup.id, (item) => ({ ...item, encounters: (item.encounters ?? 0) + 1 }));
    showToast('Encounter saved');
  };

  const notSure = (lookup: Lookup) => {
    const handoff: CommunityHandoff = { askLocal: `What does “${lookup.word}” mean here?` };
    navigate(paths.community, { state: handoff });
  };

  const remove = (lookup: Lookup) => {
    const index = lookups.findIndex((item) => item.id === lookup.id);
    setLookups((prev) => prev.filter((item) => item.id !== lookup.id));
    // The Delete button disappears with its card; keep keyboard focus in the list.
    listHeading.current?.focus();
    showToast('Lookup deleted', {
      undo: () =>
        setLookups((prev) => {
          if (prev.some((item) => item.id === lookup.id)) return prev;
          const next = [...prev];
          next.splice(Math.min(index, next.length), 0, lookup);
          return next;
        }),
    });
  };

  return (
    <AppShell background="var(--bg-screen-b)" tabBarNodeId="4:1021">
      <div className={styles.moments}>
        <header className={styles.header}>
          <HomeLink className={styles.logo} />
          <h1 className={styles.title}>Moments</h1>
        </header>

        <div className={styles.body} data-node-id="4:935">
          {/* v2 passport (BellyBook-style): what the user has collected so far. */}
          <PassportCard stats={passportStats(collected, lookups, topics, currentStreak(streak, today))} level={profile.level} />

          {/* v2: today's three (moved from Today) replace Figma's "Show a daily card" setting (4:937). */}
          <TodaysThree
            expressions={dailyExpressions(topics)}
            collected={collected}
            onOpen={(id) => {
              setCollected((prev) => collect(prev, id));
              // Opening a phrase card counts as a learning day for the streak.
              setStreak((prev) => recordLearningDay(prev, today));
            }}
          />

          <MyTopics progress={topicProgress(topics, collected)} />

          <div className={styles.section} data-node-id="4:945">
            <img src={iconReview} alt="" width={16} height={16} />
            <h2 className={styles.sectionTitle} ref={listHeading} tabIndex={-1}>
              All lookups
            </h2>
            <span className={styles.count} data-node-id="4:944">
              {lookups.length}
            </span>
          </div>

          {lookups.length > 0 && (
            <>
              <div className={styles.list}>
                {pageSlice(lookups, page).map((lookup, index) => (
                  <LookupCard
                    key={lookup.id}
                    lookup={lookup}
                    nodeId={CARD_NODE_IDS[index]}
                    onToggleGot={() => toggleGot(lookup)}
                    onMetAgain={() => metAgain(lookup)}
                    onNotSure={() => notSure(lookup)}
                    onDelete={() => remove(lookup)}
                    onPractise={() => setPractising(lookup)}
                  />
                ))}
              </div>
              <Pagination page={page} total={total} onChange={(next) => setRequestedPage(clampPage(next, lookups.length))} />
            </>
          )}

          <p className={lookups.length > 0 ? styles.caption : styles.empty} data-node-id="7:1114">
            {lookups.length > 0 ? showingCaption(page, lookups.length) : 'No lookups yet. Ask about a phrase to save it here.'}
          </p>
        </div>

        {/* Nearby check-ins (打卡) as stamps: the places side of the passport. After the Figma frame (4:935), so its geometry stays. */}
        <div className={styles.places}>
          <PlaceStamps />
        </div>
      </div>

      {practising && (
        <PractiseDialog
          lookup={practising}
          onClose={() => setPractising(null)}
          onSaveExample={(example) =>
            setLookups((prev) => prev.map((item) => (item.id === practising.id ? { ...item, example } : item)))
          }
        />
      )}
    </AppShell>
  );
}
