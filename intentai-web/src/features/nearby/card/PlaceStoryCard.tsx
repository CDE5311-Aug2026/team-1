// The top of a Nearby place page as a story card, in the style of Team 1's place-story cards: kicker, heading and
// subtitle, then (each only when the place has it) the sample clip or its photo, three key numbers, then and now,
// the card's text, "Look for" and its sources. Every place gets the header and its photo; the rest comes from
// src/data/explore/placeCards.ts, written place by place from sources.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { InfoCard, SampleVideo, SourceLine, StatTiles, StoryArticle, StoryIcon, type StatTile, type StoryIconName } from '../../../components/story';
import headerStyles from '../../../components/story/StoryHeader.module.css';
import { ORDER_GUIDES } from '../../../data/explore/orders';
import { placeCard, type CardTile, type PlaceCard } from '../../../data/explore/placeCards';
import { placePicture } from '../../../data/home/nearbyCards';
import { ThenNow } from './ThenNow';
import { area as areaById, regionName } from '../catalogue';
import { CATEGORY_INFO, type CuratedPlace, type SourceReference } from '../domain';
import type { Category } from '../types';
import OrderBuilder from './OrderBuilder';
import styles from './PlaceStoryCard.module.css';

const ICON: Record<Category, StoryIconName> = { food: 'food', landmark: 'monument', culture: 'festival', nature: 'nature' };

const statTile = (t: CardTile): StatTile => ({
  // years count up from the start of their century, other numbers from zero
  from: t.grouped || t.value < 1000 ? 0 : Math.floor(t.value / 100) * 100,
  to: t.value,
  label: t.label,
  format: (n: number) => `${t.grouped ? Math.round(n).toLocaleString('en-GB') : Math.round(n)}${t.suffix ?? ''}`,
});

/** The pages and photos behind the card, once each. */
function credits(card: PlaceCard | undefined, photoCredit: string | undefined) {
  const sources = [...(card?.sources ?? []), ...(card?.tiles?.map((t) => t.source) ?? [])].filter((s, i, all) => all.findIndex((o) => o.url === s.url) === i);
  const photos = [card?.clip?.poster?.credit ?? photoCredit?.replace(/^Photo:\s*/, ''), card?.thenNow?.then.credit, card?.thenNow?.now.credit].filter(
    (c, i, all): c is string => !!c && all.indexOf(c) === i,
  );
  return { sources, photos };
}

/** Sources grouped by publisher, in first-seen order. */
function bySource(sources: SourceReference[]): [string, SourceReference[]][] {
  const groups = new Map<string, SourceReference[]>();
  for (const s of sources) groups.set(s.publisher, [...(groups.get(s.publisher) ?? []), s]);
  return [...groups.entries()];
}

function SourceLink({ s, children }: { s: SourceReference; children: string }) {
  return (
    <a className={styles.sourceLink} href={s.url} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </a>
  );
}

/** A story block: its own card when framed, else as it was. */
function Block({ framed, label, children }: { framed: boolean; label?: string; children: ReactNode }) {
  return framed ? (
    <section className={styles.block} aria-label={label}>
      {children}
    </section>
  ) : (
    <>{children}</>
  );
}

export default function PlaceStoryCard({
  place,
  distance,
  framed = false,
  hideHeader = false,
}: {
  place: CuratedPlace;
  distance?: string | null;
  /** Each block in its own card (Home's place intro, owner 31 Oct: "card-style, not flat"). */
  framed?: boolean;
  /** The heading is shown elsewhere (Home's intro has it in its status card). */
  hideHeader?: boolean;
}) {
  const card = placeCard(place.id);
  const info = CATEGORY_INFO[place.category];
  const areaName = areaById(place.areaId)?.name ?? regionName(place.regionId);
  const picture = placePicture(place);
  const photo = picture.kind === 'card' || picture.kind === 'photo' ? { src: picture.src!, credit: picture.credit } : undefined;
  const subtitle = card?.subtitle ?? place.kind;
  const { sources, photos } = credits(card, card?.clip || !photo ? undefined : photo.credit);
  const poster = card?.clip?.poster ?? (photo ? { src: photo.src, alt: `${place.name}`, credit: photo.credit } : undefined);

  return (
    // The story blocks keep Team 1's own 20px margins inside a box that reaches the screen edge (as a story page).
    <div className={framed ? `${styles.card} ${styles.framed}` : styles.card} data-testid="place-story-card" data-allow-bleed>
      {!hideHeader && (
        <header className={headerStyles.header}>
          <p className={`a-up ${headerStyles.kicker}`}>
            <StoryIcon name={ICON[place.category]} size={14} className={headerStyles.icon} />
            {`${info.label} · ${areaName}`.toUpperCase()}
          </p>
          {/* The page's h1 is the place's name in the top bar; the card's own heading sits under it. */}
          <h2 className={headerStyles.title}>
            {(card?.title ?? [place.name]).map((phrase, i) => (
              <span key={i} className="a-blur" style={{ animationDelay: `${Math.round(5 + i * 10) / 100}s` }}>
                {i > 0 && ' '}
                {phrase}
              </span>
            ))}
          </h2>
          <p className={`a-up ${headerStyles.subtitle}`} style={{ animationDelay: '.2s' }}>
            {place.nameZh && (
              <>
                <span lang="zh-Hans">{place.nameZh}</span>
                {' · '}
              </>
            )}
            {subtitle}
            {distance && ` · ${distance}`}
          </p>
          {/* Team 1's story pages were removed in the Discovery redesign (31 Oct): their link only shows if one comes back */}
          {card?.story && !/^\/place\//.test(card.story.path) && (
            <p className={styles.storyRow}>
              <Link className={styles.storyLink} to={card.story.path}>
                <StoryIcon name="history" size={16} />
                {card.story.label}
              </Link>
            </p>
          )}
        </header>
      )}

      <Block framed={framed}>
        {card?.clip && poster ? (
          <SampleVideo poster={poster} title={card.clip.title} duration={card.clip.seconds} captions={card.clip.captions} top={16} />
        ) : (
          photo && (
            <figure className={`a-up ${styles.photo}`}>
              <img src={photo.src} alt={place.name} loading="eager" decoding="async" />
            </figure>
          )
        )}
      </Block>

      {card?.tiles && (
        <Block framed={framed} label="Key numbers">
          <StatTiles tiles={card.tiles.map(statTile) as [StatTile, StatTile, StatTile]} highlightThird label="Key numbers" />
        </Block>
      )}

      {card?.thenNow && (
        <Block framed={framed} label="Then and now">
          <ThenNow
            delay={0.4}
            data={{
              ...card.thenNow,
              sliderLabel: `Compare ${place.name} in ${card.thenNow.thenLabel} and ${card.thenNow.nowLabel}`,
            }}
          />
        </Block>
      )}

      {card?.lead && (
        <Block framed={framed} label="Story">
          <StoryArticle top={framed ? 12 : 16} leadDelay={0.45} lead={card.lead} more={card.more ?? []} />
        </Block>
      )}

      {card?.lookFor && card.lookFor.length > 0 && (
        <InfoCard label="Look for" kicker="LOOK FOR" kickerDelay={0.6}>
          <ul className={styles.rows}>
            {card.lookFor.map((row) => (
              <li key={row} className={styles.row}>
                <span aria-hidden="true" className={styles.dot} />
                {row}
              </li>
            ))}
          </ul>
        </InfoCard>
      )}

      {card?.order && (
        <Block framed={framed} label="How to order">
          <OrderBuilder guide={ORDER_GUIDES[card.order]} />
        </Block>
      )}

      {(sources.length > 0 || photos.length > 0) && (
        <SourceLine delay={0.7}>
          {sources.length > 0 && (
            <>
              Sources:{' '}
              {bySource(sources).map(([publisher, pages], i) => (
                <span key={publisher}>
                  {i > 0 && '; '}
                  {pages.length === 1 ? (
                    <SourceLink s={pages[0]}>{publisher}</SourceLink>
                  ) : (
                    <>
                      {publisher}:{' '}
                      {pages.map((page, j) => (
                        <span key={page.url}>
                          {j > 0 && ', '}
                          <SourceLink s={page}>{page.title}</SourceLink>
                        </span>
                      ))}
                    </>
                  )}
                </span>
              ))}
              {photos.length > 0 && ' · '}
            </>
          )}
          {photos.length > 0 && `Photos: ${photos.join('; ')}`}
        </SourceLine>
      )}
    </div>
  );
}
