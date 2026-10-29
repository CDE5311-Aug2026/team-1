import { useMemo } from 'react';
import { communitySocialStore, notificationsFor, threadFor, type Thread } from '../../data/community/social';
import { usePersistentStore } from '../../data/persistentStore';
import { lookupsStore, questionsStore, settingsStore, tipsStore } from '../../data/stores';

/** Everything Community reads, with my questions as threads and the notifications worked out from them. */
export function useCommunity() {
  const [questions] = usePersistentStore(questionsStore);
  const [social] = usePersistentStore(communitySocialStore);
  const [lookups] = usePersistentStore(lookupsStore);
  const [settings, setSettings] = usePersistentStore(settingsStore);
  const [tips] = usePersistentStore(tipsStore);
  const ownThreads = useMemo(
    () => questions.map((q) => threadFor(q.id, questions, lookups, social)).filter((t): t is Thread => Boolean(t)),
    [questions, lookups, social],
  );
  const notifications = useMemo(() => notificationsFor(questions, social), [questions, social]);
  const setLocal = (local: boolean) => setSettings((prev) => ({ ...prev, local }));
  return { questions, social, lookups, settings, tips, ownThreads, notifications, setLocal };
}
