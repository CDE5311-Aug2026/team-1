import { STORY_IMAGES, type StoryImage } from '../../assets/stories';
import type { TimelineRow } from '../../components/story/Timeline';

/** One photo of The Spread's carousel. `group` indexes `SPREAD.groups`. */
export interface SpreadSlide {
  group: number;
  image: StoryImage;
  title: string;
  desc: string;
}

/** Food card: The Spread (Berlin Wall Fragments). */
export const SPREAD = {
  kicker: 'FOOD · POPULAR ON CAMPUS',
  title: ['Lunch near the Wall:', 'The Spread'],
  subtitle: 'Café bistro · NUS Business School',
  carouselLabel: 'Photos of The Spread',
  groups: ['The space', 'Coffee', 'Food'],
  slides: [
    {
      group: 0,
      image: STORY_IMAGES.spreadWindow,
      title: 'Window seats',
      desc: 'Window seats with plenty of daylight, for a slower lunch.',
    },
    {
      group: 0,
      image: STORY_IMAGES.spreadTable,
      title: 'The common table',
      desc: 'A long shared table under pendant lamps, good for a group lunch after the panels.',
    },
    {
      group: 1,
      image: STORY_IMAGES.spreadEspresso,
      title: 'The espresso bar',
      desc: 'Coffee is pulled to order at the counter.',
    },
    {
      group: 1,
      image: STORY_IMAGES.spreadIcedCoffee,
      title: 'Iced coffee and a muffin',
      desc: 'An easy pairing for a break between classes.',
    },
    {
      group: 2,
      image: STORY_IMAGES.spreadSpaghetti,
      title: 'Spaghetti with mushrooms',
      desc: 'Pasta is a menu staple, served in wide bowls.',
    },
    {
      group: 2,
      image: STORY_IMAGES.spreadPenne,
      title: 'Penne',
      desc: 'Hearty plates in the café’s comfort-food style.',
    },
    {
      group: 2,
      image: STORY_IMAGES.spreadMuffins,
      title: 'From the bake counter',
      desc: 'Muffins such as banana speculoos, labelled by hand at the counter.',
    },
  ] as readonly SpreadSlide[],
  lead: 'Since no dish is tied to the Wall itself, this card recommends a café nearby that NUS students and staff favour for lunch.',
  more: [
    'The Spread sits in the Mochtar Riady Building at NUS Business School, about 1.5 km from the panels. Its own promise is “comfort food done right, at honest prices.”',
    'Expect pasta, salads and rice bowls, bakes from the counter and coffee from the espresso bar.',
  ],
  route: { from: 'Tembusu College', to: 'The Spread', km: 1.5 },
  visit: {
    openNow: 'Open today until 2:30 pm',
    addressLine: '15 Kent Ridge Dr, #01-03',
    addressRest: 'Mochtar Riady Building, Singapore 119245',
    hours: [
      { days: 'Mon–Fri', time: '8:00 am – 6:30 pm', today: false },
      { days: 'Sat · today', time: '8:00 am – 2:30 pm', today: true },
      { days: 'Sun & public holidays', time: 'Closed', today: false },
    ],
    phone: { text: '+65 6908 5955', href: 'tel:+6569085955' },
  },
  source: 'Source: thespread.sg (hours, address); NUS Business School · Photos: The Spread',
  next: { title: 'The Wall panels', thumb: STORY_IMAGES.wallPanels.src },
};

/** Monument card: the Wall panels (Berlin Wall Fragments). */
export const WALL_PANELS = {
  kicker: 'MONUMENT · BERLIN WALL FRAGMENTS',
  title: ['Two slabs of the', 'Berlin Wall, in a', 'UTown garden'],
  video: {
    title: 'The panels up close',
    duration: 108,
    poster: STORY_IMAGES.wallPanels,
    captions: [
      'Behind Tembusu College stand two panels of the Berlin Wall.',
      'Each one is about 3.6 metres tall.',
      'They marked 50 years of German–Singapore ties.',
      'The graffiti was on the western face.',
    ] as const,
  },
  tiles: [
    { to: 3.6, decimals: 1, unit: 'm', label: 'tall' },
    { to: 4, prefix: '~', unit: 't', label: 'each' },
    { from: 1961, to: 2016, label: 'unveiled' },
  ] as const,
  lead: 'Behind Tembusu College stand two concrete panels from the Berlin Wall. Each is about 3.6 metres tall and weighs around four tonnes.',
  more: [
    'German businessman Elmar Prost and his company gave them to Singapore’s Ministry of Foreign Affairs to mark 50 years of diplomatic ties. They were unveiled here on 18 October 2016 and are on loan to NUS.',
    'Look at the paint. Graffiti covered the Wall’s western face, which West Berliners could walk right up to. The eastern side faced a guarded border strip.',
  ],
  source: 'Source: Tembusu College, NUS',
  next: { title: 'Fall of the Wall · 9 Nov', thumb: STORY_IMAGES.balloons2014.src },
};

/** Festival card: the fall of the Wall, 9 November (Berlin Wall Fragments). */
export const FALL_OF_THE_WALL = {
  kicker: 'FESTIVAL · MON 9 NOV',
  title: ['Fall of the Wall:', 'the night the', 'border opened'],
  video: {
    title: 'How Berlin marks 9 November',
    duration: 125,
    poster: STORY_IMAGES.balloons2014,
    captions: [
      'On 9 November 1989, the travel rules changed by surprise.',
      'Crowds rushed to the crossings that night.',
      'At Bornholmer Straße, the guards raised the barrier.',
      'In 2014, 8,000 lit balloons traced the Wall’s route.',
    ] as const,
  },
  tiles: [
    { from: 1961, to: 1989, label: 'the Wall opened' },
    { to: 20000, prefix: '~', format: (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)), label: 'crossed in an hour' },
    { to: 37, label: 'years on Mon' },
  ] as const,
  lead: 'On the evening of 9 November 1989, East German official Günter Schabowski announced new travel rules at a press conference, before they were meant to start.',
  more: [
    'Crowds rushed to the crossings. At Bornholmer Straße, guards raised the barrier late that night, and about 20,000 people crossed in the next hour.',
    'Germany’s national holiday is Unity Day on 3 October; 9 November is a day of remembrance. For the 25th anniversary in 2014, 8,000 lit balloons traced 15 km of the Wall’s old route.',
  ],
  source: 'Source: berlin.de · Photo: Daderot · CC0',
  next: { title: 'From 1961 to a Singapore garden', thumb: STORY_IMAGES.wall1989.src },
};

/** History card: 1961 to 2016 (Berlin Wall Fragments). */
export const WALL_HISTORY = {
  kicker: 'HISTORY · BERLIN WALL FRAGMENTS',
  title: ['From 1961 to a', 'Singapore garden'],
  video: {
    title: 'How the Wall rose and fell',
    duration: 160,
    poster: STORY_IMAGES.wall1989,
    captions: [
      'In August 1961, East Germany began building the Wall.',
      'For 28 years, it split Berlin in two.',
      'On 9 November 1989, the crossings opened.',
      'In 2016, two panels came to Tembusu College.',
    ] as const,
  },
  timeline: [
    { date: '1961 · 13 AUG', text: 'East Germany begins building the Wall around West Berlin. It stands for 28 years.', dot: 'ring', delay: 0.5, dotDelay: 0.6 },
    {
      date: '1989 · 9 NOV',
      text: 'The crossings open. Berliners climb onto the Wall at the Brandenburg Gate.',
      dot: 'fill',
      delay: 0.75,
      dotDelay: 0.9,
      image: { src: STORY_IMAGES.wall1989.src, alt: 'Crowds on the Wall in front of the Brandenburg Gate, 1989', credit: STORY_IMAGES.wall1989.credit },
    },
    { date: '1990 · 3 OCT', text: 'Germany is reunified. The Wall comes down, and pieces go to places around the world.', dot: 'ring', delay: 1, dotDelay: 1.15 },
    {
      date: '2016 · 18 OCT',
      text: 'Two panels are unveiled behind Tembusu College, NUS. You are here.',
      dot: 'here',
      delay: 1.25,
      dotDelay: 1.4,
      thumb: { src: STORY_IMAGES.wallPanels.src, alt: 'The two panels at Tembusu College' },
    },
  ] as readonly TimelineRow[],
  source: 'Source: berlin.de; Tembusu College, NUS',
  collect: {
    title: 'That’s all 4 cards here',
    before: 'Check in at the panels to add this place to your passport.',
    after: 'Berlin Wall Fragments is in your passport in Moments.',
  },
};
