// Travelogue: today's journal as a post, ready to share. Pick where it goes (WeChat's nine squares, an Instagram
// carousel, or four pictures on X), choose the pictures from the day's strip, and the caption and hashtags are written
// for you (by Claude through /api/caption when the server has a key, else on the device). Share hands the pictures to
// the phone's share sheet and copies the caption, since WeChat and Instagram drop text that comes with pictures.
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { JournalDay } from "../../../data/journal/journal";
import { dayParts } from "../../../data/journal/journal";
import {
  aiCaption,
  factsOf,
  framesOf,
  hashtagsOf,
  PLATFORMS,
  postText,
  TONES,
  writeCaption,
  type Frame,
  type Platform,
  type Tone,
} from "../../../data/journal/travelogue";
import Icon from "../../OnboardingPage/v3/icons";
import Sheet from "../Sheet/Sheet";
import { renderDayCard, renderFrame, toFile } from "./render";
import styles from "./Travelogue.module.css";

const CARD = "day-card" as const;
const ORDER: Platform[] = ["wechat", "instagram", "x"];

/** The pictures in the order they post: on WeChat the day card sits in the middle square of a full nine. */
function arrange(
  platform: Platform,
  card: boolean,
  picked: Frame[],
): (Frame | typeof CARD)[] {
  if (!card) return picked;
  if (platform === "wechat" && picked.length === 8)
    return [...picked.slice(0, 4), CARD, ...picked.slice(4)];
  return [CARD, ...picked];
}

export default function Travelogue({
  day,
  onClose,
}: {
  day: JournalDay;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const facts = useMemo(() => factsOf(day), [day]);
  const frames = useMemo(() => framesOf(day, 12), [day]);
  const [platform, setPlatform] = useState<Platform>("wechat");
  const spec = PLATFORMS[platform];
  const [card, setCard] = useState(true);
  const [chosen, setChosen] = useState<string[]>(() =>
    frames.slice(0, 8).map((f) => f.id),
  );
  const [tone, setTone] = useState<Tone>("warm");
  const [seed, setSeed] = useState(0);
  const [caption, setCaption] = useState(() =>
    writeCaption(facts, "warm", "wechat"),
  );
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [writing, setWriting] = useState(false);
  const [edited, setEdited] = useState(false);
  const [editing, setEditing] = useState(false);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  // toasts sit under the modal layer, so the studio has its own line for news
  const [note, setNote] = useState<{ text: string; n: number } | null>(null);
  const say = (text: string) => setNote((p) => ({ text, n: (p?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(t);
  }, [note]);

  const room = spec.max - (card ? 1 : 0);
  const picked = useMemo(
    () =>
      chosen
        .map((id) => frames.find((f) => f.id === id))
        .filter((f): f is Frame => !!f)
        .slice(0, room),
    [chosen, frames, room],
  );
  const items = arrange(platform, card, picked);
  const tags = useMemo(
    () => [...new Set([...hashtagsOf(facts), ...aiTags])].slice(0, 10),
    [facts, aiTags],
  );
  const onTags = tags.filter((t) => !off.has(t));
  const { num, month, weekday } = dayParts(day.day);

  // the caption: written here at once, then Claude's when the server answers
  useEffect(() => {
    if (edited) return;
    setCaption(writeCaption(facts, tone, platform, seed));
    const ctl = new AbortController();
    setWriting(true);
    aiCaption(facts, tone, platform, ctl.signal).then((ai) => {
      if (ctl.signal.aborted) return;
      setWriting(false);
      if (ai) {
        setCaption(ai.caption);
        setAiTags(ai.tags);
      }
    });
    return () => ctl.abort();
  }, [facts, tone, platform, seed, edited]);

  // the day card, painted at the platform's size (shown in the preview and exported as is)
  useEffect(() => {
    let live = true;
    let url: string | null = null;
    renderDayCard(facts, spec, day.stats).then((c) =>
      c.toBlob(
        (b) => {
          if (!live || !b) return;
          url = URL.createObjectURL(b);
          setCardUrl(url);
        },
        "image/jpeg",
        0.9,
      ),
    );
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [facts, spec, day.stats]);

  // the files, painted ahead of the tap (the share sheet only opens straight from a tap)
  const key = `${platform}|${card}|${picked.map((f) => f.id).join(",")}`;
  useEffect(() => {
    let live = true;
    setFiles(null);
    const t = setTimeout(async () => {
      const out: File[] = [];
      let i = 0;
      for (const it of items) {
        const c =
          it === CARD
            ? await renderDayCard(facts, spec, day.stats)
            : await renderFrame(it, spec);
        const f = await toFile(
          c,
          `findsg-${day.day}-${String(++i).padStart(2, "0")}.jpg`,
        );
        if (f) out.push(f);
        if (!live) return;
      }
      if (live) setFiles(out);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // items follows from key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggle = (id: string) => {
    if (id === CARD) return setCard((v) => !v);
    setChosen((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (picked.length >= room) {
        say(`${spec.label} takes ${spec.max} pictures`);
        return prev;
      }
      return [...prev.filter((x) => picked.some((f) => f.id === x)), id];
    });
  };

  const text = postText(caption, onTags, platform === "x" ? 280 : Infinity);
  const copy = () =>
    navigator.clipboard?.writeText(text).then(
      () => say("Caption copied"),
      () => say("Could not copy the caption"),
    );

  const share = async () => {
    if (!files?.length) return;
    // copy first: WeChat and Instagram keep only the pictures, so the caption is pasted in
    navigator.clipboard?.writeText(text).catch(() => undefined);
    const data: ShareData = platform === "x" ? { files, text } : { files };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
        if (platform !== "x") say(`Caption copied — paste it in ${spec.label}`);
      } catch (e) {
        if ((e as Error).name !== "AbortError")
          say("Sharing did not work here — try again");
      }
      return;
    }
    // no share sheet (most desktops): save the pictures instead
    for (const f of files) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    say(`${files.length} pictures saved · caption copied`);
  };

  // the post leans toward your finger
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sy = useSpring(ry, { stiffness: 160, damping: 18 });
  const glare = useTransform(sy, [-8, 8], ["20%", "80%"]);
  const stage = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  // a new layout starts at its first picture
  useEffect(() => {
    grid.current?.scrollTo({ left: 0 });
  }, [platform]);
  const lean = (e: PointerEvent) => {
    if (reduce || e.pointerType === "touch") return;
    const r = stage.current!.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
  };

  const src = (it: Frame | typeof CARD) => (it === CARD ? cardUrl : it.src);

  return (
    <Sheet
      title="Travelogue"
      hideTitle
      variant="full"
      onClose={onClose}
      className={styles.dialog}
    >
      {/* focus lands on the studio itself, not on Close */}
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <div className={styles.studio} tabIndex={-1} autoFocus>
        <header className={styles.bar}>
          <button
            type="button"
            className={styles.round}
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
          <h2>
            Travelogue
            <small>
              {weekday} {num} {month}
            </small>
          </h2>
          <button
            type="button"
            className={styles.round}
            aria-label="Copy the caption"
            onClick={copy}
          >
            <Icon name="copy" size={19} />
          </button>
        </header>

        <div
          className={styles.switch}
          role="tablist"
          aria-label="Share to"
          style={{ "--at": ORDER.indexOf(platform) } as React.CSSProperties}
        >
          {ORDER.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === platform}
              onClick={() => setPlatform(p)}
            >
              {PLATFORMS[p].label}
            </button>
          ))}
          <span aria-hidden="true" />
        </div>

        <div
          className={styles.stage}
          ref={stage}
          onPointerMove={lean}
          onPointerLeave={() => (rx.set(0), ry.set(0))}
        >
          <motion.article
            className={styles.post}
            style={{ rotateX: sx, rotateY: sy, "--glare": glare } as never}
            initial={
              reduce ? false : { opacity: 0, y: 40, rotateX: 18, scale: 0.94 }
            }
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
          >
            <div className={styles.who}>
              <span className={styles.avatar} aria-hidden="true">
                {num}
              </span>
              <span>
                <b>You</b>
                <small>
                  {facts.areas.slice(0, 2).join(" · ") || "Singapore"}
                </small>
              </span>
            </div>

            {editing ? (
              <textarea
                className={styles.edit}
                value={caption}
                autoFocus
                maxLength={spec.chars + 120}
                aria-label="Caption"
                onChange={(e) => (setCaption(e.target.value), setEdited(true))}
                onBlur={() => setEditing(false)}
              />
            ) : (
              <button
                type="button"
                className={styles.caption}
                onClick={() => setEditing(true)}
                aria-label={`Caption: ${caption}. Edit`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={caption}
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {caption}
                  </motion.span>
                </AnimatePresence>
                {writing && <i className={styles.writing} aria-hidden="true" />}
              </button>
            )}

            <LayoutGroup>
              <div
                ref={grid}
                className={`${styles.grid} ${styles[platform]}`}
                data-n={items.length}
              >
                {items.map((it, i) => (
                  <motion.figure
                    key={it === CARD ? CARD : it.id}
                    layoutId={it === CARD ? CARD : it.id}
                    className={
                      it === CARD
                        ? `${styles.cell} ${styles.cardCell}`
                        : styles.cell
                    }
                    initial={
                      reduce
                        ? false
                        : {
                            opacity: 0,
                            scale: 0.6,
                            rotate: (i % 3) * 6 - 6,
                            y: 30,
                          }
                    }
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 22,
                      delay: reduce ? 0 : i * 0.035,
                    }}
                  >
                    {src(it) && (
                      <img
                        src={src(it)!}
                        alt={it === CARD ? "Day card" : it.title}
                        draggable={false}
                      />
                    )}
                  </motion.figure>
                ))}
              </div>
            </LayoutGroup>

            <p className={styles.tags}>
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={!off.has(t)}
                  onClick={() =>
                    setOff((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                >
                  #{t}
                </button>
              ))}
            </p>
          </motion.article>
        </div>

        <div className={styles.strip} aria-label="Pictures">
          {([CARD, ...frames] as (Frame | typeof CARD)[]).map((f) => {
            const id = f === CARD ? CARD : f.id;
            const at =
              f === CARD
                ? card
                  ? items.indexOf(CARD)
                  : -1
                : items.findIndex((x) => x !== CARD && x.id === id);
            return (
              <button
                key={id}
                type="button"
                className={styles.thumb}
                aria-pressed={at >= 0}
                aria-label={f === CARD ? "Day card" : f.title}
                onClick={() => toggle(id)}
              >
                {(f === CARD ? cardUrl : f.src) && (
                  <img
                    src={(f === CARD ? cardUrl : f.src)!}
                    alt=""
                    draggable={false}
                  />
                )}
                {at >= 0 && <b>{at + 1}</b>}
                {f !== CARD && f.own && (
                  <i className={styles.own} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.tones}>
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === tone}
              onClick={() => (setTone(t.id), setEdited(false))}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={styles.again}
            aria-label="Write the caption again"
            onClick={() => (setSeed((s) => s + 1), setEdited(false))}
          >
            <Icon name="sparkle" size={18} />
          </button>
        </div>

        <AnimatePresence>
          {note && (
            <motion.p
              key={note.n}
              className={styles.note}
              role="status"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {note.text}
            </motion.p>
          )}
        </AnimatePresence>
        <button
          type="button"
          className={styles.share}
          onClick={share}
          disabled={!files}
        >
          <Icon name="share" size={20} />
          {files ? `Share to ${spec.label}` : "Getting pictures ready…"}
          <small>{items.length}</small>
        </button>
      </div>
    </Sheet>
  );
}
