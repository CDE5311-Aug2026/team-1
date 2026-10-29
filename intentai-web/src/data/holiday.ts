// Today's holiday card (v2). Fixed to a demo date for now (backlog B7: follow the real calendar).
// Detail content leads with the survey's top Holidays choice, "Meaning and origins of each festival",
// layered per the survey's length preference: quick facts first, then the deeper read.

import deepavaliPhoto from '../assets/holiday/deepavali.jpg';
import type { ArticleImage } from './articleImages';

export interface Holiday {
  name: string;
  /** Demo "today", shown on the card. */
  today: string;
  /** Hero card kicker, shown uppercase by CSS. */
  kicker: string;
  cardTitle: string;
  cardBody: string;
  /** Anniversary row under the hero card, linking to a Home place. */
  also: { when: string; title: string; placeId: string };
  detailHeading: string;
  facts: string[];
  /** Deeper-read paragraphs. */
  deeper: string[];
  source: string;
  /** Banner on the detail page, credited like Today's article photos. */
  image: ArticleImage;
}

export const todaysHoliday: Holiday = {
  name: 'Deepavali',
  today: 'Sat 7 Nov',
  kicker: 'Sat 7 Nov · Long weekend',
  cardTitle: 'Deepavali long weekend starts today',
  cardBody: 'The festival of lights is on Sun 8 Nov. Mon 9 Nov is a public holiday too.',
  also: {
    when: 'Also Mon 9 Nov · Near you',
    title: 'The Berlin Wall fell 37 years ago',
    placeId: 'berlin-wall-fragments',
  },
  detailHeading: 'Meaning and origins',
  facts: [
    'Deepavali means “row of lights” and celebrates the victory of light over darkness, and good over evil.',
    'Most Singapore Hindus have Tamil roots and mark it as Lord Krishna’s defeat of the demon Narakasura.',
    'It falls on a new moon in the Tamil month of Aippasi, so the date moves each year (Oct or Nov).',
  ],
  deeper: [
    'Hindus across India tell different stories behind the festival. In the north it is often linked to Lord Rama’s return home after defeating Ravana; in the south, including the Tamil traditions most common in Singapore, it marks Krishna’s victory over Narakasura. Every version shares the same idea: light pushing back darkness.',
    'The day begins before dawn with an oil bath, followed by new clothes, prayers at the temple and visits to family and friends. Homes are lit with oil lamps and decorated with kolam, patterns drawn at the doorway with coloured rice powder.',
    'In the weeks before, Serangoon Road in Little India is lit with a street light-up and lined with festive bazaars. Friends of every community are welcome to visit; “Happy Deepavali” is the usual greeting.',
  ],
  source: 'National Heritage Board, Roots.gov.sg',
  image: {
    src: deepavaliPhoto,
    alt: 'The Deepavali light-up on Serangoon Road: lit peacocks and lotus flowers arch over the street at night',
    credit: 'Photo: Cpgfella · CC BY-SA 4.0 · cropped',
    url: 'https://commons.wikimedia.org/wiki/File:Deepavali_on_Serangoon_Road.jpg',
  },
};
