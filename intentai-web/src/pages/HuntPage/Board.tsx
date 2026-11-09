// The boards (owner: "who has explored the most of Singapore, and who is fastest in the community challenges"):
// Explorers, by all of Singapore or one region, and Fastest for this weekend's challenge. The other players are
// samples until the leaderboard service and accounts exist; your own count is real (places you explored).
// v2 (owner, 8 Nov 2026): the page board in the field archive's language (Boards.module.css), on the app's chart paper,
// with the players' animal icons (Avatar, as Home's leaderboard). The Passport now shows Home's region leaderboard.
import { useMemo } from 'react';
import { HUNT_CHALLENGES, rankAmong, SAMPLE_EXPLORERS, SAMPLE_SPEED } from '../../data/hunt/stories';
import { CHALLENGES } from '../../data/hunt/challenges';
import { areaOfPlace, URA_REGIONS, visitedSet } from '../../data/ura/ura';
import { useExplorePersonal } from '../../features/nearby/actions';
import { imageFor } from '../../findsg';
import Avatar from '../../components/Avatar/Avatar';
import CategoryBadge from '../../components/Category/CategoryBadge';
import Icon from '../OnboardingPage/v3/icons';
import type { HuntGo } from './HuntPage';
import bd from './Boards.module.css';

// a region's share of the sample players' places (roughly by how many places each region has)
const SHARE: Record<string, number> = { central: 0.55, west: 0.15, east: 0.12, 'north-east': 0.1, north: 0.08 };

export function Board(props: { kind: 'explore' | 'speed'; scope: string; go: HuntGo; openRoute(id: string): void }) {
  return <PageBoard {...props} />;
}

function PageBoard({ kind, scope, go, openRoute }: { kind: 'explore' | 'speed'; scope: string; go: HuntGo; openRoute(id: string): void }) {
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
  // the players in order, numbered; you go in at your rank (Explorers), or at the foot with no time yet (Fastest)
  type Ranked = { you: false; name: string; value: number; rank: number } | { you: true; rank: number | null };
  const ranked: Ranked[] = rows.map((r, i) => ({ you: false as const, name: r.name, value: r.value, rank: i + 1 + (kind === 'explore' && i + 1 >= rank ? 1 : 0) }));
  if (kind === 'explore') ranked.splice(rank - 1, 0, { you: true, rank });
  else ranked.push({ you: true, rank: null });
  const challenge = CHALLENGES.find((c) => c.id === ch.id);

  return (
    <>
      <header className={bd.head}>
        <button type="button" className={bd.back} aria-label="Back to Public" onClick={() => go({ tab: 'public' })}>
          <Icon name="back" size={20} />
        </button>
        <h2 className={bd.title}>Leaderboards</h2>
        {/* no "Example players" pill top right (owner, 9 Nov 2026): the note under the boards says they are samples */}
      </header>

      <div className={bd.seg} role="tablist" aria-label="Board">
        <button type="button" role="tab" aria-selected={kind === 'explore'} onClick={() => go({ board: 'explore', scope }, true)}>
          Explorers
        </button>
        <button type="button" role="tab" aria-selected={kind === 'speed'} onClick={() => go({ board: 'speed' }, true)}>
          Fastest
        </button>
      </div>

      {kind === 'explore' ? (
        <div className={bd.chips} role="radiogroup" aria-label="Where">
          {[{ id: 'sg', name: 'All Singapore' }, ...URA_REGIONS].map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              className={bd.chip}
              aria-checked={(region?.id ?? 'sg') === r.id}
              onClick={() => go({ board: 'explore', scope: r.id }, true)}
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : (
        <section className={`${bd.card} ${bd.challenge}`} aria-labelledby="board-challenge-h">
          <img className={bd.thumb} src={imageFor(ch.routeId)} alt="" width={64} height={64} />
          <span className={bd.cBody}>
            {challenge?.category ? (
              <CategoryBadge category={challenge.category} variant="kicker" suffix={challenge.kind} />
            ) : (
              <span className={bd.mono}>{challenge?.kind ?? 'Weekend'}</span>
            )}
            <h3 id="board-challenge-h" className={bd.cTitle}>
              {challenge?.title ?? ch.title}
            </h3>
          </span>
        </section>
      )}

      <section className={bd.card} aria-labelledby="board-top-h">
        <div className={bd.cardHead}>
          <h3 id="board-top-h">{kind === 'speed' ? 'Fastest' : 'Explorers'}</h3>
          <span className={bd.mono}>{kind === 'speed' ? (challenge?.title ?? 'This weekend') : (region?.name ?? 'All Singapore')}</span>
        </div>
        {/* one ranked list (user test UT02-5: "a leaderboard, not a pile of sorted cards"): rank (gold, silver, bronze
            for the top three), icon, name, score; your own row sits at your place, highlighted, and stays pinned over
            the tab bar while the list scrolls */}
        <ol className={`${bd.list} ${bd.ranked}`} aria-label="Leaderboard, example players and you">
          {ranked.map((r) =>
            r.you ? (
              <li key="you" className={`${bd.me} ${bd.pinned}`} aria-current="true">
                <span className={bd.rank}>{r.rank ?? '–'}</span>
                <Avatar name="You" size={32} className={bd.rowAvatar} />
                <span className={bd.name}>
                  <b>You</b>
                  {kind === 'speed' && <small className={bd.meSub}>No time yet</small>}
                </span>
                {kind === 'speed' ? (
                  <button type="button" className={bd.primary} onClick={() => openRoute(ch.routeId)}>
                    Join
                  </button>
                ) : (
                  <span className={bd.value}>
                    {mine} {unit}
                  </span>
                )}
              </li>
            ) : (
              <li key={r.name}>
                <span className={bd.rank} data-n={r.rank}>
                  {r.rank}
                </span>
                <Avatar name={r.name} size={32} className={bd.rowAvatar} />
                <span className={bd.name}>{r.name}</span>
                <span className={bd.value}>
                  {r.value} {unit}
                </span>
              </li>
            ),
          )}
        </ol>
      </section>

      <p className={bd.note}>Other players are samples until the live boards open.</p>
    </>
  );
}
