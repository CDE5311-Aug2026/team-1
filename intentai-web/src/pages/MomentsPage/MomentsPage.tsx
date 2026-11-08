import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";
import { useMemo, useState, type CSSProperties } from "react";
import AppShell from "../../components/AppShell/AppShell";
import { usePersistentStore } from "../../data/persistentStore";
import {
  badgesOf,
  allStamps,
  openedCards,
  rankOf,
} from "../../data/moments/moments";
import {
  tipsStore,
  openedCardsStore,
  placeStoriesStore,
} from "../../data/stores";
import { useExplorePersonal } from "../../features/nearby/actions";
import {
  MAIN_COLLECTION,
  collectionProgress,
} from "../../features/nearby/catalogue";
import { localToday } from "../../features/nearby/personal";
import { CHART_BACKDROP } from "../HuntPage/notebook/chartBackdrop";
import { MATERIALS } from "../HuntPage/notebook/Notebook";
import Journal from "./Journal/Journal";
import Passport from "./Passport/Passport";
import PlaceSheet from "./PlaceSheet/PlaceSheet";
import RankSheet from "./RankSheet/RankSheet";
import PageBar from "../../components/PageBar/PageBar";
import SnapSheet from "./SnapSheet/SnapSheet";
import styles from "./MomentsPage.module.css";

/** Hunt's paper materials (grain, stains, fibres) and its sea chart, as CSS variables for the page's sheets (the page
 *  itself sits on the app's chart paper since v2, 9 Nov 2026). */
const DESK_STYLE = { ...MATERIALS, "--chart": CHART_BACKDROP } as CSSProperties;

type Modal =
  | { type: "place"; areaId: string }
  | { type: "rank" }
  | { type: "snap" };

/**
 * Moments (ZIP `moments()`, Figma M1–M5): a passport of the places you checked in, inked by the cards you opened.
 * v2 (9 Nov 2026): on the app's chart paper in the v2 light look, like Passport; the sheets keep Hunt's parchment. No
 * Collected or Recap sections (owner, 9 Nov 2026).
 */
export default function MomentsPage() {
  const personal = useExplorePersonal();
  const [opened] = usePersistentStore(openedCardsStore);
  const [tips] = usePersistentStore(tipsStore);
  const [modal, setModal] = useState<Modal | null>(null);

  const today = localToday();
  const [stories] = usePersistentStore(placeStoriesStore);
  const stamps = useMemo(
    () => allStamps(personal, opened, stories),
    [personal, opened, stories],
  );
  const progress = MAIN_COLLECTION
    ? collectionProgress(MAIN_COLLECTION, personal)
    : null;
  const realTips = tips.filter((t) => !t.sample).length;
  const rank = rankOf(openedCards(opened).length, realTips);
  const badges = badgesOf(stamps, opened, realTips);

  const placeStamp =
    modal?.type === "place"
      ? stamps.find((s) => s.subject.id === modal.areaId)
      : undefined;

  return (
    <AppShell>
      <div className={styles.desk} style={DESK_STYLE}>
        <PageBar title="Moments" tone="light" />

        <Journal onSnap={() => setModal({ type: "snap" })} />

        <Passport
          rank={{
            progress: rank.progress,
            label: `Rank: ${rank.step.label}. ${rank.line}`,
            onOpen: () => setModal({ type: "rank" }),
          }}
          stamps={stamps}
          progress={progress}
          today={today}
          onOpen={(stamp) =>
            setModal({ type: "place", areaId: stamp.subject.id })
          }
        />


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
      </div>
    </AppShell>
  );
}
