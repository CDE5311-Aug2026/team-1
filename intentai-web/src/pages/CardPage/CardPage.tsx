// Card pages (Intent v3 Figma 3–6 / 8–11), one layout per kind: food, monument, festival, history. Every part comes
// from the card's article (src/data/culture.ts and articles/*), its photo and video, its Nearby links and the
// catalogue's checked details, and local tips from Community (tipsStore). Opening the page marks the card opened.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  motion,
  useReducedMotionConfig,
  useScroll,
  useTransform,
} from "motion/react";
import AppShell from "../../components/AppShell/AppShell";
import BlurText from "../../components/reactbits/BlurText";
import CountUp from "../../components/reactbits/CountUp";
import { nearbyHref } from "../../data/cultureLinks";
import {
  cardById,
  cardKind,
  cardPhoto,
  cardPosition,
  keyNumbers,
  kindLabel,
  plainFacts,
  timelineOf,
  type PlacePhoto,
} from "../../data/home/places";
import { markCardOpened } from "../../data/openedCards";
import { usePersistentStore } from "../../data/persistentStore";
import { openedCardsStore, tipsStore } from "../../data/stores";
import { ARTICLE_VIDEOS } from "../../data/videos";
import { curatedPlace } from "../../features/nearby/catalogue";
import { paths } from "../../routes";
import type { Card } from "../AskPage/cards";
import HomeIcon from "../TodayPage/shared/HomeIcon";
import CompleteSet from "./CompleteSet";
import Timeline from "./Timeline";
import VideoPoster from "./VideoPoster";
import styles from "./CardPage.module.css";

function PhotoHero({ photo }: { photo: PlacePhoto }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionConfig();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduce ? ["0%", "0%"] : ["-7%", "7%"],
  );
  return (
    <div ref={ref} className={styles.photoHero}>
      <motion.img
        className={styles.photoHeroImg}
        src={photo.src}
        alt={photo.alt}
        style={{ y }}
      />
    </div>
  );
}

/** "1824 to 1826" counts up to its first year; plain numbers count up; anything else is shown as written. */
function NumberValue({ value }: { value: string }) {
  const m = value.match(/^(\d{1,4})(.*)$/);
  if (!m) return <>{value}</>;
  const n = Number(m[1]);
  return (
    <>
      <CountUp
        to={n}
        from={n > 1000 ? n - 40 : 0}
        duration={1.1}
        separator=""
      />
      {m[2]}
    </>
  );
}

function ReadMore({ card, shown }: { card: Card; shown: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const facts = card.article.facts.filter((f) => !shown.includes(f));
  return (
    <div className={styles.readMore}>
      <button
        type="button"
        className={styles.readMoreBtn}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Read less" : "Read more"}
        <HomeIcon
          name="down"
          size={16}
          stroke={2.2}
          className={open ? styles.flip : undefined}
        />
      </button>
      {open && (
        <div className={styles.deeper}>
          {facts.length > 0 && (
            <ul className={styles.factList}>
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <p>{card.article.deeper}</p>
        </div>
      )}
    </div>
  );
}

function TryNearby({ card }: { card: Card }) {
  const tries = card.links.filter((l) => l.kind === "place" && l.why === "try");
  if (tries.length === 0) return null;
  return (
    <section className={styles.panel} aria-labelledby="try-title">
      <h2 id="try-title" className={styles.panelKicker}>
        Try it nearby
      </h2>
      {tries.map((l) => {
        const p = l.kind === "place" ? curatedPlace(l.id) : undefined;
        const hours = p?.details?.hours;
        const address = p?.details?.address;
        return (
          <Link key={l.id} className={styles.tryRow} to={nearbyHref(l)}>
            <span className={styles.tryIcon} aria-hidden="true">
              <HomeIcon name="food" size={20} />
            </span>
            <span className={styles.tryText}>
              <span className={styles.tryName}>{p?.name ?? l.label}</span>
              {address && (
                <span className={styles.tryMeta}>{address.text}</span>
              )}
              {hours && <span className={styles.tryMeta}>{hours.text}</span>}
              {p?.recognition && (
                <span className={styles.tryBadge}>
                  {p.recognition.label} {p.recognition.year}
                </span>
              )}
              {(hours || address) && (
                <span className={styles.trySource}>
                  Details: {(hours ?? address)!.source.publisher}, checked{" "}
                  {(hours ?? address)!.source.checkedAt}
                </span>
              )}
            </span>
            <HomeIcon
              name="next"
              size={18}
              stroke={2.2}
              className={styles.tryGo}
            />
          </Link>
        );
      })}
    </section>
  );
}

function LocalTip({ cardId }: { cardId: string }) {
  const [tips] = usePersistentStore(tipsStore);
  const mine = tips.filter((t) => t.cardId === cardId);
  return (
    <section className={styles.panel} aria-labelledby="tip-title">
      <h2 id="tip-title" className={styles.panelKicker}>
        Local tip
      </h2>
      {mine.length === 0 ? (
        <p className={styles.tipEmpty}>
          No local tip on this card yet.{" "}
          <Link to={paths.community} className={styles.inlineLink}>
            Ask a local in Community
          </Link>
        </p>
      ) : (
        mine.map((t) => (
          <figure key={t.id} className={styles.tip}>
            <figcaption className={styles.tipBy}>
              <span className={styles.tipAvatar} aria-hidden="true">
                {t.by.trim().charAt(0).toUpperCase() || "L"}
              </span>
              <span>
                {t.by}
                {t.areaName ? ` · ${t.areaName}` : ""}
              </span>
            </figcaption>
            <blockquote className={styles.tipText}>“{t.text}”</blockquote>
            <Link
              to={paths.question(t.questionId)}
              className={styles.inlineLink}
            >
              Open in Community
            </Link>
          </figure>
        ))
      )}
    </section>
  );
}

function WhenPanel({ card }: { card: Card }) {
  const falls = card.article.facts.find((f) =>
    /\b(falls?|usually|between)\b/i.test(f),
  );
  return (
    <section className={styles.panel} aria-labelledby="when-title">
      <h2 id="when-title" className={styles.panelKicker}>
        When
      </h2>
      <div className={styles.when}>
        <span className={styles.whenIcon} aria-hidden="true">
          <HomeIcon name="calendar" size={22} />
        </span>
        <div>
          <p className={styles.whenTitle}>{card.article.kicker}</p>
          {falls && <p className={styles.whenText}>{falls}</p>}
          <p className={styles.whenNote}>
            The date moves each year. The next date isn’t in the app yet, so
            there’s no reminder for it.
          </p>
        </div>
      </div>
    </section>
  );
}

function LookFor({ facts }: { facts: string[] }) {
  if (facts.length === 0) return null;
  return (
    <section className={styles.panel} aria-labelledby="look-title">
      <h2 id="look-title" className={styles.panelKicker}>
        Look for
      </h2>
      <ul className={styles.lookList}>
        {facts.map((f) => (
          <li key={f}>
            <HomeIcon name="search" size={16} stroke={2} />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CardPage() {
  const { cardId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPlace = (location.state as { place?: string } | null)?.place;
  const card = cardById(cardId);
  const [opened] = usePersistentStore(openedCardsStore);

  useEffect(() => {
    if (card) markCardOpened(card.article.id);
    // a new card starts at the top (jsdom has no scrolling)
    if (!/jsdom/i.test(navigator.userAgent)) window.scrollTo(0, 0);
  }, [card]);

  if (!card) {
    return (
      <AppShell chrome="status">
        <div className={styles.missing}>
          <h1>Card not found</h1>
          <Link to={paths.today}>Back to Home</Link>
        </div>
      </AppShell>
    );
  }

  const kind = cardKind(card);
  const { place, index, total, next } = cardPosition(
    card.article.id,
    fromPlace,
  );
  const photo = cardPhoto(card);
  const video = ARTICLE_VIDEOS[card.article.id];
  const numbers = kind === "history" ? [] : keyNumbers(card);
  const mapLink =
    card.links.find((l) => l.kind === "place" && l.why !== "try") ??
    card.links.find((l) => l.kind !== "list") ??
    card.links[0];
  const allOpened = place
    ? place.cards.every(
        (c) =>
          c.article.id === card.article.id || opened.includes(c.article.id),
      )
    : false;
  const credits = [photo?.credit, video ? `Video: ${video.channel}` : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppShell chrome="status">
      <article className={styles.page} data-kind={kind}>
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.back}
            onClick={() =>
              navigate(place ? paths.place(place.id) : paths.today)
            }
            aria-label={place ? `Back to ${place.short}` : "Back to Home"}
          >
            <HomeIcon name="back" size={22} stroke={2.2} />
          </button>
          {place && (
            <>
              <span className={styles.steps} aria-hidden="true">
                {place.cards.map((c, i) => (
                  <i
                    key={c.article.id}
                    className={i < index ? styles.stepOn : undefined}
                  />
                ))}
              </span>
              <span className={styles.stepText}>
                {index} of {total}
              </span>
            </>
          )}
        </div>

        <p className={styles.kicker}>
          <HomeIcon name={kind} size={16} />
          {kindLabel(card)}
          {place ? ` · ${place.short}` : ""}
        </p>
        <BlurText
          as="h1"
          text={card.article.title}
          className={styles.title}
          trigger="load"
          delay={60}
          stepDuration={0.32}
          blur={8}
          distance={12}
        />
        <p className={styles.sub}>{card.article.kicker}</p>

        {video ? (
          <VideoPoster video={video} photo={photo} />
        ) : photo ? (
          <PhotoHero photo={photo} />
        ) : null}

        {numbers.length > 0 && (
          <ul className={styles.numbers} aria-label="Key numbers">
            {numbers.map((n, i) => (
              <li
                key={n.value}
                className={
                  i === numbers.length - 1 && numbers.length > 1
                    ? `${styles.number} ${styles.numberHot}`
                    : styles.number
                }
              >
                <span className={styles.numberValue}>
                  <NumberValue value={n.value} />
                </span>
                <span className={styles.numberCaption}>{n.caption}</span>
              </li>
            ))}
          </ul>
        )}

        {kind === "history" && <Timeline events={timelineOf(card)} />}

        <p className={styles.summary}>{card.article.summary}</p>
        <ReadMore
          card={card}
          shown={[
            ...numbers.map((n) => n.caption),
            ...(kind === "monument" ? plainFacts(card) : []),
            ...(kind === "history" ? timelineOf(card).map((e) => e.text) : []),
          ]}
        />

        {kind === "food" && (
          <>
            <TryNearby card={card} />
            <LocalTip cardId={card.article.id} />
          </>
        )}
        {kind === "monument" && <LookFor facts={plainFacts(card)} />}
        {kind === "festival" && <WhenPanel card={card} />}
        {kind !== "food" && <TipIfAny cardId={card.article.id} />}

        {mapLink && (
          <Link className={styles.mapLink} to={nearbyHref(mapLink)}>
            <HomeIcon name="map" size={19} />
            See it on the Nearby map
            <HomeIcon
              name="arrow"
              size={17}
              stroke={2.2}
              className={styles.mapGo}
            />
          </Link>
        )}

        {place && allOpened && <CompleteSet place={place} />}

        <footer className={styles.sources}>
          <p>
            Source:{" "}
            {card.article.sources.map((s, i) => (
              <span key={`${s.label}-${i}`}>
                {i > 0 && "; "}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                ) : (
                  s.label
                )}
              </span>
            ))}
          </p>
          {credits && (
            <p>
              {photo?.url ? (
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  {credits}
                </a>
              ) : (
                credits
              )}
            </p>
          )}
        </footer>

        {next && next.article.id !== card.article.id && (
          <Link
            className={styles.next}
            to={paths.card(next.article.id)}
            state={{ place: place?.id }}
          >
            <span className={styles.nextKicker}>Next · {kindLabel(next)}</span>
            <span className={styles.nextTitle}>{next.article.title}</span>
            <HomeIcon
              name="arrow"
              size={20}
              stroke={2.2}
              className={styles.nextGo}
            />
          </Link>
        )}
      </article>
    </AppShell>
  );
}

/** Non-food cards show a local tip only when Community has added one (no empty slot). */
function TipIfAny({ cardId }: { cardId: string }) {
  const [tips] = usePersistentStore(tipsStore);
  if (!tips.some((t) => t.cardId === cardId)) return null;
  return <LocalTip cardId={cardId} />;
}
