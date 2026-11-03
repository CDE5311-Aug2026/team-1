// What every story's book opens over the desk, the same for the prologue and the four routes: the unfolded map, the
// clue cards fanned out, the chest's ending and a film. The game's Clues button opens the very same clue cards
// (ClueLibrary), so a story has one place for its clues, whether you are reading the book or out on the street.
import { useState, type ReactNode } from 'react';
import { sendStop, type FindSGStop } from '../../../findsg';
import { DecodeShelf } from './DecodeShelf';
import { chapter, shortChapter, type Chapter, type ChapterStop, type Film } from './chapters';
import { CardFan } from './CardBox';
import { FilmProjector } from './FilmProjector';
import { Overlay } from './Overlay';
import styles from './props.module.css';
import { UnfoldedMap } from './TreasureMap';

export type Layer =
  | { kind: 'map' }
  | { kind: 'cards'; focus?: string }
  | { kind: 'ending' }
  | { kind: 'film'; reel: Film[]; title: string; back?: Layer };

export function ChapterLayers({
  ch,
  layer,
  setLayer,
  onGo,
  extra,
}: {
  ch: Chapter;
  layer: Layer | null;
  setLayer(next: Layer | null): void;
  /** A stop picked on the map or on a card. */
  onGo(stop: ChapterStop): void;
  /** Under the clue cards (in a story: the decode cards and the night race). */
  extra?: ReactNode;
}) {
  const film = (reel: Film[], title: string, back?: Layer) => reel.length > 0 && setLayer({ kind: 'film', reel, title, back });
  // a stop already found shows its clue card; any other goes out to play it
  const go = (stop: ChapterStop) => (stop.done ? setLayer({ kind: 'cards', focus: stop.id }) : onGo(stop));
  if (!layer) return null;
  if (layer.kind === 'map') return <UnfoldedMap chapter={ch} onClose={() => setLayer(null)} onGo={go} />;
  if (layer.kind === 'cards')
    return (
      <CardFan
        key={layer.focus ?? 'pile'}
        chapter={ch}
        focus={layer.focus}
        onClose={() => setLayer(null)}
        onFilm={(reel, title) => film(reel, title, layer)}
        onGo={go}
        extra={extra}
      />
    );
  if (layer.kind === 'ending') return <EndingScroll ch={ch} onClose={() => setLayer(null)} onFilm={() => film(ch.endingFilms, ch.ending.title, layer)} />;
  return <FilmProjector reel={layer.reel} title={layer.title} onClose={() => setLayer(layer.back ?? null)} />;
}

/** The clue cards of one story, opened from the game: the same cards as the book's Clues page. */
export function ClueLibrary({ routeId, onClose }: { routeId: string; onClose(): void }) {
  const [ch] = useState(() => (routeId === 'short' ? shortChapter() : chapter(routeId)));
  const [layer, setLayer] = useState<Layer | null>({ kind: 'cards' });
  const set = (next: Layer | null) => (next ? setLayer(next) : onClose());
  // out on the street already: a card's "go" just puts the cards away
  return <ChapterLayers ch={ch} layer={layer} setLayer={set} onGo={onClose} />;
}

/** A story's Map or Clues tab, opened over the stop being played. Under the clue cards lie the decode cards and the
 * night race that wins them (owner, 3 Nov 2026); both act on the stop through the game's own commands. */
export function PlayLayer({ routeId, kind, stop, onClose }: { routeId: string; kind: 'map' | 'clues'; stop: FindSGStop | null; onClose(): void }) {
  const [ch] = useState(() => chapter(routeId));
  const [layer, setLayer] = useState<Layer | null>(kind === 'map' ? { kind: 'map' } : { kind: 'cards' });
  const set = (next: Layer | null) => (next ? setLayer(next) : onClose());
  const away = (type: 'race' | 'decode') => () => {
    onClose();
    sendStop(type);
  };
  const extra = kind === 'clues' && stop ? <DecodeShelf stop={stop} onRace={away('race')} onDecode={away('decode')} /> : undefined;
  return <ChapterLayers ch={ch} layer={layer} setLayer={set} onGo={onClose} extra={extra} />;
}

export function EndingScroll({ ch, onClose, onFilm }: { ch: Chapter; onClose(): void; onFilm(): void }) {
  return (
    <Overlay label={ch.ending.title} onClose={onClose}>
      <article className={styles.scroll}>
        <span className={styles.scrollRod} aria-hidden="true" />
        <div className={styles.scrollPaper}>
          <p className={styles.readDate}>Vol. {ch.roman} · The end</p>
          <h2>{ch.ending.title}</h2>
          <p>{ch.ending.text}</p>
          <p className={styles.reflect}>{ch.ending.reflection}</p>
          {ch.endingFilms.length > 0 && (
            <button type="button" className={styles.clippedPhoto} onClick={onFilm}>
              <span className={styles.paperClip} aria-hidden="true" />
              <img src={ch.endingFilms[0].poster} alt="" />
              <span>▶ Closing film</span>
            </button>
          )}
        </div>
        <span className={styles.scrollRod} aria-hidden="true" />
      </article>
    </Overlay>
  );
}
