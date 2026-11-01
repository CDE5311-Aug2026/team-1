// A place's story as notebook pages (Home's intro, owner 31 Oct 2026: "pages you turn; small cards you can move about
// like sticky notes"). One page each, only when the place has it: the picture (a print taped in, which you can lift
// and move; a clip stays put so it can play), the three key numbers as sticky notes, then and now, the story, what
// to look for as notes, and how to order. Anything that moves sideways itself is marked so the page does not turn.
import { useRef, useState } from 'react';
import { SampleVideo, StoryArticle } from '../../../components/story';
import type { BookPage } from '../../../components/Notebook/FlipBook';
import { StickyNote, type NoteTone } from '../../../components/Notebook/StickyNote';
import { ORDER_GUIDES } from '../../../data/explore/orders';
import { placeCard, type CardTile } from '../../../data/explore/placeCards';
import { placePicture } from '../../../data/home/nearbyCards';
import type { CuratedPlace } from '../domain';
import OrderBuilder from './OrderBuilder';
import { statTile } from './PlaceStoryCard';
import { ThenNow } from './ThenNow';
import styles from './storyPages.module.css';

const TONES: NoteTone[] = ['butter', 'rose', 'sage', 'sky'];
const TILTS = [-4, 3, -2.5, 5, -5, 2];

function Picture({ src, alt }: { src: string; alt: string }) {
  const board = useRef<HTMLUListElement>(null);
  return (
    <ul ref={board} className={`${styles.board} ${styles.pictureBoard}`}>
      <StickyNote tone="print" tilt={-1.5} tape bounds={board} label={`Photo of ${alt}`}>
        <img className={styles.print} src={src} alt={alt} draggable={false} decoding="async" />
      </StickyNote>
    </ul>
  );
}

function Numbers({ tiles }: { tiles: CardTile[] }) {
  const board = useRef<HTMLUListElement>(null);
  return (
    <section aria-label="Key numbers">
      <ul ref={board} className={`${styles.board} ${styles.numbers}`}>
        {tiles.map((t, i) => {
          const value = statTile(t).format?.(t.value) ?? String(t.value);
          return (
            <StickyNote key={t.label} tone={TONES[i % TONES.length]} tilt={TILTS[i]} bounds={board} label={`${value}: ${t.label}`}>
              <b className={styles.value}>{value}</b>
              <span className={styles.what}>{t.label}</span>
            </StickyNote>
          );
        })}
      </ul>
      <p className={styles.hint}>Pick the notes up and move them about.</p>
    </section>
  );
}

// What to look for, as a spotter's sheet (owner, 1 Nov 2026: "the board leaves lots of blank paper"): the notes spread
// down the page, each with a box to tick once you have found it, and at the foot a print of the place beside a tally of
// what you have spotted. The ticks are kept on this device, per place.
const spottedKey = (id: string) => `notebook.spotted.${id}`;

function readSpotted(id: string, n: number): boolean[] {
  try {
    const v = JSON.parse(localStorage.getItem(spottedKey(id)) ?? '[]');
    return Array.from({ length: n }, (_, i) => v[i] === true);
  } catch {
    return Array(n).fill(false);
  }
}

function LookFor({ placeId, rows, photo, alt }: { placeId: string; rows: string[]; photo?: string; alt: string }) {
  const board = useRef<HTMLUListElement>(null);
  const [spotted, setSpotted] = useState(() => readSpotted(placeId, rows.length));
  const found = spotted.filter(Boolean).length;
  const toggle = (i: number) =>
    setSpotted((s) => {
      const next = s.map((v, j) => (j === i ? !v : v));
      try {
        localStorage.setItem(spottedKey(placeId), JSON.stringify(next));
      } catch {
        // private window: the ticks last until the page closes
      }
      return next;
    });

  return (
    <section aria-label="Look for" className={styles.lookPage} data-fill>
      <p className={styles.lead}>When you are there, look out for these:</p>
      <ul ref={board} className={`${styles.board} ${styles.look}`}>
        {rows.map((row, i) => (
          <StickyNote key={row} tone={TONES[(i + 1) % TONES.length]} tilt={TILTS[(i + 2) % TILTS.length] * 0.6} bounds={board}>
            <span className={styles.look1}>
              <i aria-hidden="true">{String(i + 1).padStart(2, '0')}</i>
              {row}
            </span>
            <button
              type="button"
              className={styles.tick}
              aria-pressed={spotted[i]}
              aria-label={spotted[i] ? `Spotted: ${row}` : `Mark as spotted: ${row}`}
              onClick={() => toggle(i)}
            >
              <span className={styles.box} aria-hidden="true">
                {spotted[i] && (
                  <svg viewBox="0 0 20 20">
                    <path d="M3 11l5 5L18 3" />
                  </svg>
                )}
              </span>
              {spotted[i] ? 'Found' : 'Found it?'}
            </button>
            {spotted[i] && (
              <span className={styles.stamp} aria-hidden="true">
                Spotted
              </span>
            )}
          </StickyNote>
        ))}
      </ul>
      <div className={styles.lookFoot} data-photo={photo ? '' : undefined}>
        {photo && (
          <figure className={styles.snap}>
            <img src={photo} alt={alt} draggable={false} decoding="async" loading="lazy" />
          </figure>
        )}
        <div className={styles.tally} aria-live="polite">
          <p className={styles.tallyHead}>Spotted</p>
          <p className={styles.tallyNum}>
            <b>{found}</b>
            {` / ${rows.length}`}
          </p>
          <span className={styles.marks} aria-hidden="true">
            {spotted.map((v, i) => (
              <i key={i} data-on={v || undefined} />
            ))}
          </span>
          <p className={styles.tallyNote}>{found === rows.length ? 'All found. Well spotted!' : 'Tick each one when you find it.'}</p>
        </div>
      </div>
    </section>
  );
}

export function storyPages(place: CuratedPlace): BookPage[] {
  const card = placeCard(place.id);
  const picture = placePicture(place);
  const photo = picture.kind === 'card' || picture.kind === 'photo' ? picture.src : undefined;
  const poster = card?.clip?.poster ?? (photo ? { src: photo, alt: place.name, credit: picture.credit ?? '' } : undefined);
  const pages: BookPage[] = [];

  if (card?.clip && poster)
    pages.push({
      key: 'watch',
      label: 'Watch',
      node: (
        <div className={styles.clip} data-no-flip>
          <SampleVideo poster={poster} title={card.clip.title} duration={card.clip.seconds} captions={card.clip.captions} top={16} />
        </div>
      ),
    });
  else if (photo) pages.push({ key: 'picture', label: 'Picture', node: <Picture src={photo} alt={place.name} /> });

  if (card?.tiles) pages.push({ key: 'numbers', label: 'Key numbers', node: <Numbers tiles={card.tiles} /> });

  if (card?.thenNow)
    pages.push({
      key: 'then-now',
      label: 'Then and now',
      node: (
        <div className={styles.thenNow} data-no-flip>
          <ThenNow delay={0.1} data={{ ...card.thenNow, sliderLabel: `Compare ${place.name} in ${card.thenNow.thenLabel} and ${card.thenNow.nowLabel}` }} />
        </div>
      ),
    });

  if (card?.lead)
    pages.push({
      key: 'story',
      label: 'Story',
      node: (
        <div className={styles.story}>
          <StoryArticle top={12} leadDelay={0.1} lead={card.lead} more={card.more ?? []} />
        </div>
      ),
    });

  if (card?.lookFor?.length)
    pages.push({ key: 'look-for', label: 'Look for', node: <LookFor placeId={place.id} rows={card.lookFor} photo={photo} alt={place.name} /> });

  if (card?.order)
    pages.push({
      key: 'order',
      label: 'How to order',
      node: (
        <div className={styles.order}>
          <OrderBuilder guide={ORDER_GUIDES[card.order]} />
        </div>
      ),
    });

  return pages;
}
