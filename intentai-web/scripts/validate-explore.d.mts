// Types for scripts/validate-explore.mjs (used by src/features/nearby/catalogue.test.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CatalogueData {
  places: any[];
  areas: any[];
  regions: any[];
  collections: any[];
  outline: [number, number][][];
  stats?: { publishedPlaces: number };
  thumbs?: { credit: string; ids: string[] };
  thumbExists?: (id: string) => boolean;
  /** research/crosswalk.csv rows (Tourism 2040 reconciliation), when present. */
  crosswalk?: Record<string, string>[];
  /** research/tourism2040.csv rows. */
  research?: Record<string, string>[];
}

export const TOURISM_CATEGORIES: string[];
export const TOURISM_SUBTYPES: string[];
export const OPERATING_STATUSES: string[];
export const PIN_QUALITIES: string[];

export function validateCatalogue(data: CatalogueData): {
  errors: string[];
  warnings: string[];
  counts: { places: number; published: number; withSourcedFacts: number; collections: Record<string, number> };
};

export const CATALOGUE_DIR: string;
export function loadCatalogue(dir?: string): CatalogueData;
