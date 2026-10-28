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
