// Story photos, converted to webp at 2x render size. Alt text and credit lines are the screens' copy.
import thianHockKeng1890 from './thian-hock-keng-1890.webp';
import thianHockKeng2006 from './thian-hock-keng-2006.webp';
import plan1822 from './plan-1822.webp';
import lanterns from './lanterns.webp';
import thianHockKeng from './thian-hock-keng.webp';
import bakKwa from './bak-kwa.webp';
import spreadMuffins from './spread-muffins.webp';
import spreadPenne from './spread-penne.webp';
import spreadSpaghetti from './spread-spaghetti.webp';
import spreadIcedCoffee from './spread-iced-coffee.webp';
import spreadEspresso from './spread-espresso.webp';
import spreadTable from './spread-table.webp';
import spreadWindow from './spread-window.webp';
import pagodaStreet from './pagoda-street.webp';
import wall1989 from './wall-1989.webp';
import balloons2014 from './balloons-2014.webp';
import wallPanels from './wall-panels.webp';
export interface StoryImage {
  src: string;
  alt: string;
  credit: string;
}

export const STORY_IMAGES = {
  wallPanels: { src: wallPanels, alt: "Two Berlin Wall panels, painted with graffiti, standing in a garden behind Tembusu College", credit: "Source: Tembusu College, NUS" },
  balloons2014: { src: balloons2014, alt: "Lit white balloons along the Wall's old route near the Brandenburg Gate, 2014", credit: "Photo: Daderot · CC0" },
  wall1989: { src: wall1989, alt: "West and East Berliners on top of the Wall at the Brandenburg Gate, November 1989", credit: "Photo: Lear 21 · CC BY-SA 3.0" },
  pagodaStreet: { src: pagodaStreet, alt: "Pagoda Street in Chinatown, lined with shophouses and shops", credit: "Photo: kallerna · CC BY-SA 4.0" },
  spreadWindow: { src: spreadWindow, alt: "Sunlit tables beside the window inside The Spread", credit: "Photos: The Spread" },
  spreadTable: { src: spreadTable, alt: "Diners at a long shared table under pendant lamps, with a vase of flowers", credit: "Photos: The Spread" },
  spreadEspresso: { src: spreadEspresso, alt: "An espresso machine at the counter while a barista works behind it", credit: "Photos: The Spread" },
  spreadIcedCoffee: { src: spreadIcedCoffee, alt: "An iced coffee beside a muffin on a café table", credit: "Photos: The Spread" },
  spreadSpaghetti: { src: spreadSpaghetti, alt: "A bowl of spaghetti with mushrooms, chicken and greens", credit: "Photos: The Spread" },
  spreadPenne: { src: spreadPenne, alt: "A forkful of penne lifted from a plate", credit: "Photos: The Spread" },
  spreadMuffins: { src: spreadMuffins, alt: "Muffins in paper cases at the counter, with a handwritten Banana Speculoos Muffin label", credit: "Photos: The Spread" },
  bakKwa: { src: bakKwa, alt: "Glossy, charcoal-grilled squares of bak kwa in paper-lined boxes", credit: "Photo: Alpha · CC BY-SA 2.0" },
  thianHockKeng: { src: thianHockKeng, alt: "The front of Thian Hock Keng Temple with curved tiled roofs and dragons on the ridges", credit: "Zairon, CC BY-SA 4.0" },
  lanterns: { src: lanterns, alt: "Hundreds of glowing red lanterns hung overhead at night", credit: "Photo: Dileep Kaluaratchie · CC BY-SA 4.0" },
  plan1822: { src: plan1822, alt: "Lieutenant Jackson's 1822 Plan of the Town of Singapore", credit: "Map: Lt Philip Jackson, 1822 · Public domain" },
  thianHockKeng2006: { src: thianHockKeng2006, alt: "Thian Hock Keng in 2006, seen from Telok Ayer Street with office blocks behind", credit: "Terence Ong 2006, CC BY 2.5" },
  thianHockKeng1890: { src: thianHockKeng1890, alt: "Thian Hock Keng around 1890, with a rickshaw on an unpaved Telok Ayer Street", credit: "Lambert & Co. c.1890, KITLV, public domain" },
} satisfies Record<string, StoryImage>;

export type StoryImageKey = keyof typeof STORY_IMAGES;
