// A place's story as notebook pages (Home's intro, owner 31 Oct 2026: "pages you turn; small cards you can move about
// like sticky notes"). One page each, only when the place has it: the picture (a print taped in, which you can lift
// and move; a clip stays put so it can play), the three key numbers as sticky notes, then and now, the story, what
// to look for as notes, and how to order. Anything that moves sideways itself is marked so the page does not turn.
import { useRef } from 'react';
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

function LookFor({ rows }: { rows: string[] }) {
  const board = useRef<HTMLUListElement>(null);
  return (
    <section aria-label="Look for">
      <p className={styles.lead}>When you are there, look out for these:</p>
      <ul ref={board} className={`${styles.board} ${styles.look}`}>
        {rows.map((row, i) => (
          <StickyNote key={row} tone={TONES[(i + 1) % TONES.length]} tilt={TILTS[(i + 2) % TILTS.length]} bounds={board}>
            <span className={styles.look1}>
              <i aria-hidden="true">{`${i + 1}`}</i>
              {row}
            </span>
          </StickyNote>
        ))}
      </ul>
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

  if (card?.lookFor?.length) pages.push({ key: 'look-for', label: 'Look for', node: <LookFor rows={card.lookFor} /> });

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
