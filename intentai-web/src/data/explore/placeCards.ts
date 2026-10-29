// Story cards for Nearby places (owner request 2026-10-29: every place's page at least at the level of Team 1's
// Thian Hock Keng card). A place's page draws its card from the catalogue (name, Chinese name, kind, area, photo)
// and adds each part below only when this file has it for the place, so nothing is filled in without a source:
//   clip      the "sample clip": a licensed photo with four short captions (no video file), as on Team 1's cards
//   tiles     three numbers, each with the page that gives it
//   thenNow   a public-domain old photo and a licensed new one of the same view
//   lead/more the card's text, from `sources`
//   lookFor   what to look for on the spot, from `sources`
// Photos here are openly licensed (public domain, CC0, CC BY, CC BY-SA) with their credit; never the Singapore
// Culture Atlas photos (reference only, no reuse licence). Pilot (2026-10-29): the stops of the three story walks.
import { STORY_IMAGES } from '../../assets/stories';
import type { SourceReference } from '../../features/nearby/domain';
import type { OrderKind } from './orders';
import { THIAN_HOCK_KENG } from '../stories/chinatown';

export interface CardPhoto {
  src: string;
  alt: string;
  /** "Author · licence" as on the file page. */
  credit: string;
  /** The file page (Wikimedia Commons or the publisher). */
  url?: string;
}

export interface CardTile {
  value: number;
  label: string;
  /** Written right after the number: "s" (1870s), "+" (8,000+), " million+". */
  suffix?: string;
  /** Show the number with thousands separators (8,000), not as a year. */
  grouped?: boolean;
  source: SourceReference;
}

export interface PlaceCard {
  /** Heading phrases (blur in one after another); default: the place's name. */
  title?: string[];
  /** Line under the heading, after the place's Chinese name; default: its kind. */
  subtitle?: string;
  clip?: { title: string; captions: [string, string, string, string]; seconds: number; poster?: CardPhoto };
  tiles?: [CardTile, CardTile, CardTile];
  thenNow?: {
    then: CardPhoto;
    now: CardPhoto;
    thenLabel: string;
    nowLabel: string;
    captions: Record<'then' | 'mid' | 'now', { lead: string; text: string }>;
    tall?: boolean;
  };
  lead?: string;
  more?: string[];
  lookFor?: string[];
  /** Pages behind the clip captions, the text and "Look for". */
  sources: SourceReference[];
  /** Team 1's place-story card for this place. */
  story?: { path: string; label: string };
  /** "Order like a local" (src/data/explore/orders.ts). */
  order?: OrderKind;
  reviewedAt: string;
}

const photo = (file: string) => `${import.meta.env.BASE_URL}nearby/cards/${file}`;
const checked = '2026-10-29';
const src = (title: string, url: string, publisher: string): SourceReference => ({ title, url, publisher, checkedAt: checked });

const ROOTS_THK = src('Thian Hock Keng', 'https://roots.gov.sg/places/places-landing/Places/national-monuments/thian-hock-keng', 'National Heritage Board (Roots)');
const ROOTS_SRI = src(
  'Sri Mariamman Temple',
  'https://www.roots.gov.sg/places/places-landing/Places/national-monuments/sri-mariamman-temple',
  'National Heritage Board (Roots)',
);
const ROOTS_JAMAE = src('Jamae Mosque', 'https://roots.gov.sg/places/places-landing/Places/national-monuments/jamae-mosque', 'National Heritage Board (Roots)');
const JAMAE_HISTORY = src('History', 'https://masjidjamaechulia.sg/index.php/welcome/history', 'Masjid Jamae (Chulia)');
const NUS_MUSEUM = src('About us', 'https://nus.edu.sg/museum/about-us', 'NUS Museum');
const NUS_MUSEUM_VISIT = src('Visit', 'https://nus.edu.sg/museum/visit', 'NUS Museum');
const LKC_STORY = src('Our Story', 'https://lkcnhm.nus.edu.sg/our-story/', 'Lee Kong Chian Natural History Museum');
const LKC_HISTORY = src('Museum History', 'https://lkcnhm.nus.edu.sg/our-story/museum-history/', 'Lee Kong Chian Natural History Museum');
const LKC_TSCHOPP = src(
  'Interview with an evolutionary paleobiologist, Dr Emanuel Tschopp',
  'https://lkcnhm.nus.edu.sg/interview-with-an-evolutionary-paleobiologist-dr-emanuel-tschopp/',
  'Lee Kong Chian Natural History Museum',
);
const WIKI_PAGODA = src('Pagoda Street', 'https://en.wikipedia.org/wiki/Pagoda_Street', 'Wikipedia');
const WIKI_CHINATOWN = src('Chinatown, Outram', 'https://en.wikipedia.org/wiki/Chinatown,_Outram', 'Wikipedia');

export const PLACE_CARDS: Record<string, PlaceCard> = {
  // Team 1's monument card, shown on the temple's own page too (their text, photos and the NHB source).
  'curated:sg-thian-hock-keng-temple': {
    title: THIAN_HOCK_KENG.title,
    subtitle: THIAN_HOCK_KENG.subtitle.replace(/^天福宫 · /, ''),
    clip: {
      title: THIAN_HOCK_KENG.video.title,
      seconds: THIAN_HOCK_KENG.video.duration,
      captions: [...THIAN_HOCK_KENG.video.captions],
      poster: STORY_IMAGES.thianHockKeng,
    },
    tiles: [
      { value: 1839, label: 'building starts', source: ROOTS_THK },
      { value: 1842, label: 'temple completed', source: ROOTS_THK },
      { value: 1973, label: 'national monument', source: ROOTS_THK },
    ],
    thenNow: {
      then: THIAN_HOCK_KENG.thenNow.then,
      now: THIAN_HOCK_KENG.thenNow.now,
      thenLabel: 'c.1890',
      nowLabel: '2006',
      captions: THIAN_HOCK_KENG.thenNow.captions,
    },
    lead: THIAN_HOCK_KENG.lead,
    more: THIAN_HOCK_KENG.more,
    lookFor: THIAN_HOCK_KENG.lookFor.map((r) => r.text),
    sources: [ROOTS_THK],
    story: { path: '/place/chinatown/monument', label: 'Chinatown story card' },
    reviewedAt: checked,
  },

  'curated:sg-sri-mariamman-temple': {
    title: ['Sri Mariamman Temple,', 'for the goddess', 'of rain and healing'],
    subtitle: 'South Bridge Road · Hindu temple',
    clip: {
      title: 'A gateway of gods',
      seconds: 100,
      captions: [
        'Naraina Pillai, a clerk from Penang, founded the temple.',
        'A wood-and-attap temple stood here by 1827.',
        'In 1925 a five-tiered gopuram replaced the first tower.',
        'Its goddess is linked to rain and to curing disease.',
      ],
    },
    tiles: [
      { value: 1827, label: 'wood-and-attap temple', source: ROOTS_SRI },
      { value: 1843, label: 'oldest brick parts (about)', source: ROOTS_SRI },
      { value: 1925, label: 'five-tiered gopuram', source: ROOTS_SRI },
    ],
    thenNow: {
      tall: true,
      then: {
        src: photo('sri-mariamman-1895-1906.webp'),
        alt: 'Postcard of the temple’s gateway tower between 1895 and 1906, before it was replaced',
        credit: 'KITLV 1404868, 1895–1906 · public domain',
        url: 'https://commons.wikimedia.org/wiki/File:KITLV_-_1404868_-_Singapore._Hindu_Temple._-_1895-1906.tif',
      },
      now: {
        src: photo('sri-mariamman-2023.webp'),
        alt: 'The gateway tower in 2023, covered in brightly painted sculptures of Hindu deities',
        credit: 'Chainwit. 2023 · CC BY-SA 4.0',
        url: 'https://commons.wikimedia.org/wiki/File:Gopuram_-_Sri_Mariamman_Temple_Singapore_(2023)_-_img_01.jpg',
      },
      thenLabel: '1895–1906',
      nowLabel: '2023',
      captions: {
        then: { lead: '1895–1906.', text: ' The first gopuram, three tiers high and plainer in design.' },
        mid: { lead: 'Same gateway, two towers.', text: ' The old one was replaced in 1925.' },
        now: { lead: '2023.', text: ' Five tiers of brightly painted Hindu deities.' },
      },
    },
    lead: 'Sri Mariamman Temple was founded by Naraina Pillai, a government clerk from Penang. A wood-and-attap temple stood on South Bridge Road by 1827.',
    more: [
      'The oldest parts of today’s brick temple date from around 1843. In 1925 the first three-tiered gopuram was replaced by the five-tiered tower you see now, with brightly painted sculptures of Hindu deities.',
      'Its goddess, Sri Mariamman, is linked to the life-giving rain and is prayed to for curing epidemic diseases such as cholera. Each October or November, at the Theemithi festival, male devotees walk barefoot across burning charcoal.',
    ],
    lookFor: ['Cows, sacred to Hindus, on the boundary walls', 'Colourful domes (vimanam) over the shrines', 'The painted ceiling along the main hall'],
    sources: [ROOTS_SRI],
    reviewedAt: checked,
  },

  'curated:sg-masjid-jamae-chulia': {
    title: ['Masjid Jamae,', 'twin minarets on', 'South Bridge Road'],
    clip: {
      title: 'Built by Chulia traders',
      seconds: 96,
      captions: [
        'Chulia traders from South India built a mosque here around 1826.',
        'The mosque you see went up between 1830 and 1835.',
        'Two eight-sided minarets frame the main gate.',
        'Look for green Chinese tiles under the windows.',
      ],
    },
    tiles: [
      { value: 1826, label: 'first mosque (about)', source: ROOTS_JAMAE },
      { value: 1835, label: 'today’s mosque done', source: ROOTS_JAMAE },
      { value: 1974, label: 'national monument', source: JAMAE_HISTORY },
    ],
    thenNow: {
      then: {
        src: photo('jamae-c1900.webp'),
        alt: 'South Bridge Road around 1900: rickshaws in the street, the mosque’s minarets on the right and the temple tower beyond',
        credit: 'G.R. Lambert & Co., c.1900 · public domain',
        url: 'https://commons.wikimedia.org/wiki/File:Photographic_Views_of_Singapore_Plate_02_South_Bridge_Road.jpg',
      },
      now: {
        src: photo('jamae-2018.webp'),
        alt: 'The same stretch of South Bridge Road in 2018, with the green minarets, shophouses and festive lanterns',
        credit: 'Bahnfrend 2018 · CC BY-SA 4.0',
        url: 'https://commons.wikimedia.org/wiki/File:South_Bridge_Road,_Singapore,_2018_(05).jpg',
      },
      thenLabel: 'c.1900',
      nowLabel: '2018',
      captions: {
        then: { lead: 'c.1900.', text: ' Rickshaws on South Bridge Road, the minarets on the right and the temple tower beyond.' },
        mid: { lead: 'Same street, over a century apart.', text: ' The minarets still mark the mosque.' },
        now: { lead: '2018.', text: ' Shophouses and festive lanterns along the same road.' },
      },
    },
    lead: 'Masjid Jamae was built by the Chulias, Tamil Muslim traders and moneychangers from South India’s Coromandel Coast. Their first mosque here went up around 1826, and the present one between 1830 and 1835.',
    more: [
      'Its design mixes Indo-Islamic and Neoclassical styles. Above the gate, a small palace-like front with tiny doors and windows joins the two minarets, and the call to prayer was once made from the balcony there.',
      'It is one of the few mosques in Singapore that offers religious classes in Tamil, and it has room for about 1,500 worshippers.',
    ],
    lookFor: ['Seven levels of arched niches on each minaret', 'Green-glazed Chinese tiles below the windows', 'Tuscan columns and pilasters, a European touch'],
    sources: [ROOTS_JAMAE, JAMAE_HISTORY],
    reviewedAt: checked,
  },

  'curated:sg-pagoda-street-trengganu-street': {
    clip: {
      title: 'A street named after a temple',
      seconds: 90,
      captions: [
        'Pagoda Street is named after the temple’s gopuram nearby.',
        'In the early 1900s its shophouses were lodgings for coolies.',
        'Those lodging houses closed after the 1930s.',
        'Today it is a car-free street lined with shops.',
      ],
    },
    sources: [WIKI_PAGODA, WIKI_CHINATOWN],
    story: { path: '/place/chinatown/festival', label: 'Chinatown story card' },
    reviewedAt: checked,
  },

  'curated:sg-nus-museum': {
    title: ['NUS Museum,', 'art collections', 'on the Kent Ridge campus'],
    clip: {
      title: 'Four collections',
      seconds: 90,
      poster: {
        src: photo('nus-museum.webp'),
        alt: 'The NUS Museum’s outside wall with its name, beside Kent Ridge heritage trail signs',
        credit: 'Ralff Nestor Nacor 2023 · CC BY-SA 4.0',
        url: 'https://commons.wikimedia.org/wiki/File:NUS_Museum,_Singaporean.jpg',
      },
      captions: [
        'Its story starts in 1955, at the University of Malaya.',
        'Four collections hold more than 8,000 items.',
        'They include works by the sculptor Ng Eng Teng.',
        'Open Tuesday to Saturday, 10 am to 6 pm.',
      ],
    },
    tiles: [
      { value: 1955, label: 'University of Malaya Art Museum', source: NUS_MUSEUM },
      { value: 8000, suffix: '+', grouped: true, label: 'items', source: NUS_MUSEUM },
      { value: 4, label: 'collections', source: NUS_MUSEUM },
    ],
    lead: 'The NUS Museum goes back to the University of Malaya Art Museum, set up in 1955. Today its four collections hold more than 8,000 items, including works by Ng Eng Teng and the Peranakan collection of the Baba House.',
    sources: [NUS_MUSEUM, NUS_MUSEUM_VISIT],
    reviewedAt: checked,
  },

  'curated:sg-lee-kong-chian-natural-history': {
    title: ['Singapore’s only', 'natural history museum'],
    clip: {
      title: 'Prince, Apollonia and Twinky',
      seconds: 104,
      poster: {
        src: photo('lkcnhm-sauropods.webp'),
        alt: 'The three sauropod dinosaur skeletons in the museum’s gallery under blue light',
        credit: 'Jacklee 2015 · CC BY-SA 4.0',
        url: 'https://commons.wikimedia.org/wiki/File:Diplodocid_sauropod_skeletons,_Lee_Kong_Chian_Natural_History_Museum,_Singapore_-_20150808-01.jpg',
      },
      captions: [
        'This is Singapore’s only natural history museum.',
        'It keeps over a million specimens from Southeast Asia.',
        'Its three sauropods are Prince, Apollonia and Twinky.',
        'The museum’s story goes back to the 1870s.',
      ],
    },
    tiles: [
      { value: 3, label: 'sauropod dinosaurs', source: LKC_TSCHOPP },
      { value: 1, suffix: 'M+', label: 'specimens and records', source: LKC_STORY },
      { value: 1870, suffix: 's', label: 'history begins', source: LKC_STORY },
    ],
    lead: 'The Lee Kong Chian Natural History Museum is Singapore’s only natural history museum. Its rock-shaped building at NUS holds over a million specimens, field notes, drawings and photographs from Southeast Asia.',
    more: [
      'Its history goes back to the 1870s. In the gallery, the three sauropod dinosaurs Prince, Apollonia and Twinky are still used in research, not just for display.',
      'Heads-up: the Mammal Zone closes for renovation from late November, to reopen with a new look in 2027.',
    ],
    sources: [LKC_STORY, LKC_HISTORY, LKC_TSCHOPP],
    reviewedAt: checked,
  },

  // Food places: "Order like a local" (the words and their sources are in orders.ts).
  'curated:sg-tian-tian-hainanese-chicken-rice': { sources: [], order: 'chicken-rice', reviewedAt: checked },
  'curated:sg-maxwell-food-centre': { sources: [], order: 'kopi', reviewedAt: checked },
  'curated:sg-chinatown-complex-food-centre': { sources: [], order: 'kopi', reviewedAt: checked },

  // Team 1 has full story cards for these places: their pages link to them.
  'curated:sg-lim-chee-guan-new-bridge-road': {
    sources: [],
    story: { path: '/place/chinatown/food', label: 'Chinatown story card: bak kwa' },
    reviewedAt: checked,
  },
  'curated:sg-the-spread-nus': {
    sources: [],
    story: { path: '/place/berlin-wall-fragments/food', label: 'Berlin Wall story card: lunch' },
    reviewedAt: checked,
  },
  'curated:sg-berlin-wall-fragments-utown': {
    sources: [],
    story: { path: '/place/berlin-wall-fragments/monument', label: 'Berlin Wall story card' },
    reviewedAt: checked,
  },
};

export function placeCard(id: string): PlaceCard | undefined {
  return PLACE_CARDS[id];
}
