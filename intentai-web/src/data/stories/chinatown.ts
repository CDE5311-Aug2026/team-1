import { STORY_IMAGES } from '../../assets/stories';

/** Food card: bak kwa (Chinatown). */
export const BAK_KWA = {
  kicker: 'FOOD · CHINATOWN',
  title: ['Bak kwa,', 'Chinatown’s', 'festive queue'],
  subtitle: '肉干 · “dried meat” in Hokkien',
  video: {
    title: 'Grilled over charcoal',
    duration: 100,
    poster: STORY_IMAGES.bakKwa,
    captions: [
      'Bak kwa means “dried meat” in Hokkien.',
      'Pork is marinated with sugar and spices, then dried.',
      'Here it is grilled over charcoal for a smoky edge.',
      'Before Lunar New Year, the queues last for hours.',
    ] as const,
  },
  tiles: [
    { from: 1850, to: 1905, label: 'oldest shop opens' },
    { from: 1850, to: 1938, label: 'Lim Chee Guan starts' },
    { to: 6, format: (n: number) => `${n}h+`, label: 'queues before CNY' },
  ] as const,
  steps: [
    { icon: 'marinate', name: 'Marinate', sub: 'sugar, spices' },
    { icon: 'dry', name: 'Dry', sub: 'in thin sheets' },
    { icon: 'grill', name: 'Grill', sub: 'over charcoal' },
  ] as const,
  lead: 'Bak kwa is a Hokkien delicacy from Fujian. Thin slices of pork are marinated with sugar and spices, dried, then cooked.',
  more: [
    'In Singapore it is grilled over charcoal, which makes it smokier and sweeter than the original. It is the snack of Lunar New Year: given as a gift and offered to guests.',
    'Before the festival, queues at Chinatown’s shops can run for six hours or more, and some shops limit how much you can buy.',
  ],
  nearby: {
    name: 'Lim Chee Guan 林志源',
    address: '203 New Bridge Rd · daily 9 am–9 pm',
    blurb: 'Started in 1938 as a pushcart stall in Chinatown. It still grills the meat as it is sold.',
    chips: ['Since 1938', 'Longest queues in Jan–Feb'],
    tip: {
      label: 'Local tip from Mei: read the full answer in Community',
      initial: 'M',
      name: 'Mei',
      role: '· Chinatown local',
      badge: 'Verified tip',
      quote: '“Come on a weekday soon after the 9 am opening. The line builds from late morning, and in the month before Lunar New Year expect to wait hours.”',
      meta: 'Your question · 2 days ago',
      cta: 'Open in Community',
    },
    mapButton: 'See it on the Nearby map',
  },
  source: 'Source: Singapore Infopedia (NLB); chinatown.sg · Photo: Alpha · CC BY-SA 2.0',
  next: { title: 'Thian Hock Keng Temple', thumb: STORY_IMAGES.thianHockKeng.src },
};

/** Monument card: Thian Hock Keng Temple (Chinatown). */
export const THIAN_HOCK_KENG = {
  kicker: 'MONUMENT · CHINATOWN',
  title: ['Thian Hock Keng,', 'the sailors’', 'temple'],
  subtitle: '天福宫 · Telok Ayer Street · Hokkien',
  video: {
    title: 'A temple once on the sea',
    duration: 115,
    poster: STORY_IMAGES.thianHockKeng,
    captions: [
      'Thian Hock Keng is a Hokkien temple to Mazu.',
      'Mazu is the goddess of the sea.',
      'Sailors gave thanks here after the voyage from China.',
      'Land reclamation later moved the sea away.',
    ] as const,
  },
  tiles: [
    { from: 1800, to: 1839, label: 'building starts' },
    { from: 1800, to: 1842, label: 'temple completed' },
    { from: 1800, to: 1973, label: 'national monument' },
  ] as const,
  thenNow: {
    then: STORY_IMAGES.thianHockKeng1890,
    now: STORY_IMAGES.thianHockKeng2006,
    sliderLabel: 'Compare the temple in 1890 and 2006',
    captions: {
      then: { lead: 'c.1890.', text: ' A rickshaw waits outside the temple on an unpaved Telok Ayer Street.' },
      mid: { lead: 'Same corner, 116 years apart.', text: ' The roofline, ridge dragons and side gate still line up.' },
      now: { lead: '2006.', text: ' The same front, with office blocks now rising behind the roofs.' },
    },
  },
  lead: 'Thian Hock Keng is a Hokkien temple to Mazu, the sea goddess, built from 1839 to 1842 on Telok Ayer Street.',
  more: [
    'It once stood on the shoreline. Sailors arriving from China came here to give thanks for a safe voyage.',
    'The halls were built with traditional joinery, without nails. It was gazetted as a national monument in 1973.',
  ],
  lookFor: [
    { icon: 'roof', text: 'Dragons on the curved roof ridges' },
    { icon: 'joinery', text: 'Timber joinery with no nails' },
  ] as const,
  source:
    'Source: National Heritage Board, Roots.gov.sg · Photos: Zairon, CC BY-SA 4.0; Lambert & Co. c.1890, KITLV, public domain; Terence Ong 2006, CC BY 2.5',
  next: { title: 'Lunar New Year', thumb: STORY_IMAGES.lanterns.src },
};
