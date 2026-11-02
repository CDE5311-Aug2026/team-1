// My Space v3 (Figma S1): the holder card, what the app knows as six visual tiles (tap to edit, eye = private), the two
// switches, and links to Privacy & data, Settings, Redo onboarding and Help.
import { motion, useReducedMotionConfig } from "motion/react";
import { openHelp } from "../../components/HelpCenter/helpStore";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import groundUrl from "../../assets/nearby/sg-ground.webp";
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
  FIELD_USES,
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
  settingsStore,
  tipsStore,
} from "../../data/stores";
import { paths } from "../../routes";
import Icon, { type IconName } from "../OnboardingPage/v3/icons";
import { EyeButton } from "../OnboardingPage/v3/Passport";
import { CodeCircle } from "../OnboardingPage/v3/Pickers";
import useInitial from "../OnboardingPage/v3/useInitial";
import FieldEditor from "./v3/FieldEditor";
import { useMemories } from "./v3/MemorySection";
import { setMemoryEnabled } from "../../data/memory";
import { Switch } from "./v3/Parts";
import StorageBar from "./v3/StorageBar";
import styles from "./v3/MySpace.module.css";
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
  return (
    <section className={styles.holder} aria-label="Passport holder">
      <p className={styles.holderHead}>
        <span>HOLDER</span>
        <span className={styles.holderRule} aria-hidden="true" />
        <span>SGP</span>
      </p>
      <div className={styles.holderBody}>
        <div className={styles.holderPhoto} aria-hidden="true">
          <span>{initial}</span>
        </div>
        <div className={styles.holderMain}>
          <div className={styles.holderName}>
            <span className={styles.holderInitial}>{initial}</span>
            <Link to={paths.moments} className={styles.rank}>
              <Icon name="star" size={13} /> {rank.step.label}
            </Link>
          </div>
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
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
                        : {
                            type: "spring",
                            stiffness: 420,
                            damping: 14,
                            delay: 0.15,
                          }
                    }
                  >
                    {s.value}
                  </motion.span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className={styles.holderMrz} aria-hidden="true">
        {mrzLine(initial, profile)}
      </p>
    </section>
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
  profile,
  onEdit,
}: {
  field: FieldKey;
  profile: ProfileV3;
  onEdit: () => void;
}) {
  const reduce = useReducedMotionConfig();
  const value = fieldValue(profile, field, areaShortName);
  const hidden = profile.hidden.includes(field);
  return (
    <motion.li
      className={styles.knows}
      whileTap={reduce ? undefined : { scale: 0.98 }}
    >
      <div className={styles.knowsTop}>
        <span className={styles.knowsLabel}>{FIELD_LABELS[field]}</span>
        <EyeButton
          field={field}
          hidden={hidden}
          onToggle={() => toggleHidden(field)}
        />
      </div>
      <span className={styles.visual} aria-hidden="true">
        <Visual field={field} profile={profile} />
      </span>
      <button
        type="button"
        className={styles.knowsButton}
        onClick={onEdit}
        aria-label={`Edit ${FIELD_LABELS[field]}`}
      >
        <span className={styles.knowsValue}>
          {value === null ? (
            "Not set"
          ) : hidden ? (
            <>
              <Icon name="lock" size={15} /> Hidden
            </>
          ) : (
            value
          )}
        </span>
      </button>
      <span className={styles.knowsUse}>{FIELD_USES[field]}</span>
    </motion.li>
  );
}

function Row({
  icon,
  title,
  sub,
  to,
  onClick,
}: {
  icon: IconName;
  title: string;
  sub?: string;
  to?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={styles.rowIcon}>
        <Icon name={icon} size={18} />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {sub && <span className={styles.rowSub}>{sub}</span>}
      </span>
      <Icon name="chevron" size={18} className={styles.rowChevron} />
    </>
  );
  return to ? (
    <Link to={to} className={styles.row}>
      {body}
    </Link>
  ) : (
    <button type="button" className={styles.row} onClick={onClick}>
      {body}
    </button>
  );
}

export default function MySpacePage() {
  const navigate = useNavigate();
  const [profile] = usePersistentStore(profileV3Store);
  const [settings, setSettings] = usePersistentStore(settingsStore);
  const memory = useMemories();
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const privateCount = profile.hidden.filter(
    (f) => fieldValue(profile, f, areaShortName) !== null,
  ).length;

  return (
    <AppShell background="#edebe5">
      <div className={styles.screen}>
        <PageBar title="Passport" tone="light" />

        <Holder profile={profile} />

        <div className={styles.sectionHead}>
          <h2 className={styles.kicker}>What the app knows</h2>
          <span className={styles.kickerAside}>
            <Icon name="eyeClosed" size={15} /> Closed eye = private
          </span>
        </div>
        <ul className={styles.knowsGrid}>
          {FIELDS.map((field) => (
            <KnowsTile
              key={field}
              field={field}
              profile={profile}
              onEdit={() => setEditing(field)}
            />
          ))}
        </ul>

        <h2 className={styles.kicker}>Switches</h2>
        <div className={styles.card}>
          <div className={styles.switchRow}>
            <span className={styles.rowIcon}>
              <Icon name="flag" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Flag occasions</span>
              <span className={styles.rowSub} id="hint-occasions">
                Reads calendar titles only
              </span>
            </span>
            <Switch
              label="Flag occasions"
              describedBy="hint-occasions"
              checked={settings.occasions}
              onChange={(on) => setSettings((s) => ({ ...s, occasions: on }))}
            />
          </div>
          <div className={styles.switchRow}>
            <span className={styles.rowIcon}>
              <Icon name="book" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Memory</span>
              <span className={styles.rowSub} id="hint-memory-row">
                {memory.state.enabled
                  ? `${memory.items.length} ${memory.items.length === 1 ? "thing" : "things"} Ask remembers`
                  : "Off"}{" "}
                ·{" "}
                <Link
                  to={`${paths.mySpaceSettings}?section=memory`}
                  className={styles.inlineLink}
                >
                  Manage
                </Link>
              </span>
            </span>
            <Switch
              label="Memory"
              describedBy="hint-memory-row"
              checked={memory.state.enabled}
              onChange={setMemoryEnabled}
            />
          </div>
        </div>

        {/* PR #5's privacy summary: real size on this phone, private details, and the storage bar by area. */}
        <Link to={paths.mySpacePrivacy} className={styles.privacyCard}>
          <span className={styles.row}>
            <span className={styles.rowIcon}>
              <Icon name="shield" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>Privacy & data</span>
              <span className={styles.rowSub}>
                {`${formatBytes(totalBytes())} · on this phone only${privateCount ? ` · ${privateCount} detail${privateCount === 1 ? "" : "s"} private` : ""}`}
              </span>
            </span>
            <Icon name="chevron" size={18} className={styles.rowChevron} />
          </span>
          <StorageBar />
        </Link>

        <nav className={styles.card} aria-label="More">
          <Row icon="gear" title="Settings" to={paths.mySpaceSettings} />
          <Row
            icon="redo"
            title="Redo onboarding"
            sub="6 questions"
            onClick={() => navigate(`${paths.welcome}?step=1`)}
          />
          <Row
            icon="help"
            title="Help & feedback"
            onClick={() => openHelp("feedback")}
          />
        </nav>
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
