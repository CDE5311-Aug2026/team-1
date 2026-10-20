import type { Article } from '../culture';

// History tab. Lead topic: quick facts and key dates.

const NLB = 'NLB Infopedia';
const CHECKED = '2026-10-20';

export const historyArticles: Article[] = [
  {
    id: 'temasek-singapura',
    title: 'From Temasek to Singapura',
    kicker: 'Early names · 14th century',
    summary: 'Before it was Singapore, the island was known as Temasek, a name found in 14th-century records.',
    facts: [
      '1330: a Vietnamese text mentions Temasek, one of the earliest records of the name.',
      '1349: Wang Dayuan describes it in Dao yi zhi lue.',
      '1511: the Portuguese mention only “Singapore”; the old name had faded.',
    ],
    deeper:
      '“Temasek” probably shares a root with the Malay word tasek, “lake”, suggesting land surrounded by water. “Singapura” is Sanskrit for “lion city”, and the Malay Annals tell of Sri Tri Buana renaming the island. The change may date to around 1392, when Parameswara arrived from Sumatra, though Chinese writers kept using the old name into the 15th century.',
    sources: [
      { label: NLB, url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=d24d6da6-0013-4a12-a6bc-68ad1497148e' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'singapore-treaty-1819',
    title: 'The 1819 treaty',
    kicker: 'A British trading post · 6 February 1819',
    summary: 'A treaty with Johor’s rulers let the British East India Company set up a trading post.',
    facts: [
      '30 January 1819: Raffles and the Temenggong sign a preliminary agreement.',
      '6 February 1819: the treaty is signed and the British flag formally raised.',
      '7 February 1819: Raffles leaves, and William Farquhar takes charge as Resident.',
    ],
    deeper:
      'Before the treaty, about 1,000 people lived on the island, mostly orang laut, with small groups of Malays and Chinese. Sultan Hussein was to receive 5,000 Spanish dollars a year and the Temenggong 3,000. The treaty gave the British little more than permission for a trading post; an 1824 treaty ceded Singapore and its surrounding islands to the Company outright.',
    sources: [
      { label: NLB, url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=92bb56f0-e821-40d1-bd8c-cf8fa7e7f172' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'merger-and-separation',
    title: 'Merger and independence',
    kicker: '1963 to 1965',
    summary: 'Singapore joined Malaysia in 1963 and left to become a sovereign state less than two years later.',
    facts: [
      '16 September 1963: Malaysia is formed from Malaya, Singapore, Sarawak and North Borneo.',
      '9 August 1965: independence is proclaimed on Radio Singapore at 10 am.',
      'Malaysia’s parliament passed the bill letting Singapore leave by 126 votes to 0.',
    ],
    deeper:
      'The union lasted fewer than 23 months, strained by deep political and economic differences, and communal riots broke out in Singapore in July and September 1964. Separation talks were held in secret, and even some senior ministers were told only days before. At a televised press conference that afternoon, Prime Minister Lee Kuan Yew was overcome by emotion.',
    sources: [
      { label: NLB, url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=9641f35d-3ae5-41d8-9fa6-7ca8b845ea53' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'sentosa-name',
    title: 'How Sentosa got its name',
    kicker: 'Formerly Pulau Blakang Mati · renamed 1972',
    summary: 'The resort island was once a military outpost with a grim name.',
    facts: [
      'Late 16th century: “Belakang Mati” appears on a Portuguese map by de Erédia.',
      '1972: a renaming contest picks “Sentosa”, Malay for “peace and tranquillity”.',
      'Fort Siloso is Singapore’s only remaining coastal fort.',
    ],
    deeper:
      'Pulau Blakang Mati is often translated as “the island behind which lies death”, and some accounts link the name to pirates and bloodshed. During the Second World War it was a defence outpost and military base. Plans in the late 1960s to redevelop it for commercial use led to the new name, and it is now a 500-hectare resort.',
    sources: [
      { label: 'SG101 (gov.sg)', url: 'https://www.sg101.gov.sg/resources/archives/islandsofsingapore-sentosa/' },
      { label: NLB, url: 'https://www.nlb.gov.sg/main/article-detail?cmsuuid=d24d6da6-0013-4a12-a6bc-68ad1497148e' },
    ],
    checkedOn: CHECKED,
  },
];
