// The community card kit (scripts/community/import-kit.py → kit.json + src/assets/community/kit/): 200 fictional
// members with photo-style portraits, 200 questions with covers, 954 replies, 41 notifications. All AI-made demo
// content (the kit says so); Settings › Terms & licences says the community is illustrative.
import kitJson from './kit.json';

interface KitPerson {
  id: string;
  name: string;
  handle: string;
  bio: string;
  homeBase: string | null;
  languages: string[];
  interests: string[];
  boards: string[];
  sheet: number;
  col: number;
  row: number;
}
export interface KitQuestion {
  id: string;
  author: string;
  board: string;
  title: string;
  body: string;
  tags: string[];
  cover?: string;
  coverAlt?: string | null;
  ago: number;
  closed: boolean;
  mine: boolean;
  place?: string | null;
}
export interface KitReply {
  id: string;
  q: string;
  parent: string | null;
  author: string;
  text: string;
  likes: number;
  ago: number;
  byAsker: boolean;
  mine: boolean;
  seq: number;
}
interface KitNotification {
  id: string;
  kind: 'reply' | 'comment' | 'mention';
  actor: string;
  q: string;
  reply: string;
  action: string;
  ago: number;
}
interface Kit {
  currentUser: string;
  people: KitPerson[];
  boards: { id: string; name: string; description: string }[];
  questions: KitQuestion[];
  replies: KitReply[];
  notifications: KitNotification[];
  feeds: { top: string[]; forYou: string[] };
  covers: Record<string, { file: string; alt: string; generated: boolean }>;
}

export const KIT = kitJson as unknown as Kit;

const files = import.meta.glob('../../assets/community/kit/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const asset = (file: string) => files[`../../assets/community/kit/${file}`];

/** The kit's demo user ("Jamie") is the app's "You". */
const byId = new Map(KIT.people.map((p) => [p.id, p]));
export const kitName = (id: string) => (id === KIT.currentUser ? 'You' : (byId.get(id)?.name ?? 'A local'));

const byName = new Map(KIT.people.filter((p) => p.id !== KIT.currentUser).map((p) => [p.name, p]));
export function kitPerson(name: string): KitPerson | undefined {
  return byName.get(name);
}

/** CSS for one portrait cell (6 × 6 sheets). */
export function kitAvatarStyle(person: KitPerson): { backgroundImage: string; backgroundSize: string; backgroundPosition: string } {
  return {
    backgroundImage: `url("${asset(`portraits-${person.sheet + 1}.jpg`)}")`,
    backgroundSize: '600% 600%',
    backgroundPosition: `${person.col * 20}% ${person.row * 20}%`,
  };
}

export function kitCover(id: string | undefined): { src: string; alt: string } | undefined {
  const c = id ? KIT.covers[id] : undefined;
  const src = c && asset(c.file);
  return c && src ? { src, alt: c.alt } : undefined;
}

/** The kit's two map places → Nearby areas. */
export const KIT_PLACE_AREAS: Readonly<Record<string, string>> = { chinatown: 'sg-chinatown', utown: 'sg-clementi' };

/** Kit home bases (cities) → a Nearby area where it is in Singapore. */
export const kitHome = (name: string) => kitPerson(name)?.homeBase ?? undefined;
