// What the Help Center knows about the app. The same text briefs Claude on the server (server/help/handler.ts) and
// answers on the device when the server has no key: each topic has words it matches and a short answer.
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
    words: ['what', 'start', 'begin', 'how to use', 'about', 'app', 'new', 'first'],
    a: 'FindSG turns walks around Singapore into stories. Home suggests places near you, Hunt has story hunts you play on real streets, Moments keeps your journal and stamps, and Passport holds your rank and settings. Tap the tabs at the bottom to move between them.',
  },
  {
    id: 'checkin',
    q: 'How do I check in at a place?',
    words: ['check in', 'check-in', 'checkin', 'visit', 'been', 'stamp a place', '打卡'],
    a: 'Open any place (from Home or the map) and tap Check in. It takes one tap and is dated today. The visit shows in your Moments journal, and the area it is in gets closer to its passport stamp.',
    path: '/',
  },
  {
    id: 'hunt',
    q: 'How do story hunts work?',
    words: ['hunt', 'story', 'stories', 'game', 'play', 'route', 'stop', 'puzzle', 'clue', '3d', 'model'],
    a: 'In Hunt, take a story book from the shelf and start a route. At each stop, walk to the real place and check in, spot the detail on the building, then use it to solve the 3D model. Each find goes into your clue bag and the story moves on. The places and history are real; the characters are fiction.',
    path: '/hunt',
  },
  {
    id: 'public',
    q: 'What is the Public tab in Hunt?',
    words: ['public', 'challenge', 'community', 'board', 'leaderboard', 'speed', 'rank list'],
    a: 'Hunt › Public has community challenges and the boards. The Explore board counts places discovered and the Speed board times story runs. Open a challenge to jump straight into its story.',
    path: '/hunt?tab=public',
  },
  {
    id: 'stamps',
    q: 'How do I earn passport stamps?',
    words: ['stamp', 'stamps', 'passport', 'area', 'planning area', 'collect', 'ura'],
    a: 'Each of Singapore’s planning areas has a stamp. Check in at places in an area and finish its stories to fill it in. You can see every stamp and how close you are in Moments, under Passport.',
    path: '/moments',
  },
  {
    id: 'share',
    q: 'How do I share my day?',
    words: ['share', 'export', 'wechat', 'instagram', 'x', 'twitter', 'post', 'travelogue', 'nine', '9', 'grid'],
    a: 'In Moments, tap the red share seal next to a day (or tap its photo stack). Pick WeChat, Instagram or X, choose the photos and a tone for the caption, then tap Share. The pictures go to your phone’s share sheet and the caption is copied, so you can paste it in the app.',
    path: '/moments',
  },
  {
    id: 'photos',
    q: 'How do I add my own photos?',
    words: ['photo', 'photos', 'camera', 'picture', 'snap', 'upload', 'image'],
    a: 'In Moments, use the camera button to take a photo or the picture button to add one from your library. To file a photo under a place, open that place’s card in the day and tap its camera. Your photos come first when you share the day.',
    path: '/moments',
  },
  {
    id: 'explore',
    q: 'How do I find places near me?',
    words: ['find', 'near', 'nearby', 'near me', 'map', 'search', 'explore', 'places', 'where', 'hawker', 'go'],
    a: 'On Home, tap a region on the map card to see its planning areas, then an area to see its places. The buttons under the map find you, search, and show Editor’s picks. Allow location to sort places by distance, or just pick an area.',
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
    id: 'journal',
    q: 'How do I edit my journal?',
    words: ['journal', 'edit', 'change', 'move', 'caption', 'wrong day', 'time', 'date', 'remove photo', 'day map', 'numbers'],
    a: 'Each day in Moments has a map with the places you went, numbered in order. Tap a number, a card or a print and the other two show the same place. Open a place’s card to add your photo of it. Tap one of your photos to change its caption, day, time or place, replace the picture, or remove it.',
    path: '/moments',
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
    words: ['privacy', 'location', 'data', 'track', 'gps', 'delete', 'personal', 'safe'],
    a: 'Check-ins are self-reported with a tap, and your journal stays on this phone. Passport › Settings › Privacy lets you turn sharing options off and clear what the app has saved.',
    path: '/my-space/privacy',
  },
  {
    id: 'settings',
    q: 'How do I change text size or motion?',
    words: ['setting', 'settings', 'text size', 'font', 'bigger', 'motion', 'animation', 'reduce'],
    a: 'Open Settings with the gear at the top right of any tab. You can change the text size and turn on Reduce motion there.',
    path: '/my-space/settings',
  },
];

/** The brief Claude gets: what the app is, its tabs and the topics above. */
export const APP_GUIDE =
  'FindSG is a mobile web app for exploring Singapore. Bottom tabs: Home (places to discover nearby and today’s suggestions), ' +
  'Moments (a journal of each day with photos, passport stamps for URA planning areas, collected cards and phrases, a recap, ' +
  'and sharing a day as a travelogue to WeChat, Instagram or X), Hunt (story hunts on real streets: Stories and Public), and ' +
  'Passport (profile, rank, settings, privacy, notices). Every tab has Settings (gear, top right) and this Help Center (top left).\n\n' +
  TOPICS.map((t) => `Q: ${t.q}\nA: ${t.a}`).join('\n\n');

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' -]+/gu, ' ');

/** The topic that best fits a question, or null. A phrase match counts more than a single word. */
/** Version A of the user test has no Hunt: its topics go, and the overview leaves it out. */
export function topicsFor(version: 'A' | 'B'): HelpTopic[] {
  if (version === 'B') return TOPICS;
  return TOPICS.filter((t) => !t.path?.startsWith('/hunt')).map((t) =>
    t.id === 'start'
      ? {
          ...t,
          a: 'FindSG helps you explore Singapore. Home suggests places near you on the map, Moments keeps your journal and stamps, and Passport holds your rank and settings. Tap the tabs at the bottom to move between them.',
        }
      : t,
  );
}

export function matchTopic(question: string, topics: HelpTopic[] = TOPICS): HelpTopic | null {
  const text = ` ${norm(question)} `;
  let best: HelpTopic | null = null;
  let score = 0;
  for (const t of topics) {
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
