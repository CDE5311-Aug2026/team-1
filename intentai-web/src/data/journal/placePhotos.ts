// Real photos of places for the journal and the travelogue: the card photo or the Commons photo of a published place
// (never the 3D thumbnail or the map). Hunt stamps only keep the stop's name, so places are also found by name.
import { area, PUBLISHED_PLACES } from "../../features/nearby/catalogue";
import type { CuratedPlace } from "../../features/nearby/domain";
import { placePicture } from "../home/nearbyCards";

export function realPhoto(
  place: CuratedPlace,
): { src: string; credit: string } | undefined {
  const p = placePicture(place);
  return (p.kind === "card" || p.kind === "photo") && p.src
    ? { src: p.src, credit: p.credit }
    : undefined;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
let byName: Map<string, CuratedPlace> | null = null;

/** The published place with this name, if there is one. */
export function placeNamed(name: string): CuratedPlace | undefined {
  byName ??= new Map(PUBLISHED_PLACES.map((p) => [norm(p.name), p]));
  return byName.get(norm(name));
}

/** The area's short name ("Marina Bay & Civic District" → "Marina Bay"); none for the country overview. */
export function areaName(place: CuratedPlace | undefined): string | undefined {
  const name = place ? area(place.areaId)?.name : undefined;
  return name && name !== "Singapore" ? name.split(/\s*[&,]\s*/)[0] : undefined;
}

/** Real photos of other places in these areas (for filling a travelogue), each still named for its own place. */
export function sceneryIn(
  areas: string[],
  skip: Set<string>,
  n: number,
): { id: string; src: string; title: string; credit: string; area: string }[] {
  const out: {
    id: string;
    src: string;
    title: string;
    credit: string;
    area: string;
  }[] = [];
  if (!areas.length || n <= 0) return out;
  // take one from each area in turn, so every area shows
  const pools = areas.map((a) =>
    PUBLISHED_PLACES.filter((p) => areaName(p) === a).flatMap((p) => {
      const photo = realPhoto(p);
      return photo && !skip.has(photo.src)
        ? [
            {
              id: `n-${p.id}`,
              src: photo.src,
              title: p.name,
              credit: photo.credit,
              area: a,
            },
          ]
        : [];
    }),
  );
  for (let i = 0; out.length < n && pools.some((p) => p.length > i); i++)
    for (const pool of pools) if (pool[i] && out.length < n) out.push(pool[i]);
  return out;
}
