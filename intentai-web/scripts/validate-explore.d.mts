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
}

export function validateCatalogue(data: CatalogueData): {
  errors: string[];
  warnings: string[];
  counts: { places: number; published: number; withSourcedFacts: number; collections: Record<string, number> };
};

export const CATALOGUE_DIR: string;
export function loadCatalogue(dir?: string): CatalogueData;
