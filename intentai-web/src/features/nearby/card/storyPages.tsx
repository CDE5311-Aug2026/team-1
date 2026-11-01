// A place's story in the notebook (Home's intro). Owner, 1 Nov 2026: "too many pages here, always a big block of blank
// space" — so the story is one page, not one page per part: the clip or the picture (it takes whatever height the
// page has to spare, so the page never ends in blank paper), the lead, what to look for as a row of small notes you
// tick, then then and now and how to order, each folded until you open it (each is a page in size). The key numbers
// are a strip of small tiles on the field note (KeyNumbers). The page scrolls inside only once a fold is open.
// Anything that moves sideways itself is marked so the page does not turn.
import { useState } from 'react';
import { SampleVideo, StoryArticle } from '../../../components/story';
import type { BookPage } from '../../../components/Notebook/FlipBook';
import type { NoteTone } from '../../../components/Notebook/StickyNote';
import { ORDER_GUIDES } from '../../../data/explore/orders';
import { placeCard, type CardTile } from '../../../data/explore/placeCards';
import { placePicture } from '../../../data/home/nearbyCards';
import type { CuratedPlace } from '../domain';
import OrderBuilder from './OrderBuilder';
import { statTile } from './PlaceStoryCard';
import { ThenNow } from './ThenNow';
import styles from './storyPages.module.css';

const TONES: NoteTone[] = ['butter', 'rose', 'sage', 'sky'];
const TILTS = [-1.5, 1.2, -0.8, 1.6];

/** The three key numbers as a strip of small paper tiles (the field note's foot). */
export function KeyNumbers({ tiles }: { tiles: CardTile[] }) {
  return (
    <section aria-label="Key numbers" className={styles.strip}>
      <ul className={styles.tiles}>
        {tiles.map((t, i) => {
          const value = statTile(t).format?.(t.value) ?? String(t.value);
          return (
            <li key={t.label} className={styles.tile} data-tone={TONES[i % TONES.length]} style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}>
              <b className={styles.value}>{value}</b>
              <span className={styles.what}>{t.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// What to look for: a row of small notes, each with a box to tick once you have found it, and the tally beside the
// heading. The ticks are kept on this device, per place.
const spottedKey = (id: string) => `notebook.spotted.${id}`;

function readSpotted(id: string, n: number): boolean[] {
  try {
    const v = JSON.parse(localStorage.getItem(spottedKey(id)) ?? '[]');
    return Array.from({ length: n }, (_, i) => v[i] === true);
  } catch {
    return Array(n).fill(false);
  }
}

function LookFor({ placeId, rows }: { placeId: string; rows: string[] }) {
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
    <section aria-label="Look for" className={styles.lookFor}>
      <div className={styles.lookHead}>
        <h3 className={styles.kicker}>Look for</h3>
        <p className={styles.tally} aria-live="polite">
          <span className={styles.marks} aria-hidden="true">
            {spotted.map((v, i) => (
              <i key={i} data-on={v || undefined} />
            ))}
          </span>
          {found === rows.length ? 'All found. Well spotted!' : `${found} of ${rows.length} spotted`}
        </p>
      </div>
      <ul className={styles.look} style={{ gridTemplateColumns: `repeat(${Math.min(rows.length, 3)}, minmax(0, 1fr))` }}>
        {rows.map((row, i) => (
          <li key={row} className={styles.tile} data-tone={TONES[(i + 1) % TONES.length]} data-found={spotted[i] || undefined}>
            <span className={styles.lookNo} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className={styles.lookText}>{row}</span>
            <button
              type="button"
              className={styles.tick}
              aria-pressed={spotted[i]}
              aria-label={spotted[i] ? `Spotted: ${row}` : `Mark as spotted: ${row}`}
              onClick={() => toggle(i)}
            >
              {spotted[i] && (
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 11l5 5L18 3" />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The story as one notebook page (none when the place has nothing to tell beyond its key numbers). */
export function storyPages(place: CuratedPlace): BookPage[] {
  const card = placeCard(place.id);
  const picture = placePicture(place);
  const photo = picture.kind === 'card' || picture.kind === 'photo' ? picture.src : undefined;
  const poster = card?.clip?.poster ?? (photo ? { src: photo, alt: place.name, credit: picture.credit ?? '' } : undefined);
  const hasStory = !!(card?.lead || card?.thenNow || card?.lookFor?.length || card?.order);
  if (!hasStory && !(card?.clip && poster) && !photo) return [];

  return [
    {
      key: 'story',
      label: 'Story',
      node: (
        <div className={styles.page} data-fill>
          {card?.clip && poster ? (
            <div className={styles.clip} data-no-flip>
              <SampleVideo poster={poster} title={card.clip.title} duration={card.clip.seconds} captions={card.clip.captions} top={16} />
            </div>
          ) : (
            photo && (
              // a print taped in
              <figure className={styles.print}>
                <img src={photo} alt={place.name} draggable={false} decoding="async" />
              </figure>
            )
          )}

          {card?.lead && (
            <div className={styles.story}>
              <StoryArticle top={12} leadDelay={0.1} lead={card.lead} more={card.more ?? []} />
            </div>
          )}

          {!!card?.lookFor?.length && <LookFor placeId={place.id} rows={card.lookFor} />}

          {/* then and now and the order builder are each a page in size: folded, with what they hold on the fold */}
          {card?.thenNow && (
            <details className={styles.fold}>
              <summary>
                <span className={styles.kicker}>Then and now</span>
                <span className={styles.foldTitle}>{`${card.thenNow.thenLabel} · ${card.thenNow.nowLabel}`}</span>
                <span className={styles.thumbs} aria-hidden="true">
                  <img src={card.thenNow.then.src} alt="" decoding="async" loading="lazy" />
                  <img src={card.thenNow.now.src} alt="" decoding="async" loading="lazy" />
                </span>
              </summary>
              <div className={styles.thenNow} data-no-flip>
                <ThenNow delay={0} data={{ ...card.thenNow, sliderLabel: `Compare ${place.name} in ${card.thenNow.thenLabel} and ${card.thenNow.nowLabel}` }} />
              </div>
            </details>
          )}

          {card?.order && (
            <details className={`${styles.fold} ${styles.order}`}>
              <summary>
                <span className={styles.kicker}>How to order</span>
                <span className={styles.foldTitle}>{ORDER_GUIDES[card.order].title}</span>
              </summary>
              <OrderBuilder guide={ORDER_GUIDES[card.order]} />
            </details>
          )}
        </div>
      ),
    },
  ];
}
