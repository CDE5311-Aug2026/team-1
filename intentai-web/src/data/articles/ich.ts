import type { Article } from '../culture';

// Heritage tab: elements of Singapore's National Inventory of Intangible Cultural Heritage.
// Lead topic: history and origins of each element.

const ROOTS = 'Roots.gov.sg (National Heritage Board)';
const CHECKED = '2026-10-20';

export const ichArticles: Article[] = [
  {
    id: 'chingay',
    title: 'Chingay',
    kicker: 'Street parade · ICH inventory',
    summary: 'A costumed street parade, revived in 1973 to bring back the spirit of Chinese New Year.',
    facts: [
      'The name refers to the art of costume and masquerade.',
      'The first modern parade, on 4 February 1973, had about 2,000 performers on Jalan Besar.',
      'It is organised by the People’s Association.',
    ],
    deeper:
      'Chingay is believed to have come from southern China, reaching Penang and then Singapore with migrants in the early 19th century. Early processions honoured deities such as Tua Pek Kong and Mazu through the streets of Telok Ayer, and died out in the late 1920s. After firecrackers were banned in June 1972, Prime Minister Lee Kuan Yew suggested a parade; it later moved to Orchard Road, City Hall and the F1 Pit Building, growing into a multi-ethnic show.',
    sources: [
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/chingay' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'getai',
    title: 'Getai',
    kicker: 'Live stage shows · ICH inventory',
    summary: 'Open-air song-and-dance shows, best known from the Hungry Ghost Festival.',
    facts: [
      '“Getai” means “song stage” in Chinese.',
      'The first troupe, Da Ye Hui, started at New World Amusement Park in 1923.',
      'At Hungry Ghost shows, the front row is left empty for “spirit” visitors.',
    ],
    deeper:
      'Getai peaked in the 1950s and came back in the 1970s, when it began to replace Chinese opera and puppet shows as the main attraction of the Hungry Ghost Festival. Shows are set up in tents on fields and car parks in the housing estates, with up-tempo songs, a live band and comic banter, mostly in Hokkien. With fewer people speaking dialect, getai is one of the few public stages where Chinese dialects are still widely heard.',
    sources: [
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/getai' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'dikir-barat',
    title: 'Dikir barat',
    kicker: 'Malay choral performance · ICH inventory',
    summary: 'A Malay group singing performance with a chorus, a lead singer, a jester and percussion.',
    facts: [
      'Originated in Kelantan, Malaysia, in the early 20th century.',
      'A group has a tok juara (lead singer), a tukang karut (jester) and a chorus of 12 to 16.',
      'Singapore has about 70 to 90 active troupes.',
    ],
    deeper:
      'In Kelantan, dikir barat was performed at rural harvest festivals and dealt with courtship and folk wisdom. In Singapore it grew its own style: themes lean towards civic values such as racial harmony, the chorus’s moves count as much as the singing, and performers usually memorise lyrics rather than improvise. It is performed at Malay weddings and festivals, and competitions are held often.',
    sources: [
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/dikir-barat' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'thaipusam',
    title: 'Thaipusam',
    kicker: 'Hindu festival · ICH inventory',
    summary: 'A Hindu festival for Lord Murugan, held on the full moon of the Tamil month of Thai.',
    facts: [
      'It marks Lord Murugan’s victory over evil with a vel, or spear.',
      'The procession runs about 4 km from Serangoon Road to Tank Road.',
      'Since 2016, live music has been allowed at points along the route.',
    ],
    deeper:
      'Devotees walk from Sri Srinivasa Perumal Temple to Sri Thendayuthapani Temple carrying pal kudam, pots of milk, or kavadis, frames decorated with images of deities and peacock feathers. Many fast for weeks beforehand. Lord Murugan is especially important to Tamils, the majority of Singapore’s Indian community, and the festival draws thousands of participants and onlookers each year.',
    sources: [
      { label: ROOTS, url: 'https://www.roots.gov.sg/ich-landing/ich/thaipusam' },
      { label: ROOTS, url: 'https://www.roots.gov.sg/stories-landing/stories/festivals-in-singapore/festivals-in-singapore' },
    ],
    checkedOn: CHECKED,
  },
];
