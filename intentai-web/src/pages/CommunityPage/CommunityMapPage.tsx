// /community/map — Locals near your places (Figma C5). Nearby's street map (CityMap, used as-is), desaturated, with
// a layer of question pins (photo in a status ring + badge + label) and people (initials, area level only), a
// status filter with computed counts, the Answer-as-a-local switch, "+ Ask", and a card carousel synced both ways
// with the pins. The pin layer follows the map through the view CityMap publishes on its element (data-center /
// data-scale), so pins move with every pan and zoom.
import { motion, useReducedMotionConfig } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import CityMap, { MAP_ATTRIBUTION, type MapFocus } from '../../features/nearby/map/CityMap';
import { toScreen, toXY, type View } from '../../features/nearby/map/projection';
import type { LatLng } from '../../features/nearby/types';
import {
  PIN_STATUS_LABEL,
  areaById,
  mapPeople,
  mapQuestions,
  shortArea,
  statusCounts,
  type MapPerson,
  type MapQuestion,
  type PinStatus,
} from '../../data/community/map';
import { communitySocialStore, toggleIn } from '../../data/community/social';
import { usePersistentStore } from '../../data/persistentStore';
import { localProfileStore, publicTags, withPrefill } from '../../data/profile/localProfile';
import { profileV3Store } from '../../data/profile/profile';
import { explorePersonalStore } from '../../data/stores';
import mascot from '../../assets/v3/mascot.png';
import { paths, type CommunityHandoff } from '../../routes';
import { useSpan } from '../../usage/useSpan';
import AskLocalSheet, { PRIVACY_LINE } from './AskLocalSheet';
import { Avatar, ExampleTag } from './bits';
import { memberByName, sinceLabel } from '../../data/community/people';
import { Icon, type IconName } from './icons';
import LocalProfileSheet, { LOCAL_PROFILE_TITLE } from './LocalProfileSheet';
import NotificationsSheet from './NotificationsSheet';
import { postQuestion } from './post';
import Sheet from './Sheet';
import { useCommunity } from './useCommunity';
import styles from './CommunityMapPage.module.css';

type Filter = PinStatus | 'all';
const FILTERS: { id: Filter; icon?: IconName; label: string }[] = [
  { id: 'all', icon: 'pin', label: 'All' },
  { id: 'answered', icon: 'check', label: 'Answered' },
  { id: 'waiting', icon: 'hourglass', label: 'Waiting' },
  { id: 'needs', icon: 'question', label: 'Needs a local' },
];
const BADGE: Record<PinStatus, IconName> = { answered: 'check', waiting: 'hourglass', needs: 'question' };
const INSETS = { top: 116, bottom: 318 };

/** A view around all points with room for the pins' rings and labels. */
function fitAll(points: LatLng[]): MapFocus {
  if (!points.length) return { id: 1, center: { lat: 1.3, lng: 103.84 }, radiusM: 6000 };
  const lat = (Math.min(...points.map((p) => p.lat)) + Math.max(...points.map((p) => p.lat))) / 2;
  const lng = (Math.min(...points.map((p) => p.lng)) + Math.max(...points.map((p) => p.lng))) / 2;
  const radiusM = Math.max(...points.map((p) => Math.hypot((p.lat - lat) * 110574, (p.lng - lng) * 111290)));
  return { id: 1, center: { lat, lng }, radiusM: radiusM * 1.25 + 1500 };
}

/** The map's current view, read from CityMap's own element (it updates them on every render). */
function useMapView(box: RefObject<HTMLDivElement>): View | null {
  const [view, setView] = useState<View | null>(null);
  useLayoutEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[data-testid="city-map"]');
    if (!el) return undefined;
    const read = () => {
      const [x, y] = (el.dataset.center ?? '0,0').split(',').map(Number);
      const scale = Number(el.dataset.scale ?? '0');
      if (!scale) return;
      setView({ center: { x, y }, scale, width: el.clientWidth || box.current!.clientWidth, height: el.clientHeight || box.current!.clientHeight });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['data-center', 'data-scale'] });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    ro?.observe(el);
    return () => {
      mo.disconnect();
      ro?.disconnect();
    };
  }, [box]);
  return view;
}

export default function CommunityMapPage() {
  const data = useCommunity();
  const { questions, social, settings, lookups, tips, notifications, setLocal } = data;
  const navigate = useNavigate();
  const reduce = useReducedMotionConfig();
  const [personal] = usePersistentStore(explorePersonalStore);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | undefined>();
  const [sheet, setSheet] = useState<'notifications' | 'me' | null>(null);
  const [person, setPerson] = useState<MapPerson | null>(null);
  const [group, setGroup] = useState<MapPerson[]>([]);
  const [asking, setAsking] = useState<CommunityHandoff | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const view = useMapView(boxRef);
  useSpan('activity', 'Community › locals map', true);

  const all = useMemo(() => mapQuestions(questions, social, lookups, tips), [questions, social, lookups, tips]);
  const counts = statusCounts(all);
  const shown = filter === 'all' ? all : all.filter((q) => q.status === filter);
  const people = mapPeople(social, settings.local);
  const unread = notifications.filter((n) => n.unread).length;
  const current = shown.find((q) => q.id === selected) ?? shown[0];

  const [focus, setFocus] = useState<MapFocus>(() => fitAll([...all.map((q) => q.location), ...people.map((p) => p.location)]));
  const flyTo = (location: LatLng) => setFocus((f) => ({ id: f.id + 1, center: location }));

  // Tap a pin → the carousel moves to its card.
  const selectPin = (q: MapQuestion) => {
    setSelected(q.id);
    const card = railRef.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(q.id)}"]`);
    card?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  };

  // Swipe the carousel → the map pans to that card's pin.
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const onRailScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best: HTMLElement | undefined;
      for (const el of Array.from(rail.querySelectorAll<HTMLElement>('[data-card]'))) {
        if (!best || Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - mid)) best = el;
      }
      const q = shown.find((item) => item.id === best?.dataset.card);
      if (q && q.id !== current?.id) {
        setSelected(q.id);
        flyTo(q.location);
      }
    }, 140);
  };
  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  const place = (p: LatLng) => (view ? toScreen(toXY(p), view) : null);
  const myArea = areaById(social.profile.areaId) ?? areaById(personal.selectedAreaId);

  return (
    <AppShell background="#e9e6e0" layout="fill">
      {/* Full-screen map, like Nearby Explore: it and what floats over it reach the screen edges on purpose. */}
      <div ref={boxRef} className={styles.mapBox} data-allow-bleed>
        <CityMap
          pins={[]}
          onSelect={() => undefined}
          focus={focus}
          bleed
          insets={INSETS}
          controlsTop={INSETS.top + 52}
          label="Locals map: questions and people near your places"
          attribution="hidden"
        />
        <div className={styles.layer} aria-label="Questions and people on the map">
          {view &&
            personClusters(people, place, shown.map((q) => q.location)).map(({ lead, members, x, y }) => {
              const others = members.length - 1;
              return (
                <motion.button
                  key={lead.id}
                  type="button"
                  className={styles.person}
                  // Beside the area's question pins, not on them: a fixed screen offset from the area centre.
                  style={{ left: x - 40, top: y + 34, zIndex: 5 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  aria-label={`${lead.name}${others ? ` and ${others} more ${others === 1 ? 'local' : 'locals'}` : ''}, near ${lead.areaName}. Open profile`}
                  onClick={() => {
                    setGroup(members);
                    setPerson(lead);
                  }}
                >
                  <Avatar name={lead.name} size="sm" tone={lead.me ? 'accent' : 'warm'} />
                  {others > 0 && (
                    <span className={styles.more} aria-hidden="true">
                      +{others}
                    </span>
                  )}
                </motion.button>
              );
            })}
          {view &&
            shown.map((q, i) => {
              const s = place(q.location);
              if (!s) return null;
              const on = current?.id === q.id;
              return (
                <motion.button
                  key={q.id}
                  type="button"
                  className={`${styles.pin} ${styles[q.status]} ${on ? styles.pinOn : ''}`}
                  style={{ left: s.x, top: s.y, zIndex: on ? 6 : 2 }}
                  initial={{ scale: 0, y: 8 }}
                  animate={{ scale: on ? 1.12 : 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 20, delay: reduce ? 0 : i * 0.04 }}
                  aria-pressed={on}
                  aria-label={`${q.title}. ${PIN_STATUS_LABEL[q.status]}, ${q.areaName}`}
                  onClick={() => selectPin(q)}
                >
                  <span className={styles.ring}>
                    <img src={q.photo ?? mascot} alt="" />
                  </span>
                  <span className={styles.badge} aria-hidden="true">
                    <Icon name={BADGE[q.status]} size={12} strokeWidth={2.2} />
                  </span>
                  {on && <span className={styles.pinLabel}>{PIN_STATUS_LABEL[q.status]}</span>}
                </motion.button>
              );
            })}
        </div>
      </div>

      <div className={styles.top} data-allow-bleed>
        <div className={styles.topRow}>
          <Link to={paths.community} className={styles.round} aria-label="Back to Community">
            <Icon name="back" size={18} />
          </Link>
          <div className={styles.filters} role="group" aria-label="Filter the map">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={filter === f.id ? styles.filterOn : styles.filter}
                aria-pressed={filter === f.id}
                aria-label={`${f.label} ${counts[f.id]}`}
                onClick={() => {
                  setFilter(f.id);
                  setSelected(undefined);
                }}
              >
                {f.icon && <Icon name={f.icon} size={13} strokeWidth={2} />}
                {filter === f.id && f.id === 'all' && <span>All</span>}
                <span>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <button type="button" className={styles.round} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={() => setSheet('notifications')}>
            <Icon name="bell" size={18} />
            {unread > 0 && <span className={styles.dot} aria-hidden="true" />}
          </button>
        </div>
        {filter !== 'all' && <p className={styles.filterName}>{FILTERS.find((f) => f.id === filter)?.label}</p>}
        <div className={styles.localChip}>
          <button type="button" className={styles.meButton} onClick={() => setSheet('me')} aria-label={LOCAL_PROFILE_TITLE} aria-haspopup="dialog">
            <Avatar name="You" size="sm" tone="accent" />
          </button>
          <span className={styles.localLabel} aria-hidden="true">
            Local
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.local}
            aria-label="Answer as a local"
            className={styles.switch}
            onClick={() => setLocal(!settings.local)}
          >
            <i aria-hidden="true">
              <motion.b layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
            </i>
          </button>
        </div>
      </div>

      <div className={styles.bottom} data-allow-bleed>
        <div className={styles.bottomRow}>
          <MapInfo />
          <motion.button type="button" className={styles.ask} aria-label="Ask a local" whileTap={{ scale: 0.95 }} onClick={() => setAsking({ askLocal: '' })}>
            <span className={styles.askPlus}>
              <Icon name="plus" size={16} strokeWidth={2.2} />
            </span>
            Ask
          </motion.button>
        </div>
        {shown.length > 0 ? (
          <div ref={railRef} className={styles.rail} onScroll={onRailScroll} aria-label="Questions on the map">
            {shown.map((q) => (
              <motion.article
                key={q.id}
                data-card={q.id}
                className={current?.id === q.id ? `${styles.card} ${styles.cardOn}` : styles.card}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className={`${styles.cardPhoto} ${styles[q.status]}`}>
                  <img src={q.photo ?? mascot} alt="" />
                  <span className={styles.cardBadge} aria-hidden="true">
                    <Icon name={BADGE[q.status]} size={14} strokeWidth={2.2} />
                  </span>
                </span>
                <div className={styles.cardCopy}>
                  <span className={styles.cardPlace}>
                    <Icon name="pin" size={13} />
                    {q.areaName}
                    {q.sample && <ExampleTag />}
                  </span>
                  <h2 className={styles.cardTitle}>{q.title}</h2>
                  <span className={styles.cardFoot}>
                    <Avatar name={q.author} size="sm" tone={q.own ? 'accent' : 'warm'} />
                    {q.added > 0 && (
                      <span className={styles.tipChip} aria-label={q.addedLabel} title={q.addedLabel}>
                        <Icon name={q.own ? 'tip' : 'chat'} size={12} />+{q.added}
                      </span>
                    )}
                    <Link to={paths.question(q.id)} className={styles.open} aria-label={`Open ${q.title}`}>
                      <Icon name="arrow" size={16} />
                    </Link>
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <p className={styles.none}>{all.length ? 'No questions with this status.' : 'Pin a place when you ask a local, and your question shows up here.'}</p>
        )}
      </div>

      {asking && (
        <AskLocalSheet
          defaultMessage={asking.askLocal}
          link={asking.link}
          onPost={(text, context, link, chosen) => {
            postQuestion(text, context, link, chosen);
            setAsking(null);
            setFilter('all');
          }}
          onClose={() => setAsking(null)}
        />
      )}
      {sheet === 'notifications' && <NotificationsSheet items={notifications} onClose={() => setSheet(null)} />}
      {sheet === 'me' && (
        <LocalProfileSheet
          local={settings.local}
          shown={social.profile.shown}
          areaId={myArea?.id}
          onClose={() => setSheet(null)}
          onChange={(shownNext, areaId) => communitySocialStore.set((prev) => ({ ...prev, profile: { shown: shownNext, areaId } }))}
          onLocal={() => setLocal(true)}
        />
      )}
      {person && (
        <PersonSheet
          key={person.id}
          person={person}
          neighbours={group.filter((o) => o.id !== person.id)}
          onSwitch={setPerson}
          following={social.followingPeople.includes(person.id)}
          onFollow={() => communitySocialStore.set((prev) => ({ ...prev, followingPeople: toggleIn(prev.followingPeople, person.id) }))}
          onAsk={() => {
            const a = areaById(person.areaId);
            setPerson(null);
            setAsking({ askLocal: '', link: { areaId: person.areaId, areaName: a ? shortArea(a.name) : person.areaName } });
          }}
          onOpen={(id) => navigate(paths.question(id))}
          onClose={() => setPerson(null)}
        />
      )}
    </AppShell>
  );
}

/** People pins that would sit closer than a tap target (36px) on screen share one pin: the lead plus "+n". */
function personClusters(people: MapPerson[], place: (l: LatLng) => { x: number; y: number } | null | undefined, pins: LatLng[]) {
  const clusters: { lead: MapPerson; members: MapPerson[]; x: number; y: number }[] = [];
  const pinXY = pins.map(place).filter((q): q is { x: number; y: number } => Boolean(q));
  // A person pin is drawn at (-40, +34) from its area; it must not sit on any question pin (52px) either.
  const onPin = (x: number, y: number) => pinXY.some((q) => Math.hypot(q.x - (x - 40), q.y - (y + 34)) < 44);
  for (const p of people) {
    const s = place(p.location);
    if (!s) continue;
    const near =
      clusters.find((c) => Math.hypot(c.x - s.x, c.y - s.y) < 36) ??
      (onPin(s.x, s.y) ? [...clusters].sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0] : undefined);
    if (near) near.members.push(p);
    else clusters.push({ lead: p, members: [p], x: s.x, y: s.y });
  }
  return clusters;
}

function PersonSheet({
  person,
  neighbours,
  onSwitch,
  following,
  onFollow,
  onAsk,
  onClose,
}: {
  person: MapPerson;
  neighbours: MapPerson[];
  onSwitch: (p: MapPerson) => void;
  following: boolean;
  onFollow: () => void;
  onAsk: () => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const member = person.me ? undefined : memberByName(person.name);
  const [localProfile] = usePersistentStore(localProfileStore);
  const [profile] = usePersistentStore(profileV3Store);
  const mine = person.me ? withPrefill(localProfile, profile) : undefined;
  const myTags = mine ? publicTags(mine) : [];
  const helpsWith = mine ? mine.helpWith : person.helpsWith;
  return (
    <Sheet title={person.me ? 'You on the map' : person.name} onClose={onClose}>
      <div className={styles.profile}>
        <Avatar name={person.name} size="lg" tone={person.me ? 'accent' : 'warm'} />
        {person.sample && <ExampleTag />}
        <p className={styles.about}>{person.about}</p>
        <p className={styles.area}>
          <Icon name="pin" size={14} />
          Around {person.areaName} (area only)
        </p>
        {myTags.length > 0 && (
          <ul className={styles.myTags} aria-label="Your public tags">
            {myTags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        {helpsWith.length > 0 && (
          <p className={styles.helps}>
            Can help with:{' '}
            {helpsWith.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </p>
        )}
        {member && (
          <>
            <p className={styles.helps}>
              Speaks:{' '}
              {member.languages.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
            <dl className={styles.memberStats}>
              <div>
                <dt>Answers</dt>
                <dd>{member.answers}</dd>
              </div>
              <div>
                <dt>Found helpful</dt>
                <dd>{member.helpful}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{sinceLabel(member.since)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
      {neighbours.length > 0 && (
        <div className={styles.neighbours}>
          <p>Locals nearby</p>
          <ul>
            {neighbours.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => onSwitch(o)} aria-label={`Open ${o.name}’s profile`}>
                  <Avatar name={o.name} size="md" />
                  <span>{o.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!person.me && (
        <div className={styles.profileActions}>
          <button type="button" className={styles.secondary} aria-pressed={following} onClick={onFollow}>
            <Icon name={following ? 'following' : 'follow'} size={16} />
            {following ? 'Following' : 'Follow'}
          </button>
          <button type="button" className={styles.primary} onClick={onAsk}>
            <Icon name="chat" size={16} />
            Ask them
          </button>
        </div>
      )}
    </Sheet>
  );
}

/** The map credit and the privacy line, behind one small "i" button (bottom left, above the cards). */
function MapInfo() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotionConfig();

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={box} className={styles.info}>
      <button
        ref={button}
        type="button"
        className={open ? `${styles.infoButton} ${styles.infoOn}` : styles.infoButton}
        aria-label="Map info and privacy"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="7.4" />
          <path d="M10 9.2v4.6" />
          <circle cx="10" cy="6.4" r="0.4" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <motion.div
          id={id}
          role="dialog"
          aria-label="Map info"
          className={styles.popover}
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.16 }}
        >
          <p className={styles.popoverLine}>
            <Icon name="lock" size={14} />
            {PRIVACY_LINE}
          </p>
          <p className={styles.popoverCredit}>{MAP_ATTRIBUTION}</p>
        </motion.div>
      )}
    </div>
  );
}
