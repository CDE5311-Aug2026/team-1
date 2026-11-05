// The Passport tab on Home's kraft paper: the holder's leather data page (tilts like a card, the rank stamped on it),
// what the app knows as one list (tap a line to edit, eye = private), and where to go next. Settings and Help live in
// the top bar.
import {
  motion,
  useMotionValue,
  useReducedMotionConfig,
  useSpring,
  useTransform,
} from "motion/react";
import { useState, type CSSProperties, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import groundUrl from "../../assets/nearby/sg-ground.webp";
import logo from "../../assets/brand/findsg-logo.png";
import logoInk from "../../assets/brand/findsg-logo-black.png";
import AppShell from "../../components/AppShell/AppShell";
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
  languageOf,
  holderInitial,
  mrzLine,
  profileV3Store,
  toggleHidden,
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
import { paths } from "../../routes";
import Icon, { type IconName } from "../OnboardingPage/v3/icons";
import { EyeButton } from "../OnboardingPage/v3/Passport";
import useHolderName from "../OnboardingPage/v3/useHolderName";
import FieldEditor from "./v3/FieldEditor";
import StorageBar from "./v3/StorageBar";
import styles from "./v3/MySpace.module.css";
import book from "./v3/Booklet.module.css";
import PageBar from "../../components/PageBar/PageBar";

function Holder({ profile }: { profile: ProfileV3 }) {
  const holder = useHolderName();
  const reduce = useReducedMotionConfig();
  const [personal] = usePersistentStore(explorePersonalStore);
  const [opened] = usePersistentStore(openedCardsStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [tips] = usePersistentStore(tipsStore);
  const stamps = allStamps(personal, opened, stories).filter(
    (s) => s.collected,
  ).length;
  // The same counts as Moments: real cards only, and tips from locals (not the labelled samples).
  const cards = openedCards(opened).length;
  const realTips = tips.filter((t) => !t.sample).length;
  const rank = rankOf(cards, realTips);
  const stats = [
    { label: "Stamps", value: stamps },
    { label: "Cards", value: cards },
    { label: "Tips", value: realTips },
  ];
  // The page tilts toward the finger and the foil follows it, like turning a real passport in the light.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const foil = useTransform(px, [0, 1], ["0%", "100%"]);
  const tilt = (e: PointerEvent<HTMLElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const rest = () => {
    px.set(0.5);
    py.set(0.5);
  };
  return (
    <motion.div
      className={book.stage}
      initial={reduce ? false : { y: 28, opacity: 0, scale: 0.94 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 18 }}
    >
      <motion.section
        className={book.bio}
        aria-label="Passport holder"
        style={{ rotateX, rotateY, "--foil": foil } as never}
        onPointerMove={tilt}
        onPointerLeave={rest}
        onPointerCancel={rest}
        onPointerUp={rest}
      >
        <span className={book.foil} aria-hidden="true" />
        <p className={book.bioHead}>
          <img src={logo} alt="" width={18} height={18} />
          <span>FindSG Passport</span>
          <span className={book.bioRule} aria-hidden="true" />
          <span className={book.bioCode}>SGP</span>
        </p>
        <div className={book.bioBody}>
          <div className={book.photo} aria-hidden="true">
            <img className={book.watermark} src={logoInk} alt="" />
            <span>{holderInitial(holder)}</span>
          </div>
          <div className={book.bioMain}>
            <p className={book.field}>
              <span>Holder</span>
              <strong>{holder}</strong>
            </p>
            <dl className={book.stats}>
              {stats.map((s) => (
                <div key={s.label} className={book.stat}>
                  <dt>{s.label}</dt>
                  <dd>
                    <motion.span
                      key={s.value}
                      style={{ display: "inline-block" }}
                      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 14, delay: 0.35 }
                      }
                    >
                      {s.value}
                    </motion.span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {/* The rank, pressed on like the onboarding WELCOME seal. Opens Moments, where it is earned. */}
          <motion.div
            className={book.stampWrap}
            initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: -40 }}
            animate={{ scale: 1, opacity: 1, rotate: -6 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 16, delay: 0.55 }
            }
          >
            <Link to={paths.moments} className={book.stamp}>
              <Icon name="star" size={10} className={book.stampStar} />
              <span>{rank.step.label}</span>
            </Link>
          </motion.div>
        </div>
        <p className={book.mrz} aria-hidden="true">
          <span>{mrzLine(holder, profile)}</span>
          <span>{`${String(stamps).padStart(3, "0")}SGP${String(cards).padStart(4, "0")}<<${String(realTips).padStart(3, "0")}<<<<<<<<<<<<<<<<<<<<<<<<<<`}</span>
        </p>
      </motion.section>
    </motion.div>
  );
}

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

function FileRow({
  field,
  profile,
  onEdit,
}: {
  field: FieldKey;
  profile: ProfileV3;
  onEdit: () => void;
}) {
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
        <button
          type="button"
          className={book.rowEdit}
          onClick={onEdit}
          aria-label={`Edit ${FIELD_LABELS[field]}`}
        >
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

/** The icon at the start of a line. */
function Bead({ icon }: { icon: IconName }) {
  return (
    <span className={book.bead}>
      <Icon name={icon} size={17} />
    </span>
  );
}

export default function MySpacePage() {
  const navigate = useNavigate();
  const [profile] = usePersistentStore(profileV3Store);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const privateCount = profile.hidden.filter(
    (f) => fieldValue(profile, f, areaShortName) !== null,
  ).length;
  const filled = FIELDS.filter(
    (f) => fieldValue(profile, f, areaShortName) !== null,
  ).length;

  return (
    <AppShell background="#c8a87a">
      <span
        className={book.backdrop}
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}home/paper.webp)` }}
        aria-hidden="true"
      />
      <div className={`${styles.screen} ${book.screen}`}>
        <PageBar title="Passport" tone="light" className={book.bar} />

        <Holder profile={profile} />

        <div className={book.headRow}>
          <h2 className={book.heading}>
            <span>On file</span>
            {filled < FIELDS.length && (
              <span className={book.count}>{`${filled} of ${FIELDS.length}`}</span>
            )}
          </h2>
          <p className={book.hint}>Tap to edit, eye to hide</p>
        </div>
        <ul className={book.file}>
          {FIELDS.map((field) => (
            <FileRow
              key={field}
              field={field}
              profile={profile}
              onEdit={() => setEditing(field)}
            />
          ))}
        </ul>

        <div className={book.ledger}>
          <Link to={paths.saved} className={book.line}>
            <Bead icon="star" />
            <span className={book.lineText}>
              <span className={book.lineTitle}>Saved places</span>
            </span>
            <Icon name="chevron" size={18} className={book.chevron} />
          </Link>
          <Link to={paths.nearby} className={book.line}>
            <Bead icon="pin" />
            <span className={book.lineText}>
              <span className={book.lineTitle}>All places</span>
            </span>
            <Icon name="chevron" size={18} className={book.chevron} />
          </Link>
          {/* PR #5's privacy summary: real size on this phone, private details, and the storage bar by area. */}
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
          <button
            type="button"
            className={book.line}
            onClick={() => navigate(`${paths.welcome}?step=1`)}
          >
            <Bead icon="redo" />
            <span className={book.lineText}>
              <span className={book.lineTitle}>Redo onboarding</span>
            </span>
            <Icon name="chevron" size={18} className={book.chevron} />
          </button>
        </div>
      </div>
      {editing && (
        <FieldEditor
          field={editing}
          profile={profile}
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
}
