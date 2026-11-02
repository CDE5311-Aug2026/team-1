import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";
import { useMemo, useState, type CSSProperties } from "react";
import AppShell from "../../components/AppShell/AppShell";
import type { Lookup } from "../../data/domain";
import { communitySocialStore } from "../../data/community/social";
import { usePersistentStore } from "../../data/persistentStore";
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
} from "../../data/moments/moments";
import {
  collectedStore,
  insightsStore,
  lookupsStore,
  openedCardsStore,
  placeStoriesStore,
  tipsStore,
} from "../../data/stores";
import { useExplorePersonal } from "../../features/nearby/actions";
import {
  MAIN_COLLECTION,
  collectionProgress,
} from "../../features/nearby/catalogue";
import { localToday } from "../../features/nearby/personal";
import { curatedPlace } from "../../features/nearby/catalogue";
import { areaName, realPhoto, sceneryIn } from "../../data/journal/placePhotos";
import { showToast } from "../../hooks/useToast";
import { useSpan } from "../../usage/useSpan";
import { CHART_BACKDROP } from "../HuntPage/notebook/chartBackdrop";
import { MATERIALS } from "../HuntPage/notebook/Notebook";
import Collected from "./Collected/Collected";
import ConversationSheet from "./ConversationSheet/ConversationSheet";
import Journal from "./Journal/Journal";
import Passport from "./Passport/Passport";
import PhraseSheet from "./PhraseSheet/PhraseSheet";
import PlaceSheet from "./PlaceSheet/PlaceSheet";
import PractiseDialog from "./PractiseDialog/PractiseDialog";
import RankSheet, { Ring } from "./RankSheet/RankSheet";
import PageBar from "../../components/PageBar/PageBar";
import Recap from "./Recap/Recap";
import SnapSheet from "./SnapSheet/SnapSheet";
import styles from "./MomentsPage.module.css";

/** The dark sea-chart colour under the backdrop (as Hunt's). */
const CHART_BG = "#1d1711";
/** Hunt's paper materials (grain, stains, fibres) and its sea chart, as CSS variables for the page and its sheets. */
const DESK_STYLE = { ...MATERIALS, "--chart": CHART_BACKDROP } as CSSProperties;

type Modal =
  | { type: "place"; areaId: string }
  | { type: "rank" }
  | { type: "snap" }
  | { type: "recap" }
  | { type: "phrase"; key: string }
  | { type: "conversation"; threadId: string };

/**
 * Moments (ZIP `moments()`, Figma M1–M5): a passport of the places you checked in, inked by the cards you opened.
 * Dressed as Hunt's desk (1 Nov 2026): parchment pages and pinned prints on a dark antique sea chart.
 */
export default function MomentsPage() {
  const personal = useExplorePersonal();
  const [opened] = usePersistentStore(openedCardsStore);
  const [tips] = usePersistentStore(tipsStore);
  const [insights] = usePersistentStore(insightsStore);
  const [lookups, setLookups] = usePersistentStore(lookupsStore);
  const [todaysThree] = usePersistentStore(collectedStore);
  const [social] = usePersistentStore(communitySocialStore);
  const [filter, setFilter] = useState<CollectedFilter>("all");
  const [modal, setModal] = useState<Modal | null>(null);
  const [practising, setPractising] = useState<Lookup | null>(null);
  useSpan("activity", "Moments › practise", practising !== null);

  const today = localToday();
  const [stories] = usePersistentStore(placeStoriesStore);
  const stamps = useMemo(
    () => buildStamps(personal, opened, stories),
    [personal, opened, stories],
  );
  const progress = MAIN_COLLECTION
    ? collectionProgress(MAIN_COLLECTION, personal)
    : null;
  const realTips = tips.filter((t) => !t.sample).length;
  const rank = rankOf(openedCards(opened).length, realTips);
  const badges = badgesOf(stamps, opened, realTips);
  const items = useMemo(
    () =>
      collectedItems({
        opened,
        tips,
        insights,
        lookups,
        todaysThree,
        conversations: social.saved,
      }).filter((i) => i.kind === "phrase"),
    [opened, tips, insights, lookups, todaysThree, social.saved],
  );
  const facts = useMemo(() => recapFacts(opened, lookups), [opened, lookups]);

  // Discovery redesign (31 Oct): culture cards, Ask and Community are gone, so only saved phrases open from here.
  const openItem = (item: CollectedItem) => {
    if (item.kind === "phrase") setModal({ type: "phrase", key: item.key });
  };

  const removeLookup = (lookup: Lookup) => {
    const index = lookups.findIndex((l) => l.id === lookup.id);
    setLookups((prev) => prev.filter((l) => l.id !== lookup.id));
    setModal(null);
    showToast("Phrase deleted", {
      undo: () =>
        setLookups((prev) => {
          if (prev.some((l) => l.id === lookup.id)) return prev;
          const next = [...prev];
          next.splice(Math.min(index, next.length), 0, lookup);
          return next;
        }),
    });
  };

  const placeStamp =
    modal?.type === "place"
      ? stamps.find((s) => s.subject.id === modal.areaId)
      : undefined;
  const phraseItem =
    modal?.type === "phrase"
      ? items.find(
          (i): i is Extract<CollectedItem, { kind: "phrase" }> =>
            i.key === modal.key && i.kind === "phrase",
        )
      : undefined;
  const conversation =
    modal?.type === "conversation"
      ? social.saved.find((c) => c.threadId === modal.threadId)
      : undefined;
  // the three prints on the Recap slip: card photos, else real photos of places you went
  const recapImages = useMemo(() => {
    const out = facts.flatMap((f) =>
      f.cardId && imageOf(f.cardId) ? [imageOf(f.cardId)!.src] : [],
    );
    const areas: string[] = [];
    for (const p of [...personal.places].reverse()) {
      const place = p.visited ? curatedPlace(p.placeKey) : undefined;
      const area = areaName(place);
      if (area && !areas.includes(area)) areas.push(area);
      const photo = place && realPhoto(place);
      if (photo && out.length < 3 && !out.includes(photo.src))
        out.push(photo.src);
    }
    // places with no photo of their own: real photos from the same areas
    for (const f of sceneryIn(areas, new Set(out), 3 - out.length))
      out.push(f.src);
    return out.slice(0, 3);
  }, [facts, personal.places]);

  return (
    <AppShell background={CHART_BG}>
      <div className={styles.desk} style={DESK_STYLE}>
        <PageBar
          title="Moments"
          tone="dark"
          onAvatar={() => setModal({ type: "rank" })}
          avatarLabel={`Rank: ${rank.step.label}. ${rank.line}`}
          ring={
            <Ring
              value={rank.progress}
              size={46}
              stroke={2.5}
              track="rgba(232, 201, 131, 0.22)"
              color="#e8833a"
            />
          }
        />

        <Journal onSnap={() => setModal({ type: "snap" })} />

        <Passport
          stamps={stamps}
          progress={progress}
          today={today}
          onOpen={(stamp) =>
            setModal({ type: "place", areaId: stamp.subject.id })
          }
        />

        <Collected
          items={items}
          filter={filter}
          onFilter={setFilter}
          onOpen={openItem}
        />

        <button
          type="button"
          className={styles.recap}
          onClick={() => setModal({ type: "recap" })}
          disabled={facts.length === 0}
        >
          <span className={styles.recapStack} aria-hidden="true">
            {/* photos on top, plain prints underneath when there are fewer than three */}
            {[0, 1, 2].map((i) => {
              const src = recapImages[i - (3 - recapImages.length)];
              return src ? <img key={i} src={src} alt="" /> : <i key={i} />;
            })}
          </span>
          <span className={styles.recapCopy}>
            <strong>Recap</strong>
            <small>
              {facts.length
                ? recapLine(facts.length)
                : "Open a card to add facts"}
            </small>
          </span>
          <span className={styles.recapArrow} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M5 3.2v9.6L12.6 8z" fill="currentColor" />
            </svg>
          </span>
        </button>

        {placeStamp && (
          <PlaceSheet
            stamp={placeStamp}
            index={stamps.indexOf(placeStamp)}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "rank" && (
          <RankSheet
            rank={rank}
            badges={badges}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "snap" && (
          <SnapSheet stamps={stamps} onClose={() => setModal(null)} />
        )}
        {modal?.type === "recap" && (
          <Recap facts={facts} onClose={() => setModal(null)} />
        )}
        {conversation && (
          <ConversationSheet
            saved={conversation}
            onClose={() => setModal(null)}
          />
        )}
        {phraseItem && !practising && (
          <PhraseSheet
            item={phraseItem}
            onClose={() => setModal(null)}
            onPractise={() =>
              setPractising(
                phraseItem.lookup ?? {
                  id: phraseItem.key,
                  word: phraseItem.word,
                  meaning: phraseItem.meaning,
                  source: "IntentAI editorial",
                  example: phraseItem.example,
                },
              )
            }
            onToggleGot={() => {
              const lookup = phraseItem.lookup;
              if (!lookup) return;
              const got = !lookup.got;
              setLookups((prev) =>
                prev.map((l) => (l.id === lookup.id ? { ...l, got } : l)),
              );
              showToast(
                got ? "Marked as understood" : "Marked as not understood yet",
              );
            }}
            onDelete={() =>
              phraseItem.lookup && removeLookup(phraseItem.lookup)
            }
          />
        )}
        {practising && (
          <PractiseDialog
            lookup={practising}
            onClose={() => setPractising(null)}
            onSaveExample={(example) =>
              setLookups((prev) =>
                prev.map((l) =>
                  l.id === practising.id ? { ...l, example } : l,
                ),
              )
            }
          />
        )}
      </div>
    </AppShell>
  );
}
