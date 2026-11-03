// The demo community's members: who asks, who answers, where they hang out. Fictional people for the demo build
// (owner decision 2026-10-29: Community should look like a product in testing with active users). Avatars are
// DiceBear "Notionists" by Zoish, CC0 1.0 (generated once and bundled; no network call).
const avatarFiles = import.meta.glob('../../assets/community/avatars/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

function avatarOf(id: string): string | undefined {
  return avatarFiles[`../../assets/community/avatars/${id}.svg`];
}

export type MemberRole = 'local' | 'newcomer';

export interface Member {
  id: string;
  /** Shown everywhere: a first name and family initial, as people sign in a community. */
  name: string;
  role: MemberRole;
  /** One line under the name, e.g. "Local · grew up in Katong". */
  line: string;
  /** Nearby area (area level only, never a point). */
  areaId: string;
  languages: string[];
  /** Community activity shown on the profile. */
  answers: number;
  helpful: number;
  /** "Member since" month, YYYY-MM. */
  since: string;
  avatar?: string;
}

const m = (member: Omit<Member, 'avatar'>): Member => ({ ...member, avatar: avatarOf(member.id) });

export const MEMBERS: readonly Member[] = [
  // locals who answer
  m({ id: 'mel', name: 'Mel T.', role: 'local', line: 'Local · NUS, lives near Kent Ridge', areaId: 'sg-clementi', languages: ['English', 'Singlish', 'Mandarin'], answers: 142, helpful: 389, since: '2026-03' }),
  m({ id: 'jun', name: 'Jun Wei L.', role: 'local', line: 'Local · family on both sides of the Causeway', areaId: 'sg-katong', languages: ['English', 'Mandarin', 'Malay'], answers: 87, helpful: 241, since: '2026-04' }),
  m({ id: 'xiaolin', name: '小林', role: 'local', line: '本地人 · 在牛车水长大', areaId: 'sg-chinatown', languages: ['中文', 'English', 'Hokkien'], answers: 118, helpful: 302, since: '2026-03' }),
  m({ id: 'liv', name: 'Liv N.', role: 'local', line: 'Local · organises a lot of group lunches', areaId: 'sg-little-india', languages: ['English', 'Singlish'], answers: 64, helpful: 170, since: '2026-05' }),
  m({ id: 'jo', name: 'Jo G.', role: 'local', line: 'Local · Bukit Timah, kopitiam regular', areaId: 'sg-bukit-timah', languages: ['English', 'Cantonese'], answers: 95, helpful: 233, since: '2026-04' }),
  m({ id: 'nina', name: 'Nina R.', role: 'local', line: 'Local · works in Kampong Glam', areaId: 'sg-kampong-glam', languages: ['English', 'Malay'], answers: 51, helpful: 138, since: '2026-06' }),
  m({ id: 'ari', name: 'Ari P.', role: 'local', line: 'Local · project manager, likes clear briefs', areaId: 'sg-little-india', languages: ['English', 'Tamil'], answers: 73, helpful: 196, since: '2026-05' }),
  m({ id: 'ning', name: '宁', role: 'local', line: '本地人 · 大巴窑', areaId: 'sg-toa-payoh', languages: ['中文', 'English'], answers: 46, helpful: 121, since: '2026-06' }),
  m({ id: 'ash', name: 'Ash K.', role: 'local', line: 'Local · engineer in Jurong', areaId: 'sg-jurong', languages: ['English', 'Tamil', 'Singlish'], answers: 39, helpful: 97, since: '2026-07' }),
  m({ id: 'hafiz', name: 'Hafiz I.', role: 'local', line: 'Local · Bedok born and bred', areaId: 'sg-bedok', languages: ['English', 'Malay'], answers: 58, helpful: 149, since: '2026-05' }),
  m({ id: 'aisyah', name: 'Aisyah N.', role: 'local', line: 'Local · Hari Raya host every year', areaId: 'sg-kampong-glam', languages: ['English', 'Malay', 'Arabic'], answers: 66, helpful: 182, since: '2026-04' }),
  m({ id: 'marcus', name: 'Marcus L.', role: 'local', line: 'Local · hawker food walks on weekends', areaId: 'sg-ang-mo-kio', languages: ['English', 'Mandarin', 'Hokkien'], answers: 104, helpful: 276, since: '2026-03' }),
  m({ id: 'priya', name: 'Priya R.', role: 'local', line: 'Local · Deepavali light-up volunteer', areaId: 'sg-little-india', languages: ['English', 'Tamil', 'Hindi'], answers: 77, helpful: 214, since: '2026-04' }),
  m({ id: 'wei', name: 'Wei T.', role: 'local', line: 'Local · 40 years in Chinatown', areaId: 'sg-chinatown', languages: ['Mandarin', 'Hokkien', 'English'], answers: 129, helpful: 361, since: '2026-03' }),
  m({ id: 'siti', name: 'Siti A.', role: 'local', line: 'Local · teacher in Tampines', areaId: 'sg-tampines', languages: ['English', 'Malay'], answers: 42, helpful: 110, since: '2026-07' }),
  m({ id: 'daniel', name: 'Daniel C.', role: 'local', line: 'Local · Orchard retail, knows the malls', areaId: 'sg-orchard', languages: ['English', 'Mandarin'], answers: 35, helpful: 88, since: '2026-08' }),
  // newcomers who ask
  m({ id: 'mira', name: 'Mira O.', role: 'newcomer', line: 'From Lagos · 3 months in SG', areaId: 'sg-clementi', languages: ['English', 'Yoruba'], answers: 4, helpful: 9, since: '2026-08' }),
  m({ id: 'eli', name: 'Eli M.', role: 'newcomer', line: 'From Lyon · exchange student', areaId: 'sg-clementi', languages: ['French', 'English'], answers: 2, helpful: 5, since: '2026-08' }),
  m({ id: 'sam', name: 'Sam P.', role: 'newcomer', line: 'From Seoul · new job in the CBD', areaId: 'sg-marina-bay', languages: ['Korean', 'English'], answers: 6, helpful: 14, since: '2026-07' }),
  m({ id: 'anan', name: '安安', role: 'newcomer', line: '来自成都 · 来新加坡半年', areaId: 'sg-queenstown', languages: ['中文', 'English'], answers: 9, helpful: 22, since: '2026-06' }),
  m({ id: 'rae', name: 'Rae S.', role: 'newcomer', line: 'From Manila · learning Mandarin', areaId: 'sg-toa-payoh', languages: ['Filipino', 'English'], answers: 3, helpful: 7, since: '2026-08' }),
  m({ id: 'xiaohe', name: '小禾', role: 'newcomer', line: '来自杭州 · 读研究生', areaId: 'sg-clementi', languages: ['中文', 'English'], answers: 5, helpful: 11, since: '2026-07' }),
  m({ id: 'alex', name: 'Alex M.', role: 'newcomer', line: 'From Munich · moved for work', areaId: 'sg-katong', languages: ['German', 'English'], answers: 1, helpful: 3, since: '2026-09' }),
  m({ id: 'leah', name: 'Leah C.', role: 'newcomer', line: 'From Melbourne · partner is Malaysian', areaId: 'sg-bukit-timah', languages: ['English'], answers: 7, helpful: 16, since: '2026-06' }),
  m({ id: 'dee', name: 'Dee S.', role: 'newcomer', line: 'From Delhi · 1 year in SG', areaId: 'sg-tampines', languages: ['Hindi', 'English'], answers: 11, helpful: 26, since: '2026-05' }),
  m({ id: 'kai', name: 'Kai T.', role: 'newcomer', line: 'From Osaka · NUS exchange', areaId: 'sg-clementi', languages: ['Japanese', 'English'], answers: 3, helpful: 8, since: '2026-08' }),
  m({ id: 'theo', name: 'Theo B.', role: 'newcomer', line: 'From London · 2 months in SG', areaId: 'sg-little-india', languages: ['English'], answers: 1, helpful: 2, since: '2026-09' }),
  m({ id: 'ren', name: 'Ren I.', role: 'newcomer', line: 'From Tokyo · intern in Chinatown', areaId: 'sg-chinatown', languages: ['Japanese', 'English'], answers: 2, helpful: 6, since: '2026-09' }),
];

/** Short names map to nobody here: the community card kit has its own members with those names (Mel, Kai, …). */
const ALIASES: Record<string, string> = {};

export function memberById(id: string): Member | undefined {
  return MEMBERS.find((x) => x.id === id);
}

/** The member behind a display name (or an old short name); undefined for "You" and "A local". */
export function memberByName(name: string): Member | undefined {
  return MEMBERS.find((x) => x.name === name) ?? (ALIASES[name] ? memberById(ALIASES[name]) : undefined);
}

/** The local who answers a question of mine in the demo community: the same member for the same question. */
export function answererFor(questionId: string, answeredBy?: string): string {
  if (answeredBy && answeredBy !== 'A local') return answeredBy;
  const locals = MEMBERS.filter((x) => x.role === 'local');
  let h = 0;
  for (const ch of questionId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return locals[h % locals.length].name;
}

/** Display name for a member id (data files refer to members by id). */
export const nameOf = (id: string): string => memberById(id)?.name ?? id;

/** Headline numbers for the demo community (shown on Community home). */
export const COMMUNITY_STATS = { members: 2418, localsOnline: 37, answeredThisWeek: 186 } as const;

/** "Member since Mar 2026". */
export function sinceLabel(since: string): string {
  const [y, mo] = since.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(mo || 1) - 1]} ${y}`;
}
