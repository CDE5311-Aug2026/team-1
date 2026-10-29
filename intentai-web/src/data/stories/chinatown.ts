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
  next: { title: 'Thian Hock Keng Temple', thumb: STORY_IMAGES.thianHockKeng.src, credit: STORY_IMAGES.thianHockKeng.credit },
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
  next: { title: 'Lunar New Year', thumb: STORY_IMAGES.lanterns.src, credit: STORY_IMAGES.lanterns.credit },
};

/** Festival card: Lunar New Year (Chinatown). */
export const LUNAR_NEW_YEAR = {
  kicker: 'FESTIVAL · CHINATOWN',
  title: ['Lunar', 'New Year'],
  subtitle: 'Chinese · January or February',
  video: {
    title: 'From reunion dinner to day 15',
    duration: 130,
    poster: STORY_IMAGES.lanterns,
    captions: [
      'The Chinese lunar year begins with a new moon.',
      'Families gather for the reunion dinner on the eve.',
      'Visits and feasting carry on for 15 days.',
      'Chinatown’s streets fill with red lanterns.',
    ] as const,
  },
  tiles: [
    { to: 15, label: 'days of visits' },
    { to: 0, format: () => 'Jan–Feb', label: 'day one falls' },
    { to: 0, format: () => '6 Feb', label: 'next, in 2027' },
  ] as const,
  lead: 'The start of the Chinese lunar year, celebrated over 15 days of family visits and feasting.',
  more: [
    'The first day usually falls between 21 January and 20 February. The reunion dinner on New Year’s Eve is the main family gathering of the year.',
    'In the weeks before, Chinatown’s streets fill with lanterns and a festive street market.',
  ],
  nextTime: {
    label: 'Next Lunar New Year',
    kicker: 'NEXT TIME',
    month: 'FEB',
    day: '6',
    date: 'Sat 6 Feb 2027',
    note: 'Holidays Sat 6 and Sun 7 Feb; Mon 8 Feb is off in lieu.',
    remind: 'Remind me',
    reminded: 'Reminder set for 6 Feb',
  },
  source: 'Source: IntentAI editorial; Singapore 2027 public holidays (MOM) · Photo: Dileep Kaluaratchie · CC BY-SA 4.0',
  next: { title: 'From the 1822 town plan to today', thumb: STORY_IMAGES.plan1822.src, credit: STORY_IMAGES.plan1822.credit },
};

/** History card: from the 1822 town plan to today (Chinatown). */
export const CHINATOWN_HISTORY = {
  kicker: 'HISTORY · CHINATOWN',
  title: ['From the 1822', 'town plan', 'to today'],
  subtitle: '牛车水 Niu Che Shui · “bullock-cart water”',
  video: {
    title: 'How Chinatown began',
    duration: 150,
    poster: STORY_IMAGES.plan1822,
    captions: [
      'In 1822, a town plan set land aside for the Chinese.',
      'It lay west of the Singapore River.',
      'Bullock carts brought water, giving the name Niu Che Shui.',
      'In 1989, its shophouses were protected.',
    ] as const,
  },
  plan: {
    src: STORY_IMAGES.plan1822.src,
    alt: 'The 1822 Plan of the Town of Singapore, with the Chinese Campong on the left bank of the river',
    label: 'Chinese Campong',
    credit: STORY_IMAGES.plan1822.credit,
  },
  planText: 'Raffles’s Town Plan, drawn up by Lt Philip Jackson, set aside the land west of the Singapore River as the Chinese Campong.',
  people: { to: 3317, after: ' people live there, almost a third of the town.' },
  nameText: 'Niu Che Shui means “bullock-cart water”, after the carts that brought water to the area. The Hokkien and Cantonese names mean the same.',
  streetText: 'Each dialect group settled its own streets, with its own temple at the centre.',
  chips: ['Hokkien · Telok Ayer St', 'Cantonese · Temple St', 'Teochew · South Canal Rd'],
  buildings: { to: 1200, after: ' buildings are given conservation status, so the old shophouses stay.' },
  todayText: 'The Chinatown Heritage Centre opens in three restored shophouses on Pagoda Street.',
  today: { src: STORY_IMAGES.pagodaStreet.src, alt: 'Pagoda Street today, busy with visitors between shophouses', credit: STORY_IMAGES.pagodaStreet.credit },
  source: 'Source: Singapore Infopedia (NLB), “Chinatown”',
  collect: {
    title: 'That’s all 4 Chinatown cards',
    before: 'Check in nearby to add Chinatown to your passport.',
    after: 'Chinatown is in your passport in Moments.',
  },
};
