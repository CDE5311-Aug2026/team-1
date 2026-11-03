// IntentAI's own routes (owner request 2026-10-29): walks that join Team 1's place stories to Nearby places, drawn on
// the same route page as the atlas's editor routes. Every stop is a published Nearby place; a stop that is also an
// atlas place takes its visit time and closing days from the atlas. Any other visit time is the team's estimate
// and is shown as one. Opening hours and closing days come from the place's sourced details, never invented.
// Kept light (keys only) so a place page can say "On routes: …" without loading the catalogue.
import type { AtlasMode } from '../atlas/atlasRoutes';

export interface TeamRouteSource {
  title: string;
  url: string;
  publisher: string;
  checkedAt: string;
}

export interface TeamRouteStop {
  /** The Nearby catalogue key. */
  key: `curated:${string}`;
  /** The team's visit-time estimate, used only when the stop is not an atlas place. */
  estimateMinutes?: number;
  /** 0 = Sunday … 6 = Saturday: regular closing days from `closedSource`, when the atlas has none. */
  closedWeekdays?: number[];
  closedSource?: TeamRouteSource;
}

export interface TeamRoute {
  id: string;
  title: string;
  subtitle: string;
  /** The atlas station id the route starts from. */
  station: string;
  duration: string;
  mode: AtlasMode;
  stops: TeamRouteStop[];
  note: string;
  /** Pages behind the note's times and days (the stops' own sources are on their place pages). */
  sources: TeamRouteSource[];
  /** The place story the route belongs to (`/place/:placeId`). */
  story: string;
  reviewedAt: string;
}

const MICHELIN_TIAN_TIAN: TeamRouteSource = {
  title: 'Tian Tian Hainanese Chicken Rice',
  url: 'https://guide.michelin.com/sg/en/singapore-region/singapore/restaurant/tian-tian-hainanese-chicken-rice',
  publisher: 'MICHELIN Guide',
  checkedAt: '2026-10-29',
};
const LIM_CHEE_GUAN: TeamRouteSource = {
  title: 'Lim Chee Guan 林志源 (New Bridge Road)',
  url: 'https://chinatown.sg/shop/lim-chee-guan-newbridge/',
  publisher: 'chinatown.sg',
  checkedAt: '2026-10-29',
};
const THIAN_HOCK_KENG: TeamRouteSource = {
  title: 'Contact us',
  url: 'https://thianhockkeng.com.sg/site/contactus2/',
  publisher: 'Thian Hock Keng',
  checkedAt: '2026-10-29',
};
const SRI_MARIAMMAN: TeamRouteSource = {
  title: 'Sri Mariamman Temple',
  url: 'https://chinatown.sg/visit/sri-mariamman-temple/',
  publisher: 'chinatown.sg',
  checkedAt: '2026-10-29',
};
const JAMAE: TeamRouteSource = {
  title: 'Contact',
  url: 'https://masjidjamaechulia.sg/welcome/contact',
  publisher: 'Masjid Jamae (Chulia)',
  checkedAt: '2026-10-29',
};
const THE_SPREAD: TeamRouteSource = {
  title: 'The Spread | Café at NUS',
  url: 'https://thespread.sg/',
  publisher: 'The Spread',
  checkedAt: '2026-10-29',
};
const NUS_MUSEUM: TeamRouteSource = {
  title: 'Visit',
  url: 'https://nus.edu.sg/museum/visit',
  publisher: 'NUS Museum',
  checkedAt: '2026-10-29',
};
const LKCNHM: TeamRouteSource = {
  title: 'Plan your visit',
  url: 'https://lkcnhm.nus.edu.sg/plan-your-visit/',
  publisher: 'Lee Kong Chian Natural History Museum',
  checkedAt: '2026-10-29',
};

export const teamRoutes: TeamRoute[] = [
  {
    id: 'chinatown-story-walk',
    title: 'Chinatown · The story walk',
    subtitle: 'The temple, the street and the bak kwa from the Chinatown story cards',
    station: 'telok-ayer',
    duration: 'About 2–2.5 hours (estimate)',
    mode: 'walking',
    stops: [
      { key: 'curated:sg-thian-hock-keng-temple' },
      { key: 'curated:sg-sri-mariamman-temple' },
      { key: 'curated:sg-masjid-jamae-chulia' },
      { key: 'curated:sg-pagoda-street-trengganu-street', estimateMinutes: 20 },
      { key: 'curated:sg-lim-chee-guan-new-bridge-road', estimateMinutes: 15 },
    ],
    note:
      'Go in the morning. Thian Hock Keng opens at 7:30 am. Sri Mariamman Temple closes from 12 noon to 4:30 pm, and Masjid Jamae takes visitors from 10 am, so start at the temple around 9:30 am. End at Lim Chee Guan, open daily 9 am to 9 pm, to take bak kwa home.',
    sources: [THIAN_HOCK_KENG, SRI_MARIAMMAN, JAMAE, LIM_CHEE_GUAN],
    story: 'chinatown',
    reviewedAt: '2026-10-29',
  },
  {
    id: 'chinatown-food-walk',
    title: 'Chinatown · A food walk to Lim Chee Guan',
    subtitle: 'Chicken rice, handmade popiah and bak kwa to take home',
    station: 'maxwell',
    duration: 'About 2 hours (estimate)',
    mode: 'walking',
    stops: [
      { key: 'curated:sg-tian-tian-hainanese-chicken-rice', closedWeekdays: [1], closedSource: MICHELIN_TIAN_TIAN },
      { key: 'curated:sg-ann-chin-handmade-popiah' },
      { key: 'curated:sg-lim-chee-guan-new-bridge-road', estimateMinutes: 15 },
    ],
    note:
      'Share small portions so there is room for every stop. Tian Tian is closed on Mondays and opens at 8:30 am. Ann Chin’s hours are not confirmed day by day, so check the stall’s notice. Lim Chee Guan is open daily 9 am to 9 pm.',
    sources: [MICHELIN_TIAN_TIAN, LIM_CHEE_GUAN],
    story: 'chinatown',
    reviewedAt: '2026-10-29',
  },
  {
    id: 'kent-ridge-wall-walk',
    title: 'Kent Ridge · Lunch, two museums and the Berlin Wall',
    subtitle: 'From The Spread to the Wall at University Town',
    station: 'kent-ridge',
    duration: 'About 5 hours (estimate)',
    mode: 'transit',
    stops: [
      { key: 'curated:sg-the-spread-nus', estimateMinutes: 45, closedWeekdays: [0], closedSource: THE_SPREAD },
      { key: 'curated:sg-nus-museum' },
      { key: 'curated:sg-lee-kong-chian-natural-history' },
      { key: 'curated:sg-berlin-wall-fragments-utown', estimateMinutes: 15 },
    ],
    note:
      'Go Tuesday to Saturday: NUS Museum is closed on Sundays and public holidays and takes only booked groups on Mondays. The Spread is closed on Sundays. On Saturdays The Spread closes at 2:30 pm. Reach the Lee Kong Chian museum by 4:30 pm, its last entry. The NUS shuttle stops at Biz 2 for The Spread.',
    sources: [THE_SPREAD, NUS_MUSEUM, LKCNHM],
    story: 'berlin-wall-fragments',
    reviewedAt: '2026-10-29',
  },
];

export function teamRoute(id: string): TeamRoute | undefined {
  return teamRoutes.find((r) => r.id === id);
}

/** Team routes that stop at this Nearby place. */
export function teamRoutesWithPlace(key: string): TeamRoute[] {
  return teamRoutes.filter((r) => r.stops.some((s) => s.key === key));
}

/** Team routes of a place story (`/place/:placeId`). */
export function teamRoutesOfStory(placeId: string): TeamRoute[] {
  return teamRoutes.filter((r) => r.story === placeId);
}
