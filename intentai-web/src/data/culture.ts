// Singapore culture content for Today's tabs. Categories and their order come from the
// Singapore Culture survey (n=24, 2026-10-19).
// Articles are layered per the survey's length preference: quick facts first, a deeper read on demand.

import { historyArticles } from './articles/history';
import { holidaysArticles } from './articles/holidays';
import { ichArticles } from './articles/ich';

export type CategoryId = 'foods' | 'monuments' | 'unesco' | 'holidays' | 'ich' | 'history';

export interface Category {
  id: CategoryId;
  /** Short tab label. */
  label: string;
  /** Survey category name. */
  name: string;
  /** The survey's top choice for this category; each tab leads with it. */
  topChoice: string;
}

export interface Source {
  label: string;
  url?: string;
}

export interface Article {
  id: string;
  title: string;
  /** One line under the title, e.g. where a dish comes from. */
  kicker: string;
  summary: string;
  facts: string[];
  /** The deeper read, shown on demand. */
  deeper: string;
  sources: Source[];
  /** YYYY-MM-DD the sources were last checked; set on articles that state dates. */
  checkedOn?: string;
}

/** All six survey categories, ranked by mean interest (n=24). The questionnaire offers all of them. */
export const CATEGORIES: readonly Category[] = [
  { id: 'foods', label: 'Foods', name: 'Representative foods', topChoice: 'Iconic dishes and where they come from' },
  { id: 'monuments', label: 'Monuments', name: 'National monuments', topChoice: 'The story behind each monument' },
  { id: 'holidays', label: 'Festivals', name: 'Holidays and festivals', topChoice: 'Meaning and origins of each festival' },
  { id: 'unesco', label: 'UNESCO', name: 'UNESCO-recognised heritage', topChoice: 'What each element is and why it matters' },
  { id: 'ich', label: 'Heritage', name: 'National Inventory of Intangible Cultural Heritage', topChoice: 'History and origins of each element' },
  { id: 'history', label: 'History', name: 'History trivia', topChoice: 'Quick facts and key dates' },
];

/** The popular picks: the survey's top three categories (n=24). Same as DEFAULT_PREFS in culturePrefs.ts. */
export const DEFAULT_CATEGORIES: readonly CategoryId[] = ['foods', 'monuments', 'holidays'];

export function categoryById(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export function categoryLabel(id: CategoryId): string {
  return categoryById(id).label;
}

const NHB = 'National Heritage Board, Roots.gov.sg';

const ARTICLES: Record<CategoryId, Article[]> = {
  foods: [
    {
      id: 'chicken-rice',
      title: 'Hainanese chicken rice',
      kicker: 'From Hainan Island, China',
      summary: 'Poached chicken on rice cooked in chicken stock, brought over by Hainanese immigrants.',
      facts: [
        'Grew out of Wenchang chicken, a dish from Hainan.',
        'The rice is cooked in chicken stock and fat, with ginger and pandan.',
        'Served with chilli sauce, ginger paste and dark soy sauce.',
      ],
      deeper:
        'Hainanese immigrants arrived in Singapore in the late 19th and early 20th century and sold the dish from pushcarts and coffee shops. Wenchang chicken back home used older birds; cooks in Singapore switched to younger, more tender chickens and added the chilli sauce. Today it is often called a national dish, and almost every hawker centre has a stall.',
      sources: [{ label: NHB }],
    },
    {
      id: 'laksa',
      title: 'Laksa',
      kicker: 'Peranakan, Chinese and Malay roots',
      summary: 'Rice noodles in a spicy coconut-milk broth, a product of Peranakan home cooking.',
      facts: [
        'Peranakan (Straits Chinese) cooking blends Chinese and Malay ingredients.',
        'The broth uses coconut milk, dried shrimp and a spice paste called rempah.',
        'Katong laksa cuts the noodles short, so it is eaten with a spoon only.',
      ],
      deeper:
        'Laksa is found across the Malay Peninsula in many versions. The Singapore style is curry laksa, rich with coconut milk and topped with prawns, cockles and fish cake. The Katong neighbourhood in the east, long home to many Peranakan families, gave its name to the best-known version.',
      sources: [{ label: NHB }],
    },
    {
      id: 'chilli-crab',
      title: 'Chilli crab',
      kicker: 'Singaporean original',
      summary: 'Crab stir-fried in a sweet, savoury tomato-chilli sauce, first sold from a pushcart.',
      facts: [
        'Credited to Cher Yam Tian and her husband Lim Choon Ngee in the 1950s.',
        'They first sold it from a pushcart by the Kallang River.',
        'Mop up the sauce with fried or steamed mantou buns.',
      ],
      deeper:
        'Cher Yam Tian first stir-fried crab with tomato sauce, then added chilli at her husband’s suggestion. The pushcart became a popular seaside restaurant, Palm Beach. Later chefs thickened the sauce with egg, giving the version most restaurants serve today.',
      sources: [{ label: NHB }],
    },
    {
      id: 'roti-prata',
      title: 'Roti prata',
      kicker: 'From South India',
      summary: 'Flaky griddle-fried flatbread with curry, brought by Indian immigrants.',
      facts: [
        'Comes from the parotta of South India.',
        'The dough is stretched thin, folded and fried on a flat griddle.',
        'Usually eaten with fish or chicken curry.',
      ],
      deeper:
        'Indian immigrants brought the bread to Singapore, where “prata” is the local name. It is a breakfast and supper favourite at Indian Muslim stalls. Fillings grew over time, from egg and onion to cheese and more unusual ones.',
      sources: [{ label: NHB }],
    },
    {
      id: 'nasi-lemak',
      title: 'Nasi lemak',
      kicker: 'Malay',
      summary: 'Rice cooked in coconut milk and pandan, with sambal and crisp side dishes.',
      facts: [
        '“Lemak” is Malay for rich and creamy, from the coconut milk.',
        'Classic sides: sambal, fried anchovies (ikan bilis), peanuts, egg and cucumber.',
        'Once wrapped in banana leaf for an easy breakfast.',
      ],
      deeper:
        'Nasi lemak began as a Malay breakfast and is now eaten at any hour by every community. Chinese-run stalls often add fried chicken wings or luncheon meat, a good example of how Singapore dishes cross between communities.',
      sources: [{ label: NHB }],
    },
  ],
  monuments: [
    {
      id: 'sri-mariamman',
      title: 'Sri Mariamman Temple',
      kicker: 'South Bridge Road · gazetted 1973',
      summary: 'Singapore’s oldest Hindu temple, founded in 1827.',
      facts: [
        'Founded by Naraina Pillai, who arrived with Stamford Raffles in 1819.',
        'Known for its tall gopuram (entrance tower) covered in sculpted figures.',
        'Hosts the yearly firewalking festival, Theemithi.',
      ],
      deeper:
        'The first temple was a simple wood and attap hut. Brick buildings replaced it in the 1840s, and the gopuram was added later. The temple sits in Chinatown, a reminder that early Singapore’s communities lived and worshipped side by side.',
      sources: [{ label: NHB }],
    },
    {
      id: 'thian-hock-keng',
      title: 'Thian Hock Keng Temple',
      kicker: 'Telok Ayer Street · gazetted 1973',
      summary: 'A Hokkien temple to Mazu, the sea goddess, built 1839 to 1842.',
      facts: [
        'It once stood on the shoreline, before land reclamation moved the sea away.',
        'Sailors gave thanks here for a safe voyage from China.',
        'Built with traditional joinery, without nails.',
      ],
      deeper:
        'Telok Ayer Street was where many Chinese immigrants first stepped ashore. The temple was funded by the Hokkien community, led by philanthropist Tan Tock Seng. It also served as a meeting place for the community and the Hokkien Huay Kuan clan association.',
      sources: [{ label: NHB }],
    },
    {
      id: 'sultan-mosque',
      title: 'Sultan Mosque',
      kicker: 'Kampong Glam · gazetted 1975',
      summary: 'A landmark mosque first built in the 1820s for Sultan Hussein Shah.',
      facts: [
        'The first mosque on the site was built 1824 to 1826.',
        'The current building dates from 1932, with a large golden dome.',
        'Kampong Glam was the seat of the Malay royal family.',
      ],
      deeper:
        'After the 1819 treaty with the British, Sultan Hussein Shah settled in Kampong Glam and the first mosque was built beside his palace. A century later the community rebuilt it on a larger scale, designed by the firm Swan & Maclaren. The ring of glass bottle ends at the base of the dome was donated by worshippers.',
      sources: [{ label: NHB }],
    },
    {
      id: 'raffles-hotel',
      title: 'Raffles Hotel',
      kicker: 'Beach Road · gazetted 1987',
      summary: 'A colonial-era hotel opened in 1887 by the Armenian Sarkies brothers.',
      facts: [
        'Named after Stamford Raffles, who founded modern Singapore in 1819.',
        'The Singapore Sling cocktail was created in its Long Bar, around 1915.',
        'It began as a 10-room bungalow by the sea.',
      ],
      deeper:
        'The Sarkies brothers ran a chain of grand hotels across Southeast Asia. Raffles grew into the main building that stands today, finished in 1899. Writers and travellers made it famous, and it was declared a national monument on its 100th anniversary.',
      sources: [{ label: NHB }],
    },
  ],
  unesco: [
    {
      id: 'hawker-culture',
      title: 'Hawker culture',
      kicker: 'Intangible Cultural Heritage · inscribed 2020',
      summary: 'Singapore’s first entry on UNESCO’s list of the intangible cultural heritage of humanity.',
      facts: [
        'Covers the hawkers, their cooking and the centres where everyone eats together.',
        'Hawker centres are often called the “community dining rooms” of Singapore.',
        'Dishes from Chinese, Malay, Indian and Peranakan kitchens sit side by side.',
      ],
      deeper:
        'Street hawkers were moved into purpose-built hawker centres from the 1960s and 70s, which made food cleaner and kept it affordable. UNESCO recognised more than the food: the skills passed between generations, and the everyday mixing of people from every background at the same tables.',
      sources: [{ label: 'UNESCO' }, { label: 'National Heritage Board' }],
    },
    {
      id: 'botanic-gardens',
      title: 'Singapore Botanic Gardens',
      kicker: 'World Heritage Site · inscribed 2015',
      summary: 'Singapore’s only World Heritage Site, a tropical garden founded in 1859.',
      facts: [
        'The first tropical botanic garden on the World Heritage List.',
        'Its scientists helped spread rubber growing across Southeast Asia.',
        'Home to the National Orchid Garden.',
      ],
      deeper:
        'UNESCO recognised the Gardens as a British colonial garden that became a centre for science and conservation. Director Henry Ridley developed a better way to tap rubber trees, which helped make rubber a major regional crop. Ridley also first described the Vanda Miss Joaquim orchid, later chosen as the national flower.',
      sources: [{ label: 'UNESCO' }, { label: 'National Parks Board' }],
    },
    {
      id: 'kebaya',
      title: 'Kebaya',
      kicker: 'Intangible Cultural Heritage · inscribed 2024',
      summary: 'The knowledge, skills and traditions of the kebaya, a fitted blouse worn across the region.',
      facts: [
        'A joint nomination by Brunei, Indonesia, Malaysia, Singapore and Thailand.',
        'Singapore’s second element on UNESCO’s intangible heritage list.',
        'Worn by Malay, Peranakan and other communities, often with intricate embroidery.',
      ],
      deeper:
        'The kebaya shows how heritage is shared across borders. Five countries nominated it together, recognising the tailors, embroiderers and wearers who keep it alive. In Singapore, the Peranakan nyonya kebaya and the Malay kebaya are both part of the tradition.',
      sources: [{ label: 'UNESCO' }, { label: 'National Heritage Board' }],
    },
    {
      id: 'city-of-design',
      title: 'UNESCO City of Design',
      kicker: 'Creative Cities Network · joined 2015',
      summary: 'Singapore is part of UNESCO’s network of cities that use design to improve city life.',
      facts: [
        'Named a City of Design in 2015.',
        'The network links cities that use creativity for sustainable development.',
        'Design shows up in public housing, parks and urban planning.',
      ],
      deeper:
        'Unlike the lists of heritage sites and traditions, the Creative Cities Network is about what a city does next. Singapore commits to sharing how design helps a dense city stay liveable, from greenery on buildings to shared spaces in housing estates.',
      sources: [{ label: 'UNESCO' }],
    },
  ],
  // Sourced from roots.gov.sg and NLB Infopedia (exact pages in each article), checked 2026-10-20.
  holidays: holidaysArticles,
  ich: ichArticles,
  history: historyArticles,
};

export function articlesFor(id: CategoryId): Article[] {
  return ARTICLES[id];
}
