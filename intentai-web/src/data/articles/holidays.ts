import type { Article } from '../culture';

// Festivals tab. Lead topic: meaning and origins of each festival.
// Deepavali is deliberately absent: it has its own screen.

const ROOTS = 'Roots.gov.sg (National Heritage Board)';
const NLB = 'NLB Infopedia';
const CHECKED = '2026-10-20';

export const holidaysArticles: Article[] = [
  {
    id: 'lunar-new-year',
    title: 'Lunar New Year',
    kicker: 'Chinese · January or February',
    summary: 'The start of the Chinese lunar year, celebrated over 15 days of family visits and feasting.',
    facts: [
      'The first day usually falls between 21 January and 20 February.',
      'The reunion dinner on New Year’s Eve is the main family gathering of the year.',
      'In Singapore, yusheng is served on the seventh day, known as renri, “everyman’s birthday”.',
    ],
    deeper:
      'The lion dance recalls a legend of villagers who scared off a monster called nian. Elders give hongbao, red packets of money, to children and younger unmarried relatives, and visitors bring a pair of mandarin oranges, whose name sounds like “luck” and “wealth”. The festival ends on the 15th day, chap goh mei, when single women in Singapore have thrown oranges into the Singapore River in the hope of finding a husband.',
    sources: [
      { label: NLB, url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=64b992e6-bc61-4950-95c3-5faaf841c3f6' },
      { label: ROOTS, url: 'https://www.roots.gov.sg/stories-landing/stories/festivals-in-singapore/festivals-in-singapore' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'hari-raya-puasa',
    title: 'Hari Raya Puasa',
    kicker: 'Muslim · 1 Syawal',
    summary: 'Marks the end of Ramadan, the Muslim month of fasting.',
    facts: [
      '“Hari Raya” is Malay for “grand day of rejoicing”.',
      'It falls on the first day of Syawal, the tenth month of the Muslim calendar.',
      'Children receive money in small green packets.',
    ],
    deeper:
      'Fasting from dawn to sunset during Ramadan is one of the five pillars of Islam, and the festival celebrates the self-control it takes. On the day, families attend prayers at the mosque, and younger members ask their elders for forgiveness by kissing their hand. Geylang Serai is lit up with a bazaar for about a month beforehand, and visits to relatives carry on through Syawal over ketupat and rendang.',
    sources: [
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/hari-raya-puasa' },
      { label: ROOTS, url: 'https://www.roots.gov.sg/stories-landing/stories/festivals-in-singapore/festivals-in-singapore' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'hari-raya-haji',
    title: 'Hari Raya Haji',
    kicker: 'Muslim · 10 Zulhijjah',
    summary: 'The festival of sacrifice, marking the end of the haj pilgrimage to Mecca.',
    facts: [
      'Falls on the 10th day of Zulhijjah, the 12th month of the Islamic calendar.',
      'Also called Aidiladha, or Eid al-Adha.',
      'One-third of the korban meat goes to the poor.',
    ],
    deeper:
      'The festival recalls the Prophet Ibrahim’s willingness to sacrifice his son Ismail at Allah’s command; Allah intervened, and a sheep was sacrificed in Ismail’s place. Muslims remember this through korban, the sacrifice of livestock, carried out after prayers at the mosque. In Singapore, where communities do not keep livestock, korban has been done at mosques with imported animals, and some families arrange it overseas.',
    sources: [
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/hari-raya-haji' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'vesak-day',
    title: 'Vesak Day',
    kicker: 'Buddhist · April or May',
    summary: 'Marks the birth, enlightenment and passing of the Buddha.',
    facts: [
      'Made a public holiday in June 1955; the first holiday was 24 May 1956.',
      'It was spelt “Wesak” until the 1970s.',
      'Devotees “bathe” Buddha statues, recalling the waters of nine dragons at his birth.',
    ],
    deeper:
      'Buddhist groups first petitioned for a holiday in October 1947, but in 1950 a select committee found “insufficient evidence” of public support. The first holiday was gazetted for 23 May 1956, then moved to the 24th, the actual full moon, after protests. Today devotees at Kong Meng San Phor Kark See Monastery practise “three steps, one bow”, and many temples hold candlelight processions.',
    sources: [
      { label: NLB, url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=66053540-f81f-47c8-82ce-6095d5b599c3' },
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/vesak-day' },
    ],
    checkedOn: CHECKED,
  },
];
