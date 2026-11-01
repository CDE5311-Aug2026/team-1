// The boards (owner: "who has explored the most of Singapore, and who is fastest in the community challenges"):
// Explorers, by all of Singapore or one region, and Fastest for this weekend's challenge. The other players are
// samples until the leaderboard service and accounts exist; your own count is real (places you explored).
import { useMemo, type CSSProperties } from 'react';
import { HUNT_CHALLENGES, rankAmong, SAMPLE_EXPLORERS, SAMPLE_SPEED } from '../../data/hunt/stories';
import { areaOfPlace, URA_REGIONS, visitedSet } from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import Icon from '../OnboardingPage/v3/icons';
import type { HuntGo } from './HuntPage';
import styles from './Hunt.module.css';

// a region's share of the sample players' places (roughly by how many places each region has)
const SHARE: Record<string, number> = { central: 0.55, west: 0.15, east: 0.12, 'north-east': 0.1, north: 0.08 };

export function Board({ kind, scope, go, openRoute }: { kind: 'explore' | 'speed'; scope: string; go: HuntGo; openRoute(id: string): void }) {
  const personal = useExplorePersonal();
  const visited = useMemo(() => [...visitedSet(personal)], [personal]);
  const region = URA_REGIONS.find((r) => r.id === scope);
  const mine = region ? visited.filter((id) => areaOfPlace(id)?.region === region.id).length : visited.length;
  const rows =
    kind === 'speed'
      ? SAMPLE_SPEED
      : SAMPLE_EXPLORERS.map((r, i) => ({
          ...r,
          value: region ? Math.max(1, Math.round(r.value * SHARE[region.id] * (1 + ((i * 7) % 5) / 10))) : r.value,
        })).sort((a, b) => b.value - a.value);
  const rank = rankAmong(rows, mine);
  const unit = kind === 'speed' ? 'min' : 'places';
  const ch = HUNT_CHALLENGES[0];

  return (
    <>
      <header className={styles.subHeader}>
        <button type="button" className={styles.square} aria-label="Back to Public" onClick={() => go({ tab: 'public' })}>
          <Icon name="back" size={22} />
        </button>
        <h1 className={styles.brandTitle}>Leaderboards</h1>
      </header>

      <div className={styles.segment} role="tablist" aria-label="Board" style={{ '--at': kind === 'explore' ? 0 : 1 } as CSSProperties}>
        <button type="button" role="tab" aria-selected={kind === 'explore'} onClick={() => go({ board: 'explore', scope }, true)}>
          Explorers
        </button>
        <button type="button" role="tab" aria-selected={kind === 'speed'} onClick={() => go({ board: 'speed' }, true)}>
          Fastest
        </button>
        <span className={styles.segInk} aria-hidden="true" />
      </div>

      {kind === 'explore' ? (
        <div className={`${styles.chips} ${styles.scroll}`} role="radiogroup" aria-label="Where">
          {[{ id: 'sg', name: 'All Singapore' }, ...URA_REGIONS].map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={(region?.id ?? 'sg') === r.id}
              onClick={() => go({ board: 'explore', scope: r.id }, true)}
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.sub}>
          {ch.title} · {ch.players} joined
        </p>
      )}

      <section className={styles.podiumCard} aria-label="Top three">
        <p className={styles.passHead}>
          <span>{kind === 'speed' ? 'FASTEST' : 'EXPLORERS'}</span>
          <span className={styles.passRule} aria-hidden="true" />
          <span>{region ? region.name.toUpperCase() : 'SGP'}</span>
        </p>
        <ol className={styles.podium}>
          {[1, 0, 2].map((i) => (
            <li key={i} data-n={i + 1}>
              <span className={styles.avatar}>{rows[i].name[0]}</span>
              <b>{rows[i].name}</b>
              <small>
                {rows[i].value} {unit}
              </small>
              <span className={styles.step}>{i + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      <ol className={styles.list} start={4}>
        {rows.slice(3).map((r, i) => (
          <li key={r.name}>
            <span className={styles.medal}>{i + 4}</span>
            <span className={styles.name}>{r.name}</span>
            <b>
              {r.value} <small>{unit}</small>
            </b>
          </li>
        ))}
      </ol>

      <div className={styles.youRow}>
        <span className={styles.medal} data-you>
          {kind === 'speed' ? '–' : rank}
        </span>
        <span className={styles.upText}>
          <b>You</b>
          <small>{kind === 'speed' ? 'Join the challenge to get a time' : `${mine} places${region ? ` in ${region.name}` : ''}`}</small>
        </span>
        {kind === 'speed' ? (
          <button type="button" className={styles.primary} onClick={() => openRoute(ch.routeId)}>
            Join
          </button>
        ) : (
          <b className={styles.youRank}>#{rank}</b>
        )}
      </div>
      <p className={styles.note}>Other players are samples until the live boards open.</p>
    </>
  );
}
