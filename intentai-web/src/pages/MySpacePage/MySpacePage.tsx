// The Passport tab (v2 boards 13, 14, 15): category chips, the holder's passport card (stamps, volumes and tips from the
// real stores, the rank as its stamp, hunt mode as a chip, an MRZ line built from real fields only), in "hunt together"
// mode the region's weekend leaderboard (Home's own card, example players; before the journal, owner 8 Nov 2026), the
// journal's recent days and the collection by Tourism 2040 category.
// What the app keeps on file, and the older Passport links, follow below.
import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import groundUrl from "../../assets/nearby/sg-ground.webp";
import logo from "../../assets/brand/findsg-logo.png";
import logoInk from "../../assets/brand/findsg-logo-black.png";
import AppShell from "../../components/AppShell/AppShell";
import CategoryChips, { useCategoryParam } from "../../components/Category/CategoryChips";
import CategoryGlyph from "../../components/Category/CategoryGlyph";
import PageBar from "../../components/PageBar/PageBar";
import { placePicture } from "../../data/home/nearbyCards";
import { dayParts, type JournalDay } from "../../data/journal/journal";
import { allStamps, openedCards, rankOf } from "../../data/moments/moments";
import { usePersistentStore } from "../../data/persistentStore";
import {
  GROUND_BOX,
  areaById,
  areaShortName,
  toWindow,
  topicPhoto,
} from "../../data/profile/finds";
import {
  FIELDS,
  FIELD_LABELS,
  STAYS,
  countryOf,
  fieldValue,
  holderInitial,
  languageOf,
  mrzLine,
  profileV3Store,
  toggleHidden,
  tourismOrder,
  tourismRankingOf,
  type FieldKey,
  type ProfileV3,
} from "../../data/profile/profile";
import { formatBytes, totalBytes } from "../../data/profile/storage";
import {
  explorePersonalStore,
  openedCardsStore,
  placeStoriesStore,
  tipsStore,
} from "../../data/stores";
import { TOURISM_INFO, tourismOf, type TourismCategory, type TourismFilter } from "../../data/tourism";
import { uraRegion } from "../../data/ura/ura";
import { huntModeStore, isTogether } from "../../data/v2Stores";
import { PUBLISHED_PLACES } from "../../features/nearby/catalogue";
import type { CuratedPlace, ExplorePersonalData } from "../../features/nearby/domain";
import { paths } from "../../routes";
import { openChallenges } from "../../data/hunt/challenges";
import { localToday } from "../../features/nearby/personal";
import { RegionLeaderboard } from "../TodayPage/HomeSections";
import { storyRecords } from "../HuntPage/notebook/record";
import { dayAnchor, useJournalDays } from "../MomentsPage/Journal/useJournalDays";
import Icon, { type IconName } from "../OnboardingPage/v3/icons";
import { EyeButton } from "../OnboardingPage/v3/Passport";
import useHolderName from "../OnboardingPage/v3/useHolderName";
import FieldEditor from "./v3/FieldEditor";
import StorageBar from "./v3/StorageBar";
import book from "./v3/Booklet.module.css";
import styles from "./Passport.module.css";

const MRZ_LENGTH = 44;
/** Places shown in a category's strip; the chevron opens the rest in Search. */
const STRIP = 10;
/** Days in the journal carousel. */
const RECENT_DAYS = 6;

const mrzPad = (s: string) => (s + "<".repeat(MRZ_LENGTH)).slice(0, MRZ_LENGTH);
const mrzWord = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9]+/g, "<");

/** The two machine-readable lines, from real fields only: the holder line (name, role unless hidden) with the
 *  category codes in the holder's own ranking; then stamps, volumes done, home hunt region and hunt mode. */
export function passportMrz(
  holder: string,
  profile: ProfileV3,
  counts: { stamps: number; volumes: number },
  hunt: { together: boolean; region?: string },
): [string, string] {
  const codes = tourismRankingOf(profile).map((c) => TOURISM_INFO[c].code);
  const name = mrzLine(holder, profile, MRZ_LENGTH).replace(/<+$/, "");
  const first = mrzPad(codes.length ? `${name}<<${codes.join("<")}` : name);
  const region = hunt.region ? `${mrzWord(hunt.region)}<<` : "";
  const second = mrzPad(
    `${String(counts.stamps).padStart(3, "0")}SGP${String(counts.volumes).padStart(4, "0")}<<${region}${hunt.together ? "TOGETHER" : "SOLO"}`,
  );
  return [first, second];
}

/** Published places of each category, drafts (planned) left out: they are never counted or stamped. */
const PLACES_BY_CATEGORY: Record<TourismCategory, CuratedPlace[]> = (() => {
  const out: Record<TourismCategory, CuratedPlace[]> = { att: [], wel: [], lei: [], cru: [] };
  for (const p of PUBLISHED_PLACES) {
    const c = tourismOf(p);
    if (c && p.operatingStatus !== "planned") out[c].push(p);
  }
  return out;
})();

/** A place's photo (card or real photo), never a 3D render; undefined shows the category tint. */
function photoOf(place: CuratedPlace): string | undefined {
  const p = placePicture(place);
  return p.src && (p.kind === "card" || p.kind === "photo") ? p.src : undefined;
}

/** Visited places → the day they were marked visited (YYYY-MM-DD). */
function stampedDays(personal: ExplorePersonalData): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of personal.places) if (p.visited) out.set(p.placeKey, p.visitedOn ?? p.updatedAt.slice(0, 10));
  return out;
}

const shortDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function PassportCard({
  holder,
  profile,
  stamps,
  volumes,
  tips,
  rank,
  together,
  regionName,
}: {
  holder: string;
  profile: ProfileV3;
  stamps: number;
  volumes: number;
  tips: number;
  rank: string;
  together: boolean;
  regionName?: string;
}) {
  const [first, second] = passportMrz(holder, profile, { stamps, volumes }, { together, region: regionName });
  const stats = [
    { label: "Stamps", value: stamps },
    { label: "Volumes", value: volumes },
    { label: "Tips", value: tips },
  ];
  return (
    <section className={styles.card} aria-label="Passport holder">
      <span className={styles.guilloche} aria-hidden="true" />
      <p className={styles.cardHead}>
        <img src={logo} alt="" width={20} height={20} />
        <span className={styles.kicker}>FindSG Passport</span>
        <span className={styles.rule} aria-hidden="true" />
        <span className={styles.code}>SGP</span>
      </p>
      <div className={styles.cardBody}>
        <div className={styles.photo} aria-hidden="true">
          <img className={styles.watermark} src={logoInk} alt="" />
          <span>{holderInitial(holder)}</span>
        </div>
        <div className={styles.cardMain}>
          <p className={styles.holder}>
            <span>Holder</span>
            <strong>{holder}</strong>
          </p>
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {/* the rank, stamped on: it opens Moments, where it is earned */}
      <Link to={paths.moments} className={styles.stamp}>
        <Icon name="star" size={10} />
        <span>{rank}</span>
      </Link>
      <p className={together ? `${styles.mode} ${styles.modeTogether}` : styles.mode}>
        <span className={styles.modeDot} aria-hidden="true" />
        {together ? `Hunting together${regionName ? ` · ${regionName}` : ""}` : "Solo explorer"}
      </p>
      <p className={styles.mrz} aria-hidden="true">
        <span>{first}</span>
        <span>{second}</span>
      </p>
    </section>
  );
}

/** "1 h 12" or "54 min", from the day's earliest and latest known times. */
function spanOf(day: JournalDay): string | undefined {
  if (day.from === undefined || day.to === undefined || day.to <= day.from) return undefined;
  const min = Math.round((day.to - day.from) / 60000);
  if (min < 1) return undefined;
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

function JournalCard({ day }: { day: JournalDay }) {
  const { num, month, weekday } = dayParts(day.day);
  const pics: { src: string; title: string }[] = [];
  for (const e of day.entries) {
    const src = e.picture?.src ?? e.image;
    if (src && !pics.some((p) => p.src === src)) pics.push({ src, title: e.title });
    if (pics.length === 2) break;
  }
  const area = day.entries.find((e) => e.area)?.area;
  const volume = day.entries.find((e) => e.kind === "stamp" || e.kind === "finish");
  const where = [area, volume?.kind === "stamp" ? volume.note : volume?.title.replace(/^Finished /, "")]
    .filter(Boolean)
    .join(" · ");
  const span = spanOf(day);
  const { places, stamps } = day.stats;
  const tally = `${places} ${places === 1 ? "place" : "places"} · ${stamps} ${stamps === 1 ? "stamp" : "stamps"}`;
  return (
    <Link
      to={{ pathname: paths.moments, hash: dayAnchor(day.day) }}
      className={styles.day}
      aria-label={`${weekday} ${num} ${month}: ${tally}${span ? `, ${span}` : ""}. Open in your journal`}
    >
      <span className={styles.dayDate} aria-hidden="true">
        <b>{num}</b>
        <span>{month}</span>
        <small>{weekday}</small>
      </span>
      <span className={styles.dayMain} aria-hidden="true">
        <span className={styles.dayPics}>
          {pics.length === 0 ? (
            <span className={styles.dayPic} />
          ) : (
            pics.map((p) => (
              <span key={p.src} className={styles.dayPic}>
                <img src={p.src} alt="" loading="lazy" />
              </span>
            ))
          )}
        </span>
        {where && <span className={styles.dayWhere}>{where}</span>}
        <span className={styles.dayTally}>
          <b>{places}</b> {places === 1 ? "place" : "places"} · <b>{stamps}</b> {stamps === 1 ? "stamp" : "stamps"}
          {span ? ` · ${span}` : ""}
        </span>
      </span>
    </Link>
  );
}

function JournalStrip() {
  const { days } = useJournalDays();
  const recent = days.slice(0, RECENT_DAYS);
  return (
    <section className={styles.section} aria-labelledby="passport-journal">
      <div className={styles.sectionHead}>
        <h2 id="passport-journal">Journal</h2>
        <Link to={paths.moments} className={styles.more}>
          {days.length ? `${days.length} ${days.length === 1 ? "day" : "days"}` : "Open"}
          <Icon name="chevron" size={14} />
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className={styles.empty}>
          No days yet. Places you visit and stamps you collect fill your journal, one day at a time.
        </p>
      ) : (
        <div className={styles.days}>
          {recent.map((d) => (
            <JournalCard key={d.day} day={d} />
          ))}
          <Link to={paths.moments} className={styles.addDay} aria-label="Add a photo in your journal">
            <Icon name="camera" size={20} />
            <span aria-hidden="true">Add</span>
          </Link>
        </div>
      )}
    </section>
  );
}

function CategoryRow({ category, stamped }: { category: TourismCategory; stamped: Map<string, string> }) {
  const info = TOURISM_INFO[category];
  const all = PLACES_BY_CATEGORY[category];
  const { done, strip } = useMemo(() => {
    const done = all.filter((p) => stamped.has(p.id));
    const mine = [...done].sort((a, b) => stamped.get(b.id)!.localeCompare(stamped.get(a.id)!));
    const rest = all.filter((p) => !stamped.has(p.id));
    // places with a photo first, so the strip shows the places rather than a row of tints
    const withPhoto = rest.filter((p) => photoOf(p));
    const without = rest.filter((p) => !photoOf(p));
    return { done, strip: [...mine, ...withPhoto, ...without].slice(0, STRIP) };
  }, [all, stamped]);
  const pct = all.length ? Math.round((100 * done.length) / all.length) : 0;
  const count = `${done.length} of ${all.length} stamped`;
  return (
    <section
      className={styles.cat}
      aria-label={info.label}
      style={{ "--cat": info.fill, "--cat-ink": info.ink, "--cat-tint": info.tint } as CSSProperties}
    >
      <Link to={`${paths.search}?cat=${category}`} className={styles.catHead} aria-label={`${info.label}, ${count}. See all in Search`}>
        <span className={styles.catDot} aria-hidden="true">
          <CategoryGlyph category={category} size={10} />
        </span>
        <h3 className={styles.catName}>{info.label}</h3>
        <span
          className={styles.bar}
          role="progressbar"
          aria-label={`${info.label} stamped`}
          aria-valuemin={0}
          aria-valuemax={all.length}
          aria-valuenow={done.length}
        >
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className={styles.catCount}>{count}</span>
        <Icon name="chevron" size={14} className={styles.chev} />
      </Link>
      {strip.length > 0 && (
        <ul className={styles.strip}>
          {strip.map((p) => {
            const on = stamped.get(p.id);
            const src = photoOf(p);
            return (
              <li key={p.id}>
                <Link to={paths.nearbyPlace(p.id)} className={on ? `${styles.item} ${styles.itemOn}` : styles.item}>
                  <span className={styles.thumb}>
                    {src ? (
                      <img src={src} alt="" loading="lazy" />
                    ) : (
                      <span className={styles.tint} aria-hidden="true">
                        <CategoryGlyph category={category} size={22} />
                      </span>
                    )}
                    {on && (
                      <span className={styles.check} aria-hidden="true">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </span>
                  <span className={styles.itemName}>{p.name}</span>
                  <span className={styles.itemDate}>{on ? `Stamped ${shortDate(on)}` : "Not yet"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Collection({
  profile,
  personal,
  cat,
}: {
  profile: ProfileV3;
  personal: ExplorePersonalData;
  cat: TourismFilter;
}) {
  const stamped = useMemo(() => stampedDays(personal), [personal]);
  const shown = tourismOrder(profile).filter((c) => cat === "all" || c === cat);
  const total = shown.reduce((n, c) => n + PLACES_BY_CATEGORY[c].length, 0);
  const done = shown.reduce((n, c) => n + PLACES_BY_CATEGORY[c].filter((p) => stamped.has(p.id)).length, 0);
  return (
    <section className={styles.section} aria-labelledby="passport-collection">
      <div className={styles.sectionHead}>
        <h2 id="passport-collection">My collection</h2>
        <span className={styles.meta}>{`${done} of ${total} stamped`}</span>
      </div>
      {shown.map((c) => (
        <CategoryRow key={c} category={c} stamped={stamped} />
      ))}
    </section>
  );
}

// ---- On file: what the app knows (kept from the earlier Passport; no board) ----------------------------------------

const ROLE_ICON: Record<string, IconName> = {
  student: "cap",
  intern: "badge",
  working: "briefcase",
  visiting: "bag",
  family: "people",
  researcher: "book",
};

const FIELD_LOOK: Record<FieldKey, { color: string; icon: IconName }> = {
  from: { color: "#7b3257", icon: "globe" },
  stay: { color: "#3a2011", icon: "clock" },
  role: { color: "#2a6a45", icon: "badge" },
  language: { color: "#b4442a", icon: "globe" },
  base: { color: "#8e2f17", icon: "pin" },
  topics: { color: "#5d554a", icon: "star" },
};

/** What a line's tile shows: the value's own mark when there is one to show. A private value shows only its lock. */
function TileMark({ field, profile }: { field: FieldKey; profile: ProfileV3 }) {
  switch (field) {
    case "from":
      return <>{countryOf(profile.from)?.code}</>;
    case "stay":
      return <Icon name={STAYS.find((s) => s.id === profile.stay)?.icon as IconName} size={19} />;
    case "role":
      return <Icon name={ROLE_ICON[profile.role ?? ""] ?? "badge"} size={19} />;
    case "language": {
      const l = languageOf(profile.language);
      return <span lang={l?.lang}>{l?.mark}</span>;
    }
    case "base": {
      const area = areaById(profile.base);
      const p = area ? toWindow(area.center) : { x: 50, y: 50 };
      // Zoom the ground picture around the base (×3).
      const z = 3;
      return (
        <>
          <img
            src={groundUrl}
            alt=""
            style={{
              width: `${GROUND_BOX.width * z}%`,
              height: `${GROUND_BOX.height * z}%`,
              left: `${50 - (p.x - GROUND_BOX.left) * z}%`,
              top: `${50 - (p.y - GROUND_BOX.top) * z}%`,
            }}
          />
          <span className={book.tilePin} />
        </>
      );
    }
    case "topics": {
      const photo = topicPhoto(profile.topics[0]);
      return photo ? <img className={book.tilePhoto} src={photo.src} alt="" /> : <Icon name="star" size={19} />;
    }
  }
}

function FileRow({ field, profile, onEdit }: { field: FieldKey; profile: ProfileV3; onEdit: () => void }) {
  const value = fieldValue(profile, field, areaShortName);
  const hidden = profile.hidden.includes(field);
  const look = FIELD_LOOK[field];
  return (
    <li className={book.row}>
      <span
        className={value === null ? `${book.tile} ${book.tileEmpty}` : book.tile}
        style={{ "--tile": look.color } as CSSProperties}
        aria-hidden="true"
      >
        {value === null ? (
          <Icon name={look.icon} size={19} />
        ) : hidden ? (
          <Icon name="lock" size={18} />
        ) : (
          <TileMark field={field} profile={profile} />
        )}
      </span>
      <span className={book.rowText}>
        <span className={book.rowLabel}>{FIELD_LABELS[field]}</span>
        <button type="button" className={book.rowEdit} onClick={onEdit} aria-label={`Edit ${FIELD_LABELS[field]}`}>
          <span className={value === null ? `${book.rowValue} ${book.rowEmpty}` : book.rowValue}>
            {value === null ? "Not set" : hidden ? "Hidden" : value}
          </span>
        </button>
      </span>
      <span className={book.rowEye}>
        <EyeButton field={field} hidden={hidden} onToggle={() => toggleHidden(field)} />
      </span>
    </li>
  );
}

function Bead({ icon }: { icon: IconName }) {
  return (
    <span className={book.bead}>
      <Icon name={icon} size={17} />
    </span>
  );
}

export default function MySpacePage() {
  const navigate = useNavigate();
  const holder = useHolderName();
  const [profile] = usePersistentStore(profileV3Store);
  const [hunt] = usePersistentStore(huntModeStore);
  const [personal] = usePersistentStore(explorePersonalStore);
  const [opened] = usePersistentStore(openedCardsStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [tips] = usePersistentStore(tipsStore);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [cat, setCat] = useCategoryParam();
  // Hunt keeps its records outside the stores; read them once per visit.
  const volumes = useMemo(() => storyRecords().filter((r) => r.finished).length, []);
  const challenges = useMemo(() => openChallenges(localToday()), []);

  const stamps = allStamps(personal, opened, stories).filter((s) => s.collected).length;
  // The same counts as Moments: real cards only, and tips from locals (not the labelled samples).
  const realTips = tips.filter((t) => !t.sample).length;
  const rank = rankOf(openedCards(opened).length, realTips);
  const together = isTogether(hunt);
  const regionName = uraRegion(hunt.region)?.name;

  const privateCount = profile.hidden.filter((f) => fieldValue(profile, f, areaShortName) !== null).length;
  const filled = FIELDS.filter((f) => fieldValue(profile, f, areaShortName) !== null).length;

  return (
    <AppShell>
      <div className={styles.screen}>
        <PageBar title="Passport" tone="light" />
        <CategoryChips value={cat} onChange={setCat} label="Filter your collection" className={styles.chips} />
        <PassportCard
          holder={holder}
          profile={profile}
          stamps={stamps}
          volumes={volumes}
          tips={realTips}
          rank={rank.step.label}
          together={together}
          regionName={regionName}
        />
        {/* "chose to hunt" is Home's rule (huntModeStore mode "together"), with Home's region and card */}
        {together && (
          <RegionLeaderboard region={hunt.region ?? "central"} challenges={challenges} titleId="passport-board-title" />
        )}
        <JournalStrip />
        <Collection profile={profile} personal={personal} cat={cat} />

        <section className={styles.section} aria-labelledby="passport-file">
          <div className={styles.sectionHead}>
            <h2 id="passport-file">
              On file
              {filled < FIELDS.length && <span className={styles.meta}>{` ${filled} of ${FIELDS.length}`}</span>}
            </h2>
            <span className={styles.meta}>Tap to edit, eye to hide</span>
          </div>
          <ul className={book.file}>
            {FIELDS.map((field) => (
              <FileRow key={field} field={field} profile={profile} onEdit={() => setEditing(field)} />
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-label="More">
          <div className={book.ledger}>
            <Link to={paths.saved} className={book.line}>
              <Bead icon="star" />
              <span className={book.lineText}>
                <span className={book.lineTitle}>Saved places</span>
              </span>
              <Icon name="chevron" size={18} className={book.chevron} />
            </Link>
            {/* the walks list (team and editor's routes) had no way in once the Nearby explorer was retired */}
            <Link to={paths.routes} className={book.line}>
              <Bead icon="flag" />
              <span className={book.lineText}>
                <span className={book.lineTitle}>Walks</span>
              </span>
              <Icon name="chevron" size={18} className={book.chevron} />
            </Link>
            {/* the v1 Nearby explorer is retired (8 Nov 2026): every place is on Home's map */}
            <Link to={paths.today} className={book.line}>
              <Bead icon="pin" />
              <span className={book.lineText}>
                <span className={book.lineTitle}>All places</span>
              </span>
              <Icon name="chevron" size={18} className={book.chevron} />
            </Link>
            <Link to={paths.mySpacePrivacy} className={book.privacy}>
              <span className={book.line}>
                <Bead icon="shield" />
                <span className={book.lineText}>
                  <span className={book.lineTitle}>Privacy & data</span>
                  <span className={book.lineSub}>
                    {`${formatBytes(totalBytes())} on this phone${privateCount ? ` · ${privateCount} private` : ""}`}
                  </span>
                </span>
                <Icon name="chevron" size={18} className={book.chevron} />
              </span>
              <StorageBar />
            </Link>
            <button type="button" className={book.line} onClick={() => navigate(`${paths.welcome}?step=1`)}>
              <Bead icon="redo" />
              <span className={book.lineText}>
                <span className={book.lineTitle}>Redo onboarding</span>
              </span>
              <Icon name="chevron" size={18} className={book.chevron} />
            </button>
          </div>
        </section>
      </div>
      {editing && <FieldEditor field={editing} profile={profile} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}
