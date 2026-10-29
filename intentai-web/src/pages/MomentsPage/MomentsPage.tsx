import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import camera from '../../assets/v3/moments/camera.svg';
import play from '../../assets/v3/moments/play.svg';
import star from '../../assets/v3/moments/star.svg';
import AppShell from '../../components/AppShell/AppShell';
import HomeLink from '../../components/HomeLink/HomeLink';
import type { Lookup } from '../../data/domain';
import { communitySocialStore } from '../../data/community/social';
import { sampleThread } from '../../data/community/channels';
import { usePersistentStore } from '../../data/persistentStore';
import {
  badgesOf,
  buildStamps,
  collectedItems,
  imageOf,
  openedCards,
  rankOf,
  recapFacts,
  recapLine,
  type CollectedFilter,
  type CollectedItem,
} from '../../data/moments/moments';
import { markCardOpened } from '../../data/openedCards';
import { collectedStore, insightsStore, lookupsStore, openedCardsStore, placeStoriesStore, questionsStore, tipsStore } from '../../data/stores';
import { useExplorePersonal } from '../../features/nearby/actions';
import { MAIN_COLLECTION, collectionProgress } from '../../features/nearby/catalogue';
import { localToday } from '../../features/nearby/personal';
import { showToast } from '../../hooks/useToast';
import { paths, type AskHandoff, type CommunityHandoff } from '../../routes';
import { useSpan } from '../../usage/useSpan';
import Collected from './Collected/Collected';
import ConversationSheet from './ConversationSheet/ConversationSheet';
import StoryStamps from './PlaceStamps/StoryStamps';
import Passport from './Passport/Passport';
import PhraseSheet from './PhraseSheet/PhraseSheet';
import PlaceSheet from './PlaceSheet/PlaceSheet';
import PractiseDialog from './PractiseDialog/PractiseDialog';
import RankSheet, { Ring } from './RankSheet/RankSheet';
import Recap from './Recap/Recap';
import SnapSheet from './SnapSheet/SnapSheet';
import styles from './MomentsPage.module.css';

type Modal =
  | { type: 'place'; areaId: string }
  | { type: 'rank' }
  | { type: 'snap' }
  | { type: 'recap' }
  | { type: 'phrase'; key: string }
  | { type: 'conversation'; threadId: string };

/** Moments (ZIP `moments()`, Figma M1–M5): a passport of the places you checked in, inked by the cards you opened. */
export default function MomentsPage() {
  const navigate = useNavigate();
  const personal = useExplorePersonal();
  const [opened] = usePersistentStore(openedCardsStore);
  const [tips] = usePersistentStore(tipsStore);
  const [insights] = usePersistentStore(insightsStore);
  const [lookups, setLookups] = usePersistentStore(lookupsStore);
  const [todaysThree] = usePersistentStore(collectedStore);
  const [social] = usePersistentStore(communitySocialStore);
  const [questions] = usePersistentStore(questionsStore);
  const [filter, setFilter] = useState<CollectedFilter>('all');
  const [modal, setModal] = useState<Modal | null>(null);
  const [practising, setPractising] = useState<Lookup | null>(null);
  useSpan('activity', 'Moments › practise', practising !== null);

  const today = localToday();
  const [stories] = usePersistentStore(placeStoriesStore);
  const stamps = useMemo(() => buildStamps(personal, opened, stories), [personal, opened, stories]);
  const progress = MAIN_COLLECTION ? collectionProgress(MAIN_COLLECTION, personal) : null;
  const realTips = tips.filter((t) => !t.sample).length;
  const rank = rankOf(openedCards(opened).length, realTips);
  const badges = badgesOf(stamps, opened, realTips);
  const items = useMemo(
    () => collectedItems({ opened, tips, insights, lookups, todaysThree, conversations: social.saved }),
    [opened, tips, insights, lookups, todaysThree, social.saved],
  );
  const facts = useMemo(() => recapFacts(opened, lookups), [opened, lookups]);

  const openItem = (item: CollectedItem) => {
    if (item.kind === 'card') {
      markCardOpened(item.card.article.id);
      navigate(paths.card(item.card.article.id));
    } else if (item.kind === 'tip') navigate(paths.card(item.tip.cardId));
    else if (item.kind === 'insight') {
      const handoff: AskHandoff = { prompt: item.insight.question };
      navigate(paths.ask, { state: handoff });
    } else if (item.kind === 'conversation') {
      // The live thread while the question still exists; the saved snapshot after it was withdrawn.
      const id = item.saved.threadId;
      if (questions.some((q) => q.id === id) || sampleThread(id)) navigate(paths.question(id));
      else setModal({ type: 'conversation', threadId: id });
    } else setModal({ type: 'phrase', key: item.key });
  };

  const notSure = (lookup: Lookup) => {
    const handoff: CommunityHandoff = { askLocal: `What does “${lookup.word}” mean here?`, link: { lookupId: lookup.id, from: 'moments' } };
    navigate(paths.community, { state: handoff });
  };

  const removeLookup = (lookup: Lookup) => {
    const index = lookups.findIndex((l) => l.id === lookup.id);
    setLookups((prev) => prev.filter((l) => l.id !== lookup.id));
    setModal(null);
    showToast('Phrase deleted', {
      undo: () =>
        setLookups((prev) => {
          if (prev.some((l) => l.id === lookup.id)) return prev;
          const next = [...prev];
          next.splice(Math.min(index, next.length), 0, lookup);
          return next;
        }),
    });
  };

  const placeStamp = modal?.type === 'place' ? stamps.find((s) => s.subject.id === modal.areaId) : undefined;
  const phraseItem = modal?.type === 'phrase' ? items.find((i): i is Extract<CollectedItem, { kind: 'phrase' }> => i.key === modal.key && i.kind === 'phrase') : undefined;
  const conversation = modal?.type === 'conversation' ? social.saved.find((c) => c.threadId === modal.threadId) : undefined;
  const recapImages = facts.flatMap((f) => (f.cardId && imageOf(f.cardId) ? [imageOf(f.cardId)!] : [])).slice(0, 1);

  return (
    <AppShell background="#edebe5">
      <div className={styles.page}>
        <header className={styles.header}>
          <HomeLink className={styles.logo} />
          <h1 className={styles.srOnly}>Moments</h1>
          <button type="button" className={styles.snap} onClick={() => setModal({ type: 'snap' })}>
            <span className={styles.snapOrb}>
              <img src={camera} alt="" width={13} height={13} />
            </span>
            Snap
          </button>
          <button type="button" className={styles.rank} onClick={() => setModal({ type: 'rank' })} aria-label={`Rank: ${rank.step.label}. ${rank.line}`}>
            <span className={styles.rankMark}>
              <Ring value={rank.progress} size={28} stroke={3} />
              <img src={star} alt="" width={12} height={12} />
            </span>
            {rank.step.label}
          </button>
        </header>

        <Passport stamps={stamps} progress={progress} today={today} onOpen={(stamp) => setModal({ type: 'place', areaId: stamp.subject.id })} />

        <StoryStamps />

        <Collected items={items} filter={filter} onFilter={setFilter} onOpen={openItem} onNotSure={notSure} />

        <button type="button" className={styles.recap} onClick={() => setModal({ type: 'recap' })} disabled={facts.length === 0}>
          <span className={styles.recapStack} aria-hidden="true">
            <i />
            <i />
            {recapImages[0] ? <img src={recapImages[0].src} alt="" /> : <i className={styles.recapTop} />}
          </span>
          <span className={styles.recapCopy}>
            <strong>Recap</strong>
            <small>{facts.length ? recapLine(facts.length) : 'Open a card to add facts'}</small>
          </span>
          <span className={styles.recapArrow} aria-hidden="true">
            <img src={play} alt="" width={18} height={18} />
          </span>
        </button>
      </div>

      {placeStamp && <PlaceSheet stamp={placeStamp} index={stamps.indexOf(placeStamp)} onClose={() => setModal(null)} />}
      {modal?.type === 'rank' && <RankSheet rank={rank} badges={badges} onClose={() => setModal(null)} />}
      {modal?.type === 'snap' && <SnapSheet stamps={stamps} onClose={() => setModal(null)} />}
      {modal?.type === 'recap' && <Recap facts={facts} onClose={() => setModal(null)} />}
      {conversation && <ConversationSheet saved={conversation} onClose={() => setModal(null)} />}
      {phraseItem && !practising && (
        <PhraseSheet
          item={phraseItem}
          onClose={() => setModal(null)}
          onPractise={() =>
            setPractising(
              phraseItem.lookup ?? { id: phraseItem.key, word: phraseItem.word, meaning: phraseItem.meaning, source: 'IntentAI editorial', example: phraseItem.example },
            )
          }
          onNotSure={() => phraseItem.lookup && notSure(phraseItem.lookup)}
          onToggleGot={() => {
            const lookup = phraseItem.lookup;
            if (!lookup) return;
            const got = !lookup.got;
            setLookups((prev) => prev.map((l) => (l.id === lookup.id ? { ...l, got } : l)));
            showToast(got ? 'Marked as understood' : 'Marked as not understood yet');
          }}
          onDelete={() => phraseItem.lookup && removeLookup(phraseItem.lookup)}
        />
      )}
      {practising && (
        <PractiseDialog
          lookup={practising}
          onClose={() => setPractising(null)}
          onSaveExample={(example) => setLookups((prev) => prev.map((l) => (l.id === practising.id ? { ...l, example } : l)))}
        />
      )}
    </AppShell>
  );
}
