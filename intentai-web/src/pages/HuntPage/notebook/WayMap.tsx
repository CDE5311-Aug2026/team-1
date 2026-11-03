// The Map tab of a story being played (owner, 3 Nov 2026): not a drawing, the way there. A live Google map of the stop,
// every stop listed ✓ found or ✗ still to find, and Walk there, which opens Google Maps' walking directions from where
// the phone is. Tap a stop to see it on the map.
import { useState } from 'react';
import { chapter, type ChapterStop } from './chapters';
import { Overlay } from './Overlay';
import styles from './waymap.module.css';

// the stop's own coordinates (an approximate pin is still on the right street); its name only when there are none
const spot = (s: ChapterStop) => (s.pin ? `${s.pin.lat},${s.pin.lng}` : `${s.name}, Singapore`);
const embed = (s: ChapterStop) => `https://maps.google.com/maps?q=${encodeURIComponent(spot(s))}&z=17&output=embed`;
export const walkTo = (s: ChapterStop) => `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${encodeURIComponent(spot(s))}`;

export function WayMap({ routeId, onClose }: { routeId: string; onClose(): void }) {
  const [ch] = useState(() => chapter(routeId));
  const next = ch.stops.find((s) => !s.done) ?? ch.stops[ch.stops.length - 1];
  const [at, setAt] = useState(next.id);
  const sel = ch.stops.find((s) => s.id === at) ?? next;
  const found = ch.stops.filter((s) => s.done).length;
  return (
    <Overlay label={`Map: ${ch.title}`} onClose={onClose}>
      <section className={styles.way}>
        <header className={styles.head}>
          <span className={styles.real}>Real world</span>
          <h2>{sel.name}</h2>
          <span className={styles.count} aria-label={`${found} of ${ch.stops.length} found`}>
            {found}/{ch.stops.length}
          </span>
        </header>
        <div className={styles.map}>
          <iframe key={sel.id} title={`Map of ${sel.name}`} src={embed(sel)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
        {sel.done ? (
          <p className={styles.done}>✓ Found. Its clue is in your Clues.</p>
        ) : (
          <a className={styles.walk} href={walkTo(sel)} target="_blank" rel="noreferrer">
            Walk there in Google Maps ↗︎
          </a>
        )}
        <p className={styles.hint}>There, tap the camera tab to check in.</p>
        <ol className={styles.stops}>
          {ch.stops.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`${s.id === sel.id ? styles.on : ''} ${s.done ? styles.isDone : s.id === next.id ? styles.isNext : ''}`}
                onClick={() => setAt(s.id)}
                aria-pressed={s.id === sel.id}
                aria-label={`Stop ${s.n}, ${s.name}: ${s.done ? 'found' : s.id === next.id ? 'next' : 'still to find'}`}
              >
                <i aria-hidden="true">{String(s.n).padStart(2, '0')}</i>
                <span>
                  <b>{s.name}</b>
                  <small>{s.address}</small>
                </span>
                <em aria-hidden="true">{s.done ? '✓' : '✗'}</em>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </Overlay>
  );
}
