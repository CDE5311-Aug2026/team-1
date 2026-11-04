// The Passport tab on Home's kraft paper: the holder's data page (tilts like a card, the rank pressed on as a stamp),
// what the app knows as six paper slips (tap to edit, eye = private), and a leather ledger with the two switches,
// Privacy & data and Redo onboarding. Settings and Help live in the top bar.
import {
  motion,
  useMotionValue,
  useReducedMotionConfig,
  useSpring,
  useTransform,
} from "motion/react";
import { useState, type PointerEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import groundUrl from "../../assets/nearby/sg-ground.webp";
import logo from "../../assets/brand/findsg-logo.png";
import logoInk from "../../assets/brand/findsg-logo-black.png";
import AppShell from "../../components/AppShell/AppShell";
import { buildStamps, openedCards, rankOf } from "../../data/moments/moments";
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
import { CodeCircle } from "../OnboardingPage/v3/Pickers";
import useInitial from "../OnboardingPage/v3/useInitial";
import FieldEditor from "./v3/FieldEditor";
import StorageBar from "./v3/StorageBar";
import styles from "./v3/MySpace.module.css";
import book from "./v3/Booklet.module.css";
import PageBar from "../../components/PageBar/PageBar";

function Holder({ profile }: { profile: ProfileV3 }) {
  const initial = useInitial();
  const reduce = useReducedMotionConfig();
  const [personal] = usePersistentStore(explorePersonalStore);
  const [opened] = usePersistentStore(openedCardsStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [tips] = usePersistentStore(tipsStore);
  const stamps = buildStamps(personal, opened, stories).filter(
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
            <span>{initial}</span>
          </div>
          <div className={book.bioMain}>
            <p className={book.field}>
              <span>Holder</span>
              <strong>{initial}</strong>
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
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 16, delay: 0.55 }
            }
          >
            <Link to={paths.moments} className={book.stamp}>
              <Icon name="star" size={11} className={book.stampStar} />
              <span>{rank.step.label}</span>
            </Link>
          </motion.div>
        </div>
        <p className={book.mrz} aria-hidden="true">
          <span>{mrzLine(initial, profile)}</span>
          <span>{`${String(stamps).padStart(3, "0")}SGP${String(cards).padStart(4, "0")}<<${String(realTips).padStart(3, "0")}<<<<<<<<<<<<<<<<<<<<<<<<<<`}</span>
        </p>
      </motion.section>
    </motion.div>
  );
}

/** The small picture at the top of each tile. */
function Visual({
  field,
  profile,
}: {
  field: FieldKey;
  profile: ProfileV3;
}): ReactNode {
  switch (field) {
    case "from": {
      const c = countryOf(profile.from);
      return (
        <span className={styles.route}>
          <CodeCircle
            code={c?.code ?? "?"}
            color={
              c
                ? profile.hidden.includes("from")
                  ? "#d9a0a6"
                  : c.color
                : "#c9c3b8"
            }
            size={40}
          />
          <svg className={styles.arc} viewBox="0 0 60 24" aria-hidden="true">
            <path
              d="M2 22 C 18 0, 42 0, 58 22"
              fill="none"
              stroke="#e9a378"
              strokeWidth="2"
            />
            <path
              d="M27 6l4-3-1 5"
              fill="none"
              stroke="#e4671f"
              strokeWidth="1.6"
            />
          </svg>
          <CodeCircle code="SG" color="#6b665e" size={40} />
        </span>
      );
    }
    case "stay": {
      const index = STAYS.findIndex((s) => s.id === profile.stay);
      return (
        <span className={styles.miniTimeline}>
          <span className={styles.miniIcon}>
            <Icon
              name={(STAYS[Math.max(0, index)].icon as IconName) ?? "plane"}
              size={16}
            />
          </span>
          <span className={styles.miniTrack}>
            {STAYS.map((s, i) => (
              <span
                key={s.id}
                className={i === index ? styles.miniStopOn : styles.miniStop}
              />
            ))}
          </span>
        </span>
      );
    }
    case "role":
      return (
        <span className={styles.roleVisual}>
          <span className={styles.roleBox}>
            <Icon
              name={(ROLE_ICON[profile.role ?? ""] ?? "badge") as IconName}
              size={22}
            />
          </span>
          <span className={styles.roleLines} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </span>
      );
    case "language": {
      const l = languageOf(profile.language);
      return (
        <span className={styles.langVisual}>
          <span className={styles.langBig} lang={l?.lang}>
            {l?.mark ?? "··"}
          </span>
          <span className={styles.bubble} lang={l?.lang}>
            {l ? (l.id === "en" ? "Hello" : l.name) : "Hello"}
          </span>
        </span>
      );
    }
    case "base": {
      const area = areaById(profile.base);
      const p = area ? toWindow(area.center) : { x: 50, y: 50 };
      // Zoom the ground picture around the base (×3).
      const z = 3;
      return (
        <span className={styles.miniMap}>
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
          {area && (
            <span className={styles.miniPin}>
              <Icon name="pin" size={26} strokeWidth={2} />
            </span>
          )}
        </span>
      );
    }
    case "topics":
      return (
        <span className={styles.stack}>
          {(profile.topics.length ? profile.topics : []).map((t, i) => {
            const photo = topicPhoto(t);
            return (
              <span
                key={t}
                className={styles.stackCard}
                style={{
                  zIndex: 10 - i,
                  left: `${i * 21}%`,
                  transform: `rotate(${(i - 1.5) * 3}deg)`,
                }}
              >
                {photo && <img src={photo.src} alt="" />}
                <span
                  className={
                    i === 0
                      ? `${styles.stackRank} ${styles.stackRankOn}`
                      : styles.stackRank
                  }
                >
                  {i + 1}
                </span>
              </span>
            );
          })}
        </span>
      );
  }
}

const ROLE_ICON: Record<string, string> = {
  student: "cap",
  intern: "badge",
  working: "briefcase",
  visiting: "bag",
  family: "people",
  researcher: "book",
};

function KnowsTile({
  field,
  index,
  profile,
  onEdit,
}: {
  field: FieldKey;
  index: number;
  profile: ProfileV3;
  onEdit: () => void;
}) {
  const reduce = useReducedMotionConfig();
  const value = fieldValue(profile, field, areaShortName);
  const hidden = profile.hidden.includes(field);
  return (
    <motion.li
      className={book.slip}
      initial={reduce ? false : { opacity: 0, y: 18, rotate: index % 2 ? 2 : -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.15 + index * 0.05 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
    >
      <div className={book.slipTop}>
        <span className={book.slipLabel}>{FIELD_LABELS[field]}</span>
        <EyeButton
          field={field}
          hidden={hidden}
          onToggle={() => toggleHidden(field)}
        />
      </div>
      <span className={book.slipVisual} aria-hidden="true">
        <Visual field={field} profile={profile} />
      </span>
      <button
        type="button"
        className={book.slipButton}
        onClick={onEdit}
        aria-label={`Edit ${FIELD_LABELS[field]}`}
      >
        <span className={value === null ? `${book.slipValue} ${book.slipEmpty}` : book.slipValue}>
          {value === null ? (
            "Not set"
          ) : hidden ? (
            <>
              <Icon name="lock" size={14} /> Hidden
            </>
          ) : (
            value
          )}
        </span>
      </button>
    </motion.li>
  );
}

/** The brass-ringed icon at the start of a ledger line. */
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

        <h2 className={book.heading}>
          <span>On file</span>
          <span className={book.headingRule} aria-hidden="true" />
        </h2>
        <ul className={book.slips}>
          {FIELDS.map((field, i) => (
            <KnowsTile
              key={field}
              field={field}
              index={i}
              profile={profile}
              onEdit={() => setEditing(field)}
            />
          ))}
        </ul>

        <div className={book.ledger}>
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
