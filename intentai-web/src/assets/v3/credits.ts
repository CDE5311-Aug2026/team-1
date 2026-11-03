// Credits for the Intent v3 Figma photos used across the app (ZIP prototype assets). The credit lines are the
// Figma's own (frames 6, 8, 9, 11 of Intent v3.fig); the Figma names images by SHA-1, which matched these files.
// Any page showing one of these photos must show its credit (on the page or in a reachable credits list).
export interface PhotoCredit {
  /** File name in src/assets/v3 (or a sub-folder) — the prototype's own name in brackets. */
  file: string;
  subject: string;
  credit: string;
}

export const V3_PHOTO_CREDITS: readonly PhotoCredit[] = [
  { file: 'entry-culture-thian-hock-keng.png (f5d56)', subject: 'Thian Hock Keng Temple', credit: 'Photo: Zairon · CC BY-SA 4.0' },
  { file: 'postcard-bak-kwa.png (5142c)', subject: 'Bak kwa', credit: 'Photo: Alpha · CC BY-SA 2.0' },
  { file: 'entry-meaning-street.png (c15ab)', subject: 'Chinatown street', credit: 'Photo: kallerna · CC BY-SA 4.0' },
  { file: 'postcard-berlin-wall.png (3327d)', subject: 'Berlin Wall panels', credit: 'Photo: Lear 21 · CC BY-SA 3.0' },
];
