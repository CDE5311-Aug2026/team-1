// The visual editors for each thing the app knows (Figma O2–O7, reused by My Space S1/S4): country tiles, stay tiles and
// timeline, role tiles, language tiles in their own script, a tap-to-pin map and tap-in-order topic photos.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';
import groundUrl from '../../../assets/nearby/sg-ground.webp';
import {
  BASE_AREAS,
  GROUND_BOX,
  MAP_ASPECT,
  areaById,
  fromWindow,
  nearestArea,
  shortArea,
  toWindow,
  topicPhoto,
} from '../../../data/profile/finds';
import {
  COUNTRIES,
  LANGUAGES,
  ROLES,
  STAYS,
  TOPICS,
  rankTap,
  type CountryCode,
  type LanguageId,
  type RoleId,
  type StayId,
  type TopicId,
} from '../../../data/profile/profile';
import Icon, { type IconName } from './icons';
import type { Preview } from './previews';
import styles from './v3.module.css';

const PRESS = { scale: 0.96 };
const SPRING = { type: 'spring', stiffness: 500, damping: 30 } as const;

function Tile({ selected, onClick, className, children, label }: { selected: boolean; onClick: () => void; className?: string; children: ReactNode; label?: string }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      className={`${styles.tile} ${className ?? ''}`}
      onClick={onClick}
      whileTap={reduce ? undefined : PRESS}
      transition={SPRING}
    >
      {children}
      {selected && (
        <span className={styles.tileCheck} aria-hidden="true">
          <Icon name="check" size={12} strokeWidth={2.6} />
        </span>
      )}
    </motion.button>
  );
}

export function CodeCircle({ code, color, size = 40 }: { code: string; color: string; size?: number }) {
  return (
    <span className={styles.code} style={{ background: color, width: size, height: size }} aria-hidden="true">
      {code}
    </span>
  );
}

export function CountryPicker({ value, onChange }: { value: CountryCode | null; onChange: (code: CountryCode) => void }) {
  const main = COUNTRIES.slice(0, 6);
  const more = COUNTRIES.slice(6);
  return (
    <div className={styles.pickerStack}>
      <div className={`${styles.grid} ${styles.grid3}`} role="group" aria-label="Countries">
        {main.map((c) => (
          <Tile key={c.code} selected={value === c.code} onClick={() => onChange(c.code)} className={styles.countryTile}>
            <CodeCircle code={c.code} color={c.color} />
            <span className={styles.tileName}>{c.name}</span>
          </Tile>
        ))}
      </div>
      <div className={styles.chipRow} role="group" aria-label="More countries">
        {more.map((c) => (
          <Tile key={c.code} selected={value === c.code} onClick={() => onChange(c.code)} className={styles.countryChip}>
            <CodeCircle code={c.code} color={c.color} size={26} />
            <span className={styles.chipName}>{c.name}</span>
          </Tile>
        ))}
      </div>
    </div>
  );
}

export function StayPicker({ value, onChange }: { value: StayId | null; onChange: (id: StayId) => void }) {
  return (
    <div className={`${styles.grid} ${styles.grid2}`} role="group" aria-label="Time in Singapore">
      {STAYS.map((s) => (
        <Tile key={s.id} selected={value === s.id} onClick={() => onChange(s.id)} className={styles.stayTile}>
          <span className={styles.iconSquare}>
            <Icon name={s.icon as IconName} />
          </span>
          <span className={styles.tileName}>{s.label}</span>
          <span className={styles.tileNote}>{s.note}</span>
        </Tile>
      ))}
    </div>
  );
}

/** S4: drag along the timeline (a native range, so keys and screen readers work too). */
export function StayTimeline({ value, onChange }: { value: StayId; onChange: (id: StayId) => void }) {
  const index = STAYS.findIndex((s) => s.id === value);
  const stay = STAYS[index];
  return (
    <div className={styles.timelineBox}>
      <div className={styles.timelineHead}>
        <span className={styles.timelineIcon}>
          <Icon name={stay.icon as IconName} size={22} />
        </span>
        <span className={styles.timelineText}>
          <strong>{stay.label}</strong>
          <span>{stay.note}</span>
        </span>
        <span className={styles.density} aria-label={`Cards give ${4 - index} of 4 lines of background`} role="img">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < 4 - index ? styles.densityOn : styles.densityOff} />
          ))}
        </span>
      </div>
      <div className={styles.timeline}>
        <input
          type="range"
          min={0}
          max={STAYS.length - 1}
          step={1}
          value={index}
          aria-label="Time in Singapore"
          aria-valuetext={stay.label}
          className={styles.range}
          style={{ ['--pos' as string]: `${(index / (STAYS.length - 1)) * 100}%` }}
          onChange={(e) => onChange(STAYS[Number(e.target.value)].id)}
        />
        <div className={styles.ticks} aria-hidden="true">
          {STAYS.map((s, i) => (
            <span key={s.id} className={i === index ? styles.tickOn : undefined}>
              {s.tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RolePicker({ value, onChange }: { value: RoleId | null; onChange: (id: RoleId) => void }) {
  return (
    <div className={`${styles.grid} ${styles.grid3}`} role="group" aria-label="Roles">
      {ROLES.map((r) => (
        <Tile key={r.id} selected={value === r.id} onClick={() => onChange(r.id)} className={styles.roleTile}>
          <span className={styles.iconRound}>
            <Icon name={r.icon as IconName} />
          </span>
          <span className={styles.tileName}>{r.label}</span>
        </Tile>
      ))}
    </div>
  );
}

export function LanguagePicker({ value, onChange }: { value: LanguageId | null; onChange: (id: LanguageId) => void }) {
  return (
    <div className={`${styles.grid} ${styles.grid2}`} role="group" aria-label="Languages">
      {LANGUAGES.map((l) => (
        <Tile key={l.id} selected={value === l.id} onClick={() => onChange(l.id)} className={styles.languageTile} label={`${l.name}, ${l.english}`}>
          <span className={styles.langMark} lang={l.lang}>
            {l.mark}
          </span>
          <span className={styles.langText}>
            <span className={styles.tileName} lang={l.lang}>
              {l.name}
            </span>
            <span className={styles.tileNote}>{l.english}</span>
          </span>
        </Tile>
      ))}
    </div>
  );
}

/** O6: tap the map to drop a pin; it snaps to the nearest Nearby area. Area dots are buttons too. */
export function BaseMap({ value, onChange }: { value: string | null; onChange: (areaId: string) => void }) {
  const reduce = useReducedMotionConfig();
  const box = useRef<HTMLDivElement>(null);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const selected = areaById(value);

  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.ground) return;
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const area = nearestArea(fromWindow((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height));
    onChange(area.id);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setNote('Location isn’t available here. Tap the map instead.');
      return;
    }
    setLocating(true);
    setNote(null);
    // Used once to pick the nearest area; the position itself is not stored.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange(nearestArea({ lat: pos.coords.latitude, lng: pos.coords.longitude }).id);
      },
      () => {
        setLocating(false);
        setNote('Couldn’t get your location. Tap the map instead.');
      },
      { maximumAge: 60_000, timeout: 10_000 },
    );
  };

  const pin = selected ? toWindow(selected.center) : null;
  return (
    <div className={styles.mapWrap}>
      <div ref={box} className={styles.map} style={{ aspectRatio: String(MAP_ASPECT) }} onClick={tap} data-ground="1">
        <img
          className={styles.ground}
          src={groundUrl}
          alt=""
          data-ground="1"
          draggable={false}
          style={{ width: `${GROUND_BOX.width}%`, height: `${GROUND_BOX.height}%`, left: `${GROUND_BOX.left}%`, top: `${GROUND_BOX.top}%` }}
        />
        {BASE_AREAS.map((a) => {
          const p = toWindow(a.center);
          const on = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              className={on ? `${styles.areaDot} ${styles.areaDotOn}` : styles.areaDot}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              aria-pressed={on}
              aria-label={a.name}
              onClick={() => onChange(a.id)}
            >
              <span className={styles.areaDotMark} aria-hidden="true" />
              {on && <span className={styles.areaLabel}>{shortArea(a)}</span>}
            </button>
          );
        })}
        {pin && (
          <motion.span
            key={value}
            className={styles.pin}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            initial={reduce ? false : { y: -28, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 18 }}
            aria-hidden="true"
          >
            <Icon name="pin" size={30} strokeWidth={2} />
          </motion.span>
        )}
        {!selected && (
          <span className={styles.mapHint} aria-hidden="true">
            <span className={styles.mapHand}>
              <Icon name="hand" size={22} />
            </span>
            Tap the map
          </span>
        )}
        <button type="button" className={styles.locate} onClick={locate} aria-label="Use my location once" disabled={locating}>
          <Icon name="locate" size={20} />
        </button>
        <span className={styles.osm}>© OpenStreetMap contributors</span>
      </div>
      <p className={styles.mapNote} aria-live="polite">
        {note ?? (selected ? `Home base: ${selected.name}` : 'Your pin snaps to the nearest area. Only the area is kept.')}
      </p>
    </div>
  );
}

export function TopicRanker({ value, onChange }: { value: TopicId[]; onChange: (next: TopicId[]) => void }) {
  const reduce = useReducedMotionConfig();
  return (
    <div className={styles.pickerStack}>
      <div className={`${styles.grid} ${styles.grid2}`} role="group" aria-label="Topics, tap in order">
        {TOPICS.map((t) => {
          const rank = value.indexOf(t.id) + 1;
          const photo = topicPhoto(t.id);
          return (
            <motion.button
              key={t.id}
              type="button"
              className={rank ? `${styles.photoTile} ${styles.photoTileOn}` : styles.photoTile}
              aria-pressed={rank > 0}
              aria-label={rank ? `${t.label}, ranked ${rank}` : t.label}
              onClick={() => onChange(rankTap(value, t.id))}
              whileTap={reduce ? undefined : PRESS}
              transition={SPRING}
            >
              {photo && <img src={photo.src} alt="" className={styles.photoImg} />}
              <span className={styles.photoShade} aria-hidden="true" />
              <span className={styles.photoLabel}>{t.label}</span>
              <span className={rank ? `${styles.rankBadge} ${styles.rankBadgeOn}` : styles.rankBadge} aria-hidden="true">
                {rank ? (
                  <motion.span key={rank} initial={reduce ? false : { scale: 0.3 }} animate={{ scale: 1 }} transition={SPRING}>
                    {rank}
                  </motion.span>
                ) : null}
              </span>
            </motion.button>
          );
        })}
      </div>
      <button type="button" className={styles.resetBtn} onClick={() => onChange([])} disabled={value.length === 0}>
        <Icon name="reset" size={16} />
        Reset order
      </button>
    </div>
  );
}

export function PreviewCard({ preview }: { preview: Preview }) {
  const reduce = useReducedMotionConfig();
  return (
    <section className={styles.preview} aria-label="Preview">
      <p className={styles.previewKicker}>
        <Icon name="star" size={11} /> {preview.kicker}
      </p>
      <motion.div
        key={preview.title + preview.text}
        className={styles.previewCard}
        initial={reduce ? false : { opacity: 0.4, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
        aria-live="polite"
      >
        {preview.photo ? (
          <img className={styles.previewPhoto} src={preview.photo.src} alt="" />
        ) : (
          <span className={`${styles.previewPhoto} ${styles.previewIcon}`} aria-hidden="true">
            <Icon name="pin" size={26} />
          </span>
        )}
        <div className={styles.previewText}>
          <p className={styles.previewTitle}>{preview.title}</p>
          {preview.script && (
            <p className={styles.previewScript} lang={preview.script.lang}>
              {preview.script.text}
            </p>
          )}
          <p className={styles.previewBody}>{preview.text}</p>
          {preview.list && (
            <ol className={styles.previewList}>
              {preview.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
          {preview.lines !== undefined && (
            <span className={styles.density} role="img" aria-label={`${preview.lines} of 4 lines`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < preview.lines! ? styles.densityOn : styles.densityOff} />
              ))}
            </span>
          )}
        </div>
      </motion.div>
    </section>
  );
}
