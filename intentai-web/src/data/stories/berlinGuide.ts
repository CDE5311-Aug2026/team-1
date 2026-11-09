// Berlin Wall Fragments as one long story page in Home's notebook (9 Nov 2026: "very detailed: video, history
// and an extended explanation", "all in one page", The Spread is the nearby lunch, so it comes last). The four cards
// of the 28 Oct canvas (berlin.ts: WALL_PANELS, WALL_HISTORY, FALL_OF_THE_WALL, SPREAD) keep their copy; this file adds
// the real videos, the longer explanation, the extra timeline rows and a URL for every source. Facts checked
// 9 Nov 2026 against the pages listed in BERLIN_SOURCES.
import type { SourceReference } from '../../features/nearby/domain';

const checked = '2026-11-09';
const src = (title: string, url: string, publisher: string): SourceReference => ({ title, url, publisher, checkedAt: checked });

export const BERLIN_SOURCES = {
  tembusu: src('Fragments of the Berlin Wall at Tembusu College', 'https://tembusu.nus.edu.sg/news/2016/fragments-of-the-berlin-wall-at-tembusu-college/', 'Tembusu College, NUS'),
  wallNet: src('Singapore – NUS University Town', 'https://en.the-wall-net.org/singapur-sgp-utown/', 'The Berlin Wall Online'),
  stiftung: src('The Berlin Wall', 'https://www.stiftung-berliner-mauer.de/en/topics/berlin-wall', 'Stiftung Berliner Mauer'),
  chronik: src('Chronicle, November 1989', 'https://www.chronik-der-mauer.de/en/chronicle/_year1989/_month11/', 'Chronik der Mauer'),
  wikiWall: src('Berlin Wall', 'https://en.wikipedia.org/wiki/Berlin_Wall', 'Wikipedia'),
  wikiFall: src('Fall of the Berlin Wall', 'https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall', 'Wikipedia'),
  wikiBornholmer: src('Bornholmer Straße border crossing', 'https://en.wikipedia.org/wiki/Bornholmer_Stra%C3%9Fe_border_crossing', 'Wikipedia'),
  lichtgrenze: src('25th Anniversary of the Fall of the Berlin Wall', 'https://kulturprojekte.berlin/en/projects/25th-anniversary-of-the-fall-of-the-berlin-wall/', 'Kulturprojekte Berlin'),
  spread: src('The Spread', 'https://www.thespread.sg/', 'The Spread'),
  nusNews: src('Berlin Wall in NUS – a gift from Germany', 'https://news.nus.edu.sg/berlin-wall-in-nus---a-gift-from-germany/', 'NUS News'),
  tagesspiegel: src('Mauerpark in Teltow: Die Mauer kommt weg (4 March 2015)', 'https://www.tagesspiegel.de/potsdam/potsdam-mittelmark/die-mauer-kommt-weg-7244095.html', 'Tagesspiegel'),
} as const;

export interface GuideVideo {
  /** YouTube video id (checked with YouTube's oEmbed on 9 Nov 2026: public and embeddable). */
  id: string;
  title: string;
  channel: string;
  /** Length in seconds, from the video's YouTube page (9 Nov 2026). */
  seconds: number;
}

/** A part's longer explanation: a heading and its paragraphs. */
export interface GuideNote {
  heading: string;
  paragraphs: string[];
}

export interface GuideRow {
  date: string;
  text: string;
}

export const BERLIN_GUIDE = {
  parts: [
    { id: 'panels', label: 'The panels' },
    { id: 'history', label: 'History' },
    { id: 'nov9', label: '9 November' },
    { id: 'lunch', label: 'Lunch nearby' },
  ],

  panels: {
    video: { id: '8hXEzGPmT9s', title: 'Unveiling of Berlin Wall panels at NUS', channel: 'The Straits Times', seconds: 19 } satisfies GuideVideo,
    notes: [
      {
        heading: 'What you are looking at',
        paragraphs: [
          'Each panel is 1.2 metres across and 27 centimetres thick, and stands on a base 2.1 metres wide. That is the size of the Wall’s last generation of segments: about 45,000 slabs, each 3.6 metres high and 1.2 metres wide, set up from 1975.',
          'They stand in a garden behind Tembusu College in University Town. No source we found records where in Berlin these two stood.',
        ],
      },
      {
        heading: 'From a yard near Berlin',
        paragraphs: [
          'After the Wall came down, about 170 of its concrete blocks ended up in the yard of a building materials firm in Teltow, just south of Berlin, where they were first used as bins for sand and gravel. Its managing director, Elmar Prost, later had them set out as a small “Mauerpark” and invited the public to paint them, until demand in the 25th-anniversary year, 2014, ended the scheme.',
          'Many of the blocks went abroad. In March 2015 Prost told Berlin’s Tagesspiegel: “We are now preparing a donation to Singapore.”',
        ],
      },
      {
        heading: 'How they came to NUS',
        paragraphs: [
          'Prost and his company, Lagerhaus KW GmbH, gave the two segments to Singapore in 2015, the 50th year of diplomatic ties between Singapore and Germany. They are on loan to NUS through the Ministry of Foreign Affairs.',
          'On 18 October 2016, Foreign Minister Vivian Balakrishnan, German Ambassador Michael Witter and Tembusu College Rector Tommy Koh unveiled them. The same day, about 260 students, Fellows and guests came to a Tembusu Forum, “The Historical Significance of the Cold War”, moderated by Professor Koh with Dr Witter, Professor Ted Hopf and Associate Professor Joey Long.',
        ],
      },
    ] satisfies GuideNote[],
    sources: ['nusNews', 'tembusu', 'wallNet', 'tagesspiegel', 'wikiWall'] as const,
  },

  history: {
    video: { id: 'khXGMcX59YE', title: 'The Berlin Wall – How it worked', channel: 'DW Documentary', seconds: 623 } satisfies GuideVideo,
    notes: [
      {
        heading: 'Why it went up',
        paragraphs: [
          'This is the story of the border these two panels belonged to. Which stretch of it they came from is not recorded.',
          'After 1945, Berlin was split into sectors, and West Berlin became an island of the West inside East Germany. By 1961 about 3.5 million East Germans, around one in five, had left for the West, many of them through Berlin.',
          'On 13 August 1961, East Germany closed the border overnight, first with barbed wire, then with walls a few days later. It called the Wall an “anti-fascist protection rampart”.',
        ],
      },
      {
        heading: 'How the border worked',
        paragraphs: [
          'The border ran for about 155 km around West Berlin, 43.1 km of it through the city itself. Behind the wall that faced the West lay the “death strip”: lit, raked sand, patrols and watchtowers. In the 1970s a second, inner wall was added on the eastern side.',
          'Seven road crossings and one rail crossing linked the two halves. More than 5,000 people escaped. At least 140 people died at the Wall between 1961 and 1989, 91 of them shot by East German border soldiers.',
        ],
      },
    ] satisfies GuideNote[],
    /** Rows added around WALL_HISTORY's four (shown in date order with them). */
    rows: [
      { date: '1975', text: 'The last generation of the Wall begins: about 45,000 concrete slabs, each 3.6 m high and 1.2 m wide, the size of the two panels here.' },
      { date: '1990 · 13 JUN', text: 'Border troops officially start taking the Wall down, at Bernauer Straße. By the end of 1990 most of it is gone.' },
      { date: '2014', text: 'In a yard in Teltow, near Berlin, the public paint leftover Wall segments, until demand in the anniversary year ends the scheme.' },
      { date: '2015', text: 'From that yard, Elmar Prost gives two segments to Singapore for 50 years of German–Singapore ties.' },
    ] satisfies GuideRow[],
    sources: ['stiftung', 'wikiWall', 'tagesspiegel', 'nusNews'] as const,
  },

  nov9: {
    video: { id: 'RIUd5Cc3S6I', title: 'The fall of the Berlin Wall', channel: 'The Guardian', seconds: 356 } satisfies GuideVideo,
    notes: [
      {
        heading: 'The night, hour by hour',
        paragraphs: [
          'At about 6:53 pm on 9 November 1989, live on television, Politburo spokesman Günter Schabowski was asked when the new travel rules began. He answered that, as far as he knew, they applied immediately, without delay.',
          'Crowds gathered at the crossings. At Bornholmer Straße, the officer in charge, Harald Jäger, had no orders to open. By about 11:30 pm the crowd was so large that he raised the barrier, and around 20,000 people crossed the Bösebrücke in the next hour without being checked.',
          'Within hours people stood on the Wall at the Brandenburg Gate, and soon “wall-peckers” were chipping pieces off as souvenirs. The Brandenburg Gate crossing itself opened on 22 December 1989.',
        ],
      },
      {
        heading: 'How it is remembered',
        paragraphs: [
          'Germany reunified on 3 October 1990, and that date, Unity Day, is the national holiday. 9 November is kept as a day of remembrance.',
          'For the 25th anniversary, from 7 to 9 November 2014, the “Lichtgrenze” (border of light) placed 8,000 lit balloons along about 15 km of the Wall’s route through the city, and released them into the night sky on the 9th.',
        ],
      },
    ] satisfies GuideNote[],
    sources: ['chronik', 'wikiFall', 'wikiBornholmer', 'lichtgrenze'] as const,
  },

  lunch: {
    /** Hours as thespread.sg lists them; weekday rows: Mon–Fri = 1–5, Sat = 6, Sun = 0. */
    hours: [
      { days: 'Mon–Fri', time: '8:00 am – 6:30 pm', weekdays: [1, 2, 3, 4, 5] },
      { days: 'Sat', time: '8:00 am – 2:30 pm', weekdays: [6] },
      { days: 'Sun & public holidays', time: 'Closed', weekdays: [0] },
    ],
    hoursNote: 'Closed on public holidays. The café’s site also lists Saturday until 6:30 pm in one place, so check before a Saturday visit.',
    sources: ['spread'] as const,
  },
} as const;

export type BerlinSourceKey = keyof typeof BERLIN_SOURCES;

/** 0 (Sun) to 6 (Sat) in Singapore, whatever the device's time zone. */
export function singaporeWeekday(now: Date = new Date()): number {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Singapore' }).format(now);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
}

/** Whole years since 9 November 1989, on a date in Singapore. */
export function yearsSinceFall(now: Date = new Date()): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(now).split('-').map(Number);
  return y - 1989 - (m < 11 || (m === 11 && d < 9) ? 1 : 0);
}
