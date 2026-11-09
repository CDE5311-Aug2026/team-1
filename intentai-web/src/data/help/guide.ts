// What the Help Centre knows about the app. The same text briefs Claude on the server (server/help/handler.ts) and
// answers on the device when the server has no key: each topic has words it matches and a short answer.
// Redesign v2: tabs Home · Hunt · Passport, plus Search; the journal and stamps live in Passport; places are sorted into
// the four Tourism 2040 categories (Attractions, Wellness, Leisure, Cruise). Answers only promise what the app does.
// Keep this file free of imports so the server can load it as is.

export interface HelpTopic {
  id: string;
  /** The question as a starter chip. */
  q: string;
  /** Words and phrases that point to this topic (lower case). */
  words: string[];
  a: string;
  /** Where the answer happens in the app, for the "Take me there" link. */
  path?: string;
}

export const TOPICS: HelpTopic[] = [
  {
    id: 'start',
    q: 'What can I do in FindSG?',
    words: ['what', 'start', 'begin', 'how to use', 'about', 'app', 'new', 'first', 'tabs'],
    a: 'FindSG turns walks around Singapore into stories. Home suggests places in the categories you picked, Hunt has story hunts and challenges you play on real streets, and Passport keeps your journal, stamps and profile. Search finds places, challenges and volumes. Tap the tabs at the bottom to move between them.',
  },
  {
    id: 'categories',
    q: 'What are the four categories?',
    words: ['category', 'categories', 'attractions', 'wellness', 'leisure', 'cruise', 'tourism 2040', 'filter', 'chips', 'rank'],
    a: 'Places are sorted into four categories that follow the Singapore Tourism Board’s Tourism 2040 factsheet: Attractions, Wellness, Leisure and Cruise. The chips at the top of Home filter by them. To change which comes first, open Settings › Categories and tap them in your order, then Save.',
    path: '/my-space/settings',
  },
  {
    id: 'checkin',
    q: 'How do I stamp a place?',
    words: ['check in', 'check-in', 'checkin', 'visit', 'been', 'stamp a place', 'stamp', '打卡'],
    a: 'Open a place from Home, Search or the map and use its check-in button. It takes one tap and is dated today. The visit goes into your journal on Passport, and the area it is in moves closer to its passport stamp. Places marked coming soon cannot be stamped yet.',
    path: '/',
  },
  {
    id: 'hunt',
    q: 'How do story hunts work?',
    words: ['hunt', 'story', 'stories', 'game', 'play', 'route', 'stop', 'clue', 'photo', 'camera', 'medal', 'medals', 'remote', 'remotely', 'volume'],
    a: 'In Hunt, swipe through the public hunts at the top or pick any hunt in the list to open it. Read its opening and tap Start the hunt. At each stop, walk to the real place and tap Take photo: photograph the detail the stop asks for. When AI recognises it, the stop is passed, you get its clue and the next stop opens. If the photo is not recognised, take another. There is no remote play: every stop is passed on site with a photo. Finished hunts earn medals, on the Medals page (from Hunt or Passport). The places and history are real; the characters are fiction.',
    path: '/hunt',
  },
  {
    id: 'public',
    q: 'How do public hunts work?',
    words: ['public', 'together', 'challenge', 'challenges', 'community', 'board', 'leaderboard', 'hunters', 'others'],
    a: 'With Public hunts on, Hunt and Home show leaderboards and open challenges, and Passport shows the leaderboard. The hunter names and counts in this test build are examples, and nothing about you or your location is sent. Turn it on or off in Settings › Public hunts.',
    path: '/my-space/settings',
  },
  {
    id: 'solo',
    q: 'Can I hunt solo?',
    words: ['solo', 'alone', 'on my own', 'by myself', 'private', 'without others', 'turn off public'],
    a: 'Yes. Turn off Public hunts in Settings and the leaderboards are hidden. Stories and challenges are still there to play on your own, and your hunt region stays as you set it.',
    path: '/my-space/settings',
  },
  {
    id: 'region',
    q: 'How do I change my hunt region?',
    words: ['region', 'central', 'east', 'west', 'north', 'north-east', 'hunt region', 'area'],
    a: 'Open Settings › Hunt region, tap a region on the map or its chip, then Save. Cancel leaves it as it was.',
    path: '/my-space/settings',
  },
  {
    id: 'stamps',
    q: 'How do I earn passport stamps?',
    words: ['stamps', 'passport', 'planning area', 'collect', 'ura'],
    a: 'Each of Singapore’s planning areas has a stamp. Check in at places in an area and finish its stories to fill it in. Your stamps and how close you are to the next one are on the Passport tab.',
    path: '/my-space',
  },
  {
    id: 'journal',
    q: 'Where is my journal?',
    words: ['journal', 'moments', 'day', 'days', 'diary', 'history', 'edit', 'caption', 'wrong day'],
    a: 'Your journal is on the Passport tab: each day lists the places you checked in at, with any photos you added. It stays on this phone; Privacy & data shows how much it takes and can clear it.',
    path: '/my-space',
  },
  {
    id: 'share',
    q: 'How do I share my day?',
    words: ['share', 'wechat', 'instagram', 'x', 'twitter', 'post', 'travelogue', 'nine', '9', 'grid'],
    a: 'In your journal, tap the red share seal next to a day (or tap its photo stack). Pick WeChat, Instagram or X, choose the photos and a tone for the caption, then tap Share. The pictures go to your phone’s share sheet and the caption is copied, so you can paste it in the app.',
    path: '/moments',
  },
  {
    id: 'photos',
    q: 'How do I add my own photos?',
    words: ['photo', 'photos', 'camera', 'picture', 'snap', 'upload', 'image'],
    a: 'In your journal, use the camera button to take a photo or the picture button to add one from your library. To file a photo under a place, open that place’s card in the day and tap its camera. Your photos come first when you share the day.',
    path: '/moments',
  },
  {
    id: 'search',
    q: 'How do I search?',
    words: ['search', 'look up', 'find a place', 'recent', 'name'],
    a: 'Tap Search in the tab bar and type a place, challenge or volume. Results are grouped by category. Your recent searches are kept on this phone, and you can clear them in Settings › Privacy & data.',
    path: '/search',
  },
  {
    id: 'explore',
    q: 'How do I find places near me?',
    words: ['near', 'nearby', 'near me', 'map', 'explore', 'places', 'where', 'hawker', 'go'],
    a: 'Home shows places in your categories first. Press My location on Home’s map to see what is near you, within 2 km, or set a home base in Settings.',
    path: '/',
  },
  {
    id: 'puzzle',
    q: 'How do I solve a story puzzle?',
    words: ['solve', 'puzzle', 'model', 'turn', 'rotate', 'drag', 'pinch', 'stuck', 'lock', 'jigsaw', 'layer', 'wheel'],
    a: 'At a stop, check in first and the model wakes up. Drag to turn it and pinch to zoom. When you come near a part you can use, a small mark on it says what to do. Some stops have two or three layers that open in order. Stuck? Open the clue bag and read the stop’s card: the numbers in the locks come from it.',
    path: '/hunt',
  },
  {
    id: 'race',
    q: 'How do I drive in the night race?',
    words: ['race', 'f1', 'drive', 'car', 'brake', 'throttle', 'pedal', 'pedals', 'steer', 'camera view', 'reverse'],
    a: 'Drag the pad on the left to steer. Both pedals sit under your right thumb: slide between brake and throttle, and press lower on a pedal to press harder. Hold the brake to stay stopped; let go and press again to reverse. The round camera button switches between cockpit, T-cam and chase.',
    path: '/hunt',
  },
  {
    id: 'trouble',
    q: 'Something isn’t loading. What can I do?',
    words: ['loading', 'load', 'broken', 'error', 'blank', 'not working', 'offline', 'internet', 'slow', 'crash', 'white', 'saved', 'lost'],
    a: 'Maps, 3D views and films need a connection; a note at the top says when you are offline, and they come back when you are online. If a 3D view stalls, tap Try again. If a page breaks, tap Try again or Back to Home: your journal and progress are kept. In a private window nothing is saved, so use a normal one. Still stuck? Tell the team in the Feedback tab.',
  },
  {
    id: 'rank',
    q: 'How does my rank go up?',
    words: ['rank', 'level', 'progress', 'points', 'xp'],
    a: 'Your rank grows as you open place cards and use tips on site. You can see your rank and the next step on Passport.',
    path: '/my-space',
  },
  {
    id: 'privacy',
    q: 'Is my location or data shared?',
    words: ['privacy', 'location', 'data', 'track', 'gps', 'delete', 'personal', 'safe', 'shared', 'export'],
    a: 'Your journal, stamps and settings stay on this phone, and check-ins are self-reported with a tap. Only anonymous page timings are sent, and you can turn that off; what you type here in the Help Centre is sent to answer you or to reach the team. Settings › Privacy & data shows what is stored, exports a copy and deletes it.',
    path: '/my-space/privacy',
  },
  {
    id: 'settings',
    q: 'How do I change text size or motion?',
    words: ['setting', 'settings', 'text size', 'font', 'bigger', 'larger', 'motion', 'animation', 'reduce', 'captions', 'haptics'],
    a: 'Open Settings with the gear at the top right of any tab. Look & feel › Text size scales the app’s text, and Motion › Reduced turns animations off. The app also follows your phone’s Reduce Motion setting.',
    path: '/my-space/settings',
  },
];

/** The brief Claude gets: what the app is, its tabs and the topics above. */
export const APP_GUIDE =
  'FindSG is a mobile web app for exploring Singapore. Places are sorted into four Tourism 2040 categories: Attractions, Wellness, ' +
  'Leisure and Cruise. Bottom tabs: Home (places in the categories the person ranked, with category chips to filter), Hunt (the public hunts as a ' +
  'swipeable row, then every story hunt with its progress; a hunt is played stop by stop, each stop passed by a photo AI recognises; ' +
  'medals for finished hunts), Passport (the journal of each day, passport stamps for URA planning areas, rank ' +
  'and profile; with Public hunts on, a leaderboard of example hunters), and Search (places, challenges and volumes). Public hunts ' +
  'only change what the app shows: nothing about the person or their location is sent. Every tab has Settings (gear, top right: ' +
  'categories, hunt region, public hunts, language, home base, motion, text size, privacy, terms, photo credits) and this Help ' +
  'Centre (top left).\n\n' +
  TOPICS.map((t) => `Q: ${t.q}\nA: ${t.a}`).join('\n\n');

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' -]+/gu, ' ');

/** The topic that best fits a question, or null. A phrase match counts more than a single word. */
export function matchTopic(question: string): HelpTopic | null {
  const text = ` ${norm(question)} `;
  let best: HelpTopic | null = null;
  let score = 0;
  for (const t of TOPICS) {
    let s = 0;
    for (const w of t.words) if (text.includes(` ${w} `) || (w.length > 4 && text.includes(w))) s += w.includes(' ') ? 3 : 2;
    if (text.includes(norm(t.q).trim())) s += 10;
    if (s > score) {
      score = s;
      best = t;
    }
  }
  return score >= 2 ? best : null;
}
