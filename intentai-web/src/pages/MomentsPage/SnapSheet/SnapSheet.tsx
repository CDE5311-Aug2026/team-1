import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import cameraIcon from '../../../assets/v3/moments/camera.svg';
import checkWhite from '../../../assets/v3/moments/check-white.svg';
import CountUp from '../../../components/reactbits/CountUp';
import ShinyText from '../../../components/reactbits/ShinyText';
import { showToast } from '../../../hooks/useToast';
import { subjectOfCardId, type Stamp as StampData } from '../../../data/moments/moments';
import { markCardOpened } from '../../../data/openedCards';
import { usePersistentStore } from '../../../data/persistentStore';
import { FACETS, openedCount, placeState } from '../../../data/placeStories';
import { markOpened, openedCardsStore, placeStoriesStore, reduceMotionStore } from '../../../data/stores';
import { storyPlace } from '../../../data/stories/places';
import { CardDots } from '../Passport/Passport';
import { stampDate, TOPIC_ICONS } from '../parts';
import Icon from '../../OnboardingPage/v3/icons';
import Sheet from '../Sheet/Sheet';
import Stamp from '../Stamp/Stamp';
import { snapPhotos, STORY_STAMP_NAMES, type SnapPhoto } from './snapPhotos';
import styles from './SnapSheet.module.css';

type Stage = 'view' | 'capture' | 'recognise' | 'tags' | 'result';
type Shot = { id: number; kind: 'photo'; photo: SnapPhoto; wasNew: boolean } | { id: number; kind: 'camera'; still?: string };
type CameraState = 'off' | 'starting' | 'on' | 'error' | 'denied';

/** Timings (ms). Reduced motion: no flash, spin or pop, and the waits shrink to ~0. */
const FLASH_MS = 380;
const RECOGNISE_MS = 1800;
const TAG_STEP_MS = 220;
const TAG_SETTLE_MS = 520;
/** Where the tags pop onto the photo (percent of the frame). */
const TAG_SPOTS = [
  { left: '7%', top: '12%' },
  { right: '7%', top: '40%' },
  { left: '12%', bottom: '14%' },
] as const;

/**
 * M3 "Snap a moment" (v2 light sheet, 9 Nov 2026): a viewfinder (live camera only after "Use camera", otherwise a recent photo), tap-to-focus,
 * a flash, a spinning glow frame while the energy orb says "Recognising image", tags popping onto the photo, then the
 * match. Recognition is a demo: recent photos are the app's own photos of known cards, each with a fixed match score;
 * the matched card is marked opened (its stamp gains ink). A camera photo is never matched: "No match yet".
 */
export default function SnapSheet({ stamps, onClose }: { stamps: readonly StampData[]; onClose: () => void }) {
  const [opened] = usePersistentStore(openedCardsStore);
  const [stories] = usePersistentStore(placeStoriesStore);
  const [reduceSetting] = usePersistentStore(reduceMotionStore);
  const reduce = !!useReducedMotionConfig() || reduceSetting;
  const [photos] = useState(snapPhotos);
  const [selected, setSelected] = useState<SnapPhoto>(photos[0]);
  const [source, setSource] = useState<'photo' | 'camera'>('photo');
  const [camera, setCamera] = useState<CameraState>('off');
  const [stage, setStage] = useState<Stage>('view');
  const [shot, setShot] = useState<Shot | null>(null);
  const [focus, setFocus] = useState<{ id: number; x: number; y: number } | null>(null);
  const [announce, setAnnounce] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timers = useRef<number[]>([]);
  const mounted = useRef(true);
  const shotId = useRef(0);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const workingRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Attach the live stream whenever the viewfinder shows the camera.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || camera !== 'on' || stage !== 'view' || !streamRef.current) return;
    video.srcObject = streamRef.current;
    const played = video.play?.();
    if (played && typeof played.catch === 'function') played.catch(() => {});
  }, [camera, stage]);

  // Focus follows the flow: the working orb while recognising, the result heading once it is in.
  useEffect(() => {
    if (stage === 'capture') workingRef.current?.focus();
    else if (stage === 'result') resultRef.current?.focus();
  }, [stage]);

  const startCamera = async () => {
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      setCamera('error');
      return;
    }
    setCamera('starting');
    try {
      const stream = await media.getUserMedia({ video: { facingMode: 'environment' } });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setSource('camera');
      setCamera('on');
    } catch (err) {
      // a refusal is told apart: the person can turn it back on
      if (mounted.current) setCamera(err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  };

  const usePhotos = () => {
    stopCamera();
    setCamera('off');
    setSource('photo');
  };

  const pick = (photo: SnapPhoto) => {
    if (source === 'camera') usePhotos();
    setSelected(photo);
    setFocus(null);
  };

  const isOpened = (photo: SnapPhoto) =>
    photo.target.kind === 'card' ? opened.includes(photo.target.cardId) : placeState(stories, photo.target.placeId).opened.includes(photo.target.facet);

  const markMatched = (photo: SnapPhoto) => {
    if (photo.target.kind === 'card') markCardOpened(photo.target.cardId);
    else markOpened(photo.target.placeId, photo.target.facet);
  };

  const onFocusTap = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (stage !== 'view') return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.width ? ((event.clientX - box.left) / box.width) * 100 : 50;
    const y = box.height ? ((event.clientY - box.top) / box.height) * 100 : 50;
    setFocus((f) => ({ id: (f?.id ?? 0) + 1, x: Math.min(92, Math.max(8, x)), y: Math.min(90, Math.max(10, y)) }));
  };

  const shutter = () => {
    if (stage !== 'view') return;
    clearTimers();
    const id = ++shotId.current;
    let next: Shot;
    if (source === 'camera') {
      let still: string | undefined;
      const video = videoRef.current;
      try {
        if (video && video.videoWidth > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            still = canvas.toDataURL('image/jpeg', 0.85);
          }
        }
      } catch {
        still = undefined;
      }
      // The photo is frozen: the camera goes off until "Snap again".
      stopCamera();
      setCamera('off');
      next = { id, kind: 'camera', still };
    } else {
      next = { id, kind: 'photo', photo: selected, wasNew: !isOpened(selected) };
    }
    setShot(next);
    setFocus(null);
    setStage('capture');
    setAnnounce('Photo taken. Recognising image.');

    const flash = reduce ? 0 : FLASH_MS;
    const think = flash + (reduce ? 40 : RECOGNISE_MS);
    later(flash, () => setStage('recognise'));
    if (next.kind === 'camera') {
      later(think, () => {
        setStage('result');
        setAnnounce('No match yet.');
      });
      return;
    }
    const { photo } = next;
    later(think, () => {
      markMatched(photo);
      setStage(reduce ? 'result' : 'tags');
      if (reduce) setAnnounce(`Match found: ${photo.title}, ${photo.score}% match.`);
    });
    if (!reduce) {
      later(think + photo.tags.length * TAG_STEP_MS + TAG_SETTLE_MS, () => {
        setStage('result');
        setAnnounce(`Match found: ${photo.title}, ${photo.score}% match.`);
      });
    }
  };

  const snapAgain = () => {
    const fromCamera = shot?.kind === 'camera';
    clearTimers();
    setShot(null);
    setStage('view');
    setAnnounce('');
    if (fromCamera) void startCamera();
    window.setTimeout(() => shutterRef.current?.focus(), 0);
  };

  const save = (photo: SnapPhoto) => {
    markMatched(photo);
    showToast('Saved to Moments');
    onClose();
  };

  const busy = stage === 'capture' || stage === 'recognise';
  const live = source === 'camera' && camera === 'on';
  const framePhoto = shot ? (shot.kind === 'photo' ? shot.photo : null) : source === 'photo' ? selected : null;
  const showTags = shot?.kind === 'photo' && (stage === 'tags' || stage === 'result');

  return (
    <Sheet title="Snap a moment" hideTitle variant="full" onClose={onClose} className={styles.dialog}>
      <div className={`${styles.root} ${reduce ? styles.reduce : ''}`} data-stage={stage}>
        <div className={styles.top}>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
          <p className={styles.topTitle} aria-hidden="true">
            Snap a moment
          </p>
          <span className={styles.topSpacer} />
        </div>

        <div className={styles.stage}>
          <div className={`${styles.frameWrap} ${stage === 'view' ? styles.frameTall : styles.frameShort}`}>
            {stage === 'recognise' && (
              <>
                <span className={styles.glowBlur} aria-hidden="true">
                  <span className={styles.spinner} />
                </span>
                <span className={styles.glowRing} aria-hidden="true">
                  <span className={styles.spinner} />
                </span>
              </>
            )}
            <div className={styles.frame} onPointerDown={onFocusTap}>
              {live && stage === 'view' ? (
                <video ref={videoRef} className={styles.scene} autoPlay muted playsInline aria-label="Live camera view" />
              ) : shot?.kind === 'camera' ? (
                shot.still ? (
                  <img src={shot.still} alt="Your camera photo" className={styles.scene} />
                ) : (
                  <span className={styles.blank} role="img" aria-label="Your camera photo">
                    <img src={cameraIcon} alt="" width={40} height={40} />
                  </span>
                )
              ) : framePhoto ? (
                <img
                  key={framePhoto.key}
                  src={framePhoto.image.src}
                  alt={framePhoto.image.alt}
                  className={`${styles.scene} ${stage === 'view' ? styles.drift : ''}`}
                />
              ) : (
                <span className={styles.blank} role="img" aria-label={camera === 'starting' ? 'Starting the camera' : 'Camera off'}>
                  <img src={cameraIcon} alt="" width={40} height={40} />
                </span>
              )}

              {stage === 'view' && (
                <>
                  <span className={styles.brackets} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className={styles.badge} aria-hidden="true">
                    {live ? (
                      <>
                        <span className={styles.liveDot} /> LIVE
                      </>
                    ) : (
                      'RECENT PHOTO'
                    )}
                  </span>
                  <span className={styles.hint} aria-hidden="true">
                    Tap to focus
                  </span>
                  {focus && <span key={focus.id} className={styles.focusRing} style={{ left: `${focus.x}%`, top: `${focus.y}%` }} aria-hidden="true" />}
                </>
              )}

              {stage === 'recognise' && <span className={styles.scan} aria-hidden="true" />}

              {showTags && shot?.kind === 'photo' && (
                <ul className={styles.tagsOnPhoto} aria-label="Tags found">
                  {shot.photo.tags.map((tag, i) => (
                    <motion.li
                      key={tag}
                      className={styles.photoTag}
                      style={TAG_SPOTS[i % TAG_SPOTS.length]}
                      initial={reduce ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 18, delay: i * (TAG_STEP_MS / 1000) }}
                    >
                      <span className={styles.photoTagDot} aria-hidden="true" />
                      {tag}
                    </motion.li>
                  ))}
                </ul>
              )}

              {shot && !reduce && (
                <motion.span
                  key={shot.id}
                  className={styles.flash}
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: FLASH_MS / 1000, ease: 'easeOut' }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          {framePhoto && stage === 'view' && <p className={styles.credit}>{framePhoto.image.credit}</p>}
        </div>

        <p className={styles.sr} role="status" aria-live="polite">
          {announce}
        </p>

        {stage === 'view' && (
          <div className={styles.controls}>
            <div className={styles.shutterRow}>
              {live || camera === 'starting' ? (
                <button type="button" className={styles.side} onClick={usePhotos}>
                  Photos
                </button>
              ) : (
                <button type="button" className={styles.side} onClick={() => void startCamera()}>
                  <img src={cameraIcon} alt="" width={16} height={16} />
                  Use camera
                </button>
              )}
              <motion.button
                ref={shutterRef}
                type="button"
                className={styles.shutter}
                onClick={shutter}
                disabled={camera === 'starting'}
                aria-label={live ? 'Take photo' : `Take photo of ${selected.title}`}
                whileTap={reduce ? undefined : { scale: 0.9 }}
              >
                <span className={styles.shutterCore} />
              </motion.button>
              <span className={styles.sideSpacer} />
            </div>
            {(camera === 'error' || camera === 'denied') && (
              <p className={styles.cameraNote} role="alert">
                {camera === 'denied'
                  ? 'Camera access is off for this site. Allow it in your browser’s site settings, or pick a recent photo below.'
                  : 'The camera isn’t available here. Pick one of your recent photos below.'}
              </p>
            )}
            <p className={styles.trayLabel} id="snap-tray-label">
              Recent photos
            </p>
            <ul className={styles.tray} aria-labelledby="snap-tray-label">
              {photos.map((photo) => {
                const done = isOpened(photo);
                const active = source === 'photo' && photo.key === selected.key;
                return (
                  <li key={photo.key}>
                    <button
                      type="button"
                      className={`${styles.thumb} ${active ? styles.thumbActive : ''}`}
                      aria-pressed={active}
                      aria-label={`${photo.title}${done ? ', opened' : ''}`}
                      onClick={() => pick(photo)}
                    >
                      <img src={photo.image.src} alt="" loading="lazy" />
                      {done && (
                        <span className={styles.thumbCheck}>
                          <img src={checkWhite} alt="" width={9} height={9} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {busy && (
          <div className={styles.working} ref={workingRef} tabIndex={-1}>
            <span className={styles.orb} aria-hidden="true">
              <span className={styles.orbCore} />
            </span>
            {reduce ? (
              <span className={styles.workingText}>Recognising image</span>
            ) : (
              <ShinyText text="Recognising image" className={styles.workingText} color="#5f5b54" shineColor="#23211d" speed={1.6} />
            )}
          </div>
        )}

        <AnimatePresence>
          {stage === 'result' && shot && (
            <motion.section
              key={`result-${shot.id}`}
              className={styles.panel}
              aria-labelledby="snap-result-title"
              initial={reduce ? false : { y: '100%' }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <span className={styles.handle} aria-hidden="true" />
              {shot.kind === 'photo' ? (
                <MatchResult
                  photo={shot.photo}
                  wasNew={shot.wasNew}
                  stamps={stamps}
                  reduce={reduce}
                  headingRef={resultRef}
                  onSave={() => save(shot.photo)}
                  onAgain={snapAgain}
                />
              ) : (
                <>
                  <p className={styles.noMatchChip}>NO MATCH YET</p>
                  <h3 id="snap-result-title" className={styles.title} ref={resultRef} tabIndex={-1}>
                    No match yet
                  </h3>
                  <p className={styles.noMatchText}>We couldn’t place this one. Try a photo from Recent photos.</p>
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondary} onClick={snapAgain}>
                      Snap again
                    </button>
                  </div>
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}

function MatchResult({
  photo,
  wasNew,
  stamps,
  reduce,
  headingRef,
  onSave,
  onAgain,
}: {
  photo: SnapPhoto;
  wasNew: boolean;
  stamps: readonly StampData[];
  reduce: boolean;
  headingRef: RefObject<HTMLHeadingElement>;
  onSave: () => void;
  onAgain: () => void;
}) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  return (
    <>
      <div className={styles.resultHead}>
        <div className={styles.resultText}>
          <p className={styles.found}>
            <span>
              <img src={checkWhite} alt="" width={9} height={9} />
            </span>
            MATCH FOUND
          </p>
          <h3 id="snap-result-title" className={styles.title} ref={headingRef} tabIndex={-1}>
            {photo.title}
          </h3>
          {photo.meta && <p className={styles.meta}>{photo.meta}</p>}
        </div>
        <div className={styles.score}>
          <svg viewBox="0 0 64 64" className={styles.scoreRing} aria-hidden="true">
            <circle cx="32" cy="32" r={r} className={styles.scoreTrack} />
            <motion.circle
              cx="32"
              cy="32"
              r={r}
              className={styles.scoreArc}
              strokeDasharray={circumference}
              initial={reduce ? false : { strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - photo.score / 100) }}
              transition={{ duration: 1, ease: [0.3, 0.8, 0.3, 1], delay: 0.15 }}
            />
          </svg>
          <span className={styles.scoreText} aria-hidden="true">
            <span className={styles.scoreNum}>{reduce ? photo.score : <CountUp to={photo.score} duration={1} delay={0.15} trigger="load" />}%</span>
            <span className={styles.scoreLabel}>match</span>
          </span>
          <span className={styles.sr}>{photo.score}% match</span>
        </div>
      </div>

      <ul className={styles.tags} aria-label="Tags">
        {photo.tags.map((tag) => (
          <li key={tag} className={styles.tag}>
            <span aria-hidden="true">✓</span>
            {tag}
          </li>
        ))}
      </ul>

      <StampPanel photo={photo} wasNew={wasNew} stamps={stamps} />

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onSave}>
          <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
            <path d="M2 1.5h10v13l-5-3.4-5 3.4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          Save to Moments
        </button>
        <Link to={photo.href} className={styles.primary}>
          Show on the map
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <button type="button" className={styles.again} onClick={onAgain}>
        <img src={cameraIcon} alt="" width={15} height={15} />
        Not right? Snap again
      </button>
    </>
  );
}

/** The matched card's place stamp: the print with its ink, "N of M cards", the card dots and what changed. */
function StampPanel({ photo, wasNew, stamps }: { photo: SnapPhoto; wasNew: boolean; stamps: readonly StampData[] }) {
  const [stories] = usePersistentStore(placeStoriesStore);
  let name: string;
  let placeName: string;
  let have: number;
  let total: number;
  let collected: boolean;
  let date: string | undefined;
  let dots: ReactNode;

  if (photo.target.kind === 'story') {
    const { placeId } = photo.target;
    const state = placeState(stories, placeId);
    placeName = storyPlace(placeId)?.name ?? placeId;
    name = STORY_STAMP_NAMES[placeId] ?? placeName;
    have = openedCount(stories, placeId);
    total = FACETS.length;
    collected = state.stamped || state.checkedIn;
    date = stampDate(state.stampedOn);
    dots = (
      <span className={styles.dots} aria-hidden="true">
        {FACETS.map((f) => (
          <span key={f} className={state.opened.includes(f) ? `${styles.dot} ${styles.dotOpen}` : styles.dot}>
            <img src={TOPIC_ICONS[f]} alt="" />
          </span>
        ))}
      </span>
    );
  } else {
    const subject = subjectOfCardId(photo.target.cardId);
    const stamp = subject ? stamps.find((s) => s.subject.id === subject.id) : undefined;
    if (!stamp) {
      return <p className={styles.plainLine}>{wasNew ? '+1 card opened' : 'Already opened'}</p>;
    }
    name = stamp.subject.short;
    placeName = stamp.subject.short;
    have = stamp.openedIds.length;
    total = stamp.subject.cards.length;
    collected = stamp.collected;
    date = stampDate(stamp.checkedInOn);
    dots = <CardDots stamp={stamp} />;
  }

  const complete = total > 0 && have >= total;
  return (
    <div className={styles.stampPanel}>
      <span className={styles.stampArt}>
        {collected ? (
          <Stamp shape="card" name={name} date={date} ink={total ? have / total : 0} />
        ) : (
          <span className={styles.stampEmpty}>
            NO STAMP
            <br />
            YET
          </span>
        )}
      </span>
      <div className={styles.stampText}>
        <p className={styles.stampName}>{name.toUpperCase()}</p>
        <p className={styles.stampCount}>
          {have} of {total} cards
        </p>
        {dots}
        <p className={styles.stampLine}>{wasNew ? '+1 card · ink added to your stamp' : collected ? 'Already in your stamp' : 'Already opened'}</p>
        {wasNew && complete && (
          <p className={styles.stampDone}>
            All {total} cards: {name} is complete
          </p>
        )}
        {!collected && <p className={styles.stampHint}>Check in at {placeName} to collect the stamp.</p>}
      </div>
    </div>
  );
}
