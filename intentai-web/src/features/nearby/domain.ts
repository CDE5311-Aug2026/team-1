// Nearby Explorer domain: physical destinations, collections and personal (device-local) state.
// The existing `Place` type in src/data/domain.ts is a *language setting* (Hawker centre, MRT · bus…);
// it stays unchanged and is called a "context" here. Destinations are `CuratedPlace`.
//
// Data comes from the EARTH ONLINE (City Brush) Singapore dataset — landmark placement, names and intro
// cards — plus researched entries whose fun facts carry source links. See src/data/explore/README.md.
import type { Place as PlaceContext } from '../../data/domain';
import { isOneOf, isRecord } from '../../data/validate';
import { isCountry, type Category, type CountryCode, type LatLng } from './types';

export type { Category, CountryCode, LatLng } from './types';
export type { PlaceContext };

export type CuratedId = `curated:${string}`;
/** Namespaced so other id spaces can be added later without collisions. */
export type PlaceKey = CuratedId;

export interface SourceReference {
  title: string;
  url: string;
  publisher: string;
  /** ISO date the page was checked. */
  checkedAt: string;
}

export interface PlaceFact {
  id: string;
  text: string;
  sources: SourceReference[];
}

export interface LanguageTip {
  /** One of the nine language settings; its phrase guidance comes from nearbyContent(). */
  context: PlaceContext;
  regionLabel: string;
}

export type EditorialStatus = 'draft' | 'published' | 'retired';
/** Where an entry comes from: the EARTH ONLINE dataset, our researched entries, or both merged. */
export type Provenance = 'earth-online' | 'researched' | 'earth-online+researched';

export interface CuratedPlace {
  id: CuratedId;
  name: string;
  /** Chinese name from the EARTH ONLINE dataset (Simplified). */
  nameZh?: string;
  country: CountryCode;
  regionId: string;
  areaId: string;
  coordinates: LatLng & { source: SourceReference };
  category: Category;
  /** Short card label: "Hawker centre", "Temple", "Nature reserve"… */
  kind: string;
  summary: string;
  /** The dataset's intro card (not source-linked), shown as "About" with its provenance. */
  description?: { en: string; zh?: string; source: SourceReference };
  /** Year / architect / height / floors from the dataset card. */
  quickFacts?: { year?: string; architect?: string; heightM?: number; floors?: number };
  /** Source-linked fun facts (0–3). Dataset-only places have none yet. */
  facts: PlaceFact[];
  languageTip?: LanguageTip;
  accessNotes?: { text: string; source: SourceReference };
  /** A dated award, e.g. MICHELIN Guide Bib Gourmand 2025, with the page that shows it. */
  recognition?: { label: string; year: number; source: SourceReference };
  /** The landmark key in the EARTH ONLINE 3D page (opens its intro card there). */
  earthKey?: string;
  provenance: Provenance;
  /** Offices, homes and other buildings seen from outside only. */
  viewFromOutside?: boolean;
  editorialStatus: EditorialStatus;
  reviewedAt: string;
  reviewedBy: string;
}

export interface Region {
  id: string;
  name: string;
  country: CountryCode;
}

export interface Area {
  id: string;
  name: string;
  country: CountryCode;
  regionId: string;
  center: LatLng;
  source: Partial<SourceReference>;
  /** Country overview: shown before any search; not a search centre. */
  overview?: boolean;
}

export interface ExploreCollection {
  id: string;
  version: number;
  country: CountryCode;
  /** Full title, used only once the collection is published with its target count. */
  title: string;
  /** Plain name while not signed off, e.g. "Singapore collection" (the draft status is said in a note, not the title). */
  starterTitle: string;
  description: string;
  status: 'starter' | 'published';
  memberIds: CuratedId[];
  /** The big collection has 100 places; an editor's pick (kind "picks") has 10. */
  targetCount: number;
  /** "picks": a short themed list (Editor's picks), named by its title from the start. */
  kind?: 'picks';
  /** Simplified Chinese title (Editor's picks). */
  titleZh?: string;
}

export interface PersonalPlaceState {
  placeKey: PlaceKey;
  saved: boolean;
  visited: boolean;
  /** Local calendar date (YYYY-MM-DD), self-reported; no GPS proof. */
  visitedOn?: string;
  updatedAt: string;
}

export interface ExplorePersonalData {
  schemaVersion: 1;
  places: PersonalPlaceState[];
  preferredCountry: CountryCode;
  selectedAreaId?: string;
  /** When the user accepted the location explanation (a time, never a location). */
  locationDisclosureAcceptedAt?: string;
  /** Milestones already acknowledged per collection id, e.g. { "sg-100": [10, 25] }. */
  milestonesSeen?: Record<string, number[]>;
}

export const DEFAULT_EXPLORE_PERSONAL: ExplorePersonalData = {
  schemaVersion: 1,
  places: [],
  preferredCountry: 'SG',
};

export const CATEGORY_INFO: Record<Category, { label: string; plural: string; emoji: string }> = {
  landmark: { label: 'Landmark', plural: 'Landmarks', emoji: '🏛️' },
  food: { label: 'Food', plural: 'Food', emoji: '🍜' },
  nature: { label: 'Nature', plural: 'Nature', emoji: '🌿' },
  culture: { label: 'Culture', plural: 'Culture', emoji: '🎭' },
};

export const COUNTRY_INFO: Record<CountryCode, { name: string; currency: string }> = {
  SG: { name: 'Singapore', currency: 'S$' },
};

export const MILESTONES = [10, 25, 50, 100] as const;

/* ---------- Validators (personal state comes from storage and imports: never trust it) ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isPlaceKey(value: unknown): value is PlaceKey {
  return typeof value === 'string' && /^curated:[a-z0-9-]{3,80}$/.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

export function isPersonalPlaceState(value: unknown): value is PersonalPlaceState {
  return (
    isRecord(value) &&
    isPlaceKey(value.placeKey) &&
    typeof value.saved === 'boolean' &&
    typeof value.visited === 'boolean' &&
    (value.visitedOn === undefined || isLocalDate(value.visitedOn)) &&
    isTimestamp(value.updatedAt)
  );
}

const MILESTONE_STRINGS = MILESTONES.map(String);

function isMilestones(value: unknown): value is Record<string, number[]> {
  return (
    isRecord(value) &&
    Object.values(value).every((list) => Array.isArray(list) && list.every((n) => isOneOf(MILESTONE_STRINGS, String(n))))
  );
}

export function isExplorePersonalData(value: unknown): value is ExplorePersonalData {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    Array.isArray(value.places) &&
    value.places.every(isPersonalPlaceState) &&
    isCountry(value.preferredCountry) &&
    (value.selectedAreaId === undefined || typeof value.selectedAreaId === 'string') &&
    (value.locationDisclosureAcceptedAt === undefined || isTimestamp(value.locationDisclosureAcceptedAt)) &&
    (value.milestonesSeen === undefined || isMilestones(value.milestonesSeen))
  );
}
