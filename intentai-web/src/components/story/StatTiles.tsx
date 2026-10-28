import { useCountUp } from './useCountUp';
import styles from './StatTiles.module.css';

export interface StatTile {
  /** Count-up start (default 0), e.g. 1961 for a year. */
  from?: number;
  to: number;
  /** Fixed decimals while counting (default 0, rounded). */
  decimals?: number;
  /** Custom number text (gets the rounded value); overrides `decimals`. */
  format?: (n: number) => string;
  prefix?: string;
  /** Smaller unit after the number, e.g. "m". */
  unit?: string;
  label: string;
}

interface StatTilesProps {
  tiles: readonly [StatTile, StatTile, StatTile];
  /** Third tile in the orange tint (the festival, bak kwa and Spread cards). */
  highlightThird?: boolean;
  /** Section name (default "Key facts"). */
  label?: string;
  /** Count-up start after mount and length, ms. */
  delay?: number;
  duration?: number;
}

function numberText(tile: StatTile, k: number): string {
  const v = (tile.from ?? 0) + (tile.to - (tile.from ?? 0)) * k;
  if (tile.format) return tile.format(Math.round(v));
  return tile.decimals ? v.toFixed(tile.decimals) : String(Math.round(v));
}

const DELAYS = ['.3s', '.36s', '.42s'];

/** Three key-fact tiles whose numbers count up on mount (final values under reduced motion). */
export function StatTiles({ tiles, highlightThird = false, label = 'Key facts', delay = 500, duration = 1400 }: StatTilesProps) {
  const k = useCountUp(delay, duration);
  return (
    <section aria-label={label} className={styles.tiles}>
      {tiles.map((tile, i) => {
        const hi = highlightThird && i === 2;
        return (
          <div
            key={tile.label}
            data-tile
            data-highlight={hi || undefined}
            className={`a-up ${styles.tile} ${hi ? styles.highlight : ''}`}
            style={{ animationDelay: DELAYS[i] }}
          >
            <div className={styles.number} data-testid="stat-value">
              {tile.prefix}
              {numberText(tile, k)}
              {tile.unit && <span className={styles.unit}>{` ${tile.unit}`}</span>}
            </div>
            <div className={styles.label}>{tile.label}</div>
          </div>
        );
      })}
    </section>
  );
}
