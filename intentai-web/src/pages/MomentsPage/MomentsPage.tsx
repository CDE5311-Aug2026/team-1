import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";
import { useMemo, useState, type CSSProperties } from "react";
import AppShell from "../../components/AppShell/AppShell";
import { usePersistentStore } from "../../data/persistentStore";
import {
  badgesOf,
  allStamps,
  imageOf,
  openedCards,
  rankOf,
  recapFacts,
  recapLine,
} from "../../data/moments/moments";
import {
  lookupsStore,
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
import { curatedPlace } from "../../features/nearby/catalogue";
import { areaName, realPhoto, sceneryIn } from "../../data/journal/placePhotos";
import { CHART_BACKDROP } from "../HuntPage/notebook/chartBackdrop";
import { MATERIALS } from "../HuntPage/notebook/Notebook";
import Journal from "./Journal/Journal";
import Passport from "./Passport/Passport";
import PlaceSheet from "./PlaceSheet/PlaceSheet";
import RankSheet from "./RankSheet/RankSheet";
import PageBar from "../../components/PageBar/PageBar";
import Recap from "./Recap/Recap";
import SnapSheet from "./SnapSheet/SnapSheet";
import styles from "./MomentsPage.module.css";

/** Hunt's paper materials (grain, stains, fibres) and its sea chart, as CSS variables for the page's sheets (the page
 *  itself sits on the app's chart paper since v2, 9 Nov 2026). */
const DESK_STYLE = { ...MATERIALS, "--chart": CHART_BACKDROP } as CSSProperties;

type Modal =
  | { type: "place"; areaId: string }
  | { type: "rank" }
  | { type: "snap" }
  | { type: "recap" };

/**
 * Moments (ZIP `moments()`, Figma M1–M5): a passport of the places you checked in, inked by the cards you opened.
 * v2 (9 Nov 2026): on the app's chart paper in the v2 light look, like Passport; the sheets keep Hunt's parchment.
 */
export default function MomentsPage() {
  const personal = useExplorePersonal();
  const [opened] = usePersistentStore(openedCardsStore);
  const [tips] = usePersistentStore(tipsStore);
  const [lookups] = usePersistentStore(lookupsStore);
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
  const facts = useMemo(() => recapFacts(opened, lookups), [opened, lookups]);

  const placeStamp =
    modal?.type === "place"
      ? stamps.find((s) => s.subject.id === modal.areaId)
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
      </div>
    </AppShell>
  );
}
