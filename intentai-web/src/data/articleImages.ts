// One banner photo per Today article that is shown (the first three of each category).
// All from Wikimedia Commons under free licences, centre-cropped to 16:9 and resized to 720×405;
// each card credits author and licence, linking the Commons file page (which holds the full licence).

import botanicGardens from '../assets/culture/botanic-gardens.jpg';
import chickenRice from '../assets/culture/chicken-rice.jpg';
import chilliCrab from '../assets/culture/chilli-crab.jpg';
import chingay from '../assets/culture/chingay.jpg';
import dikirBarat from '../assets/culture/dikir-barat.jpg';
import getai from '../assets/culture/getai.jpg';
import hariRayaHaji from '../assets/culture/hari-raya-haji.jpg';
import hariRayaPuasa from '../assets/culture/hari-raya-puasa.jpg';
import hawkerCulture from '../assets/culture/hawker-culture.jpg';
import kebaya from '../assets/culture/kebaya.jpg';
import laksa from '../assets/culture/laksa.jpg';
import lunarNewYear from '../assets/culture/lunar-new-year.jpg';
import mergerAndSeparation from '../assets/culture/merger-and-separation.jpg';
import treaty1819 from '../assets/culture/singapore-treaty-1819.jpg';
import sriMariamman from '../assets/culture/sri-mariamman.jpg';
import sultanMosque from '../assets/culture/sultan-mosque.jpg';
import temasek from '../assets/culture/temasek-singapura.jpg';
import thianHockKeng from '../assets/culture/thian-hock-keng.jpg';

export interface ArticleImage {
  src: string;
  alt: string;
  /** Shown on the card, e.g. "Photo: Giddy98 · CC BY-SA 4.0 · cropped" (CC BY-SA asks us to mark changes). */
  credit: string;
  /** The Commons file page: source, author and full licence. */
  url: string;
}

const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

/** Keyed by article id. */
export const ARTICLE_IMAGES: Record<string, ArticleImage> = {
  'chicken-rice': {
    src: chickenRice,
    alt: 'A plate of Hainanese chicken rice with sliced chicken, cucumber and chilli sauce',
    credit: 'Photo: Terence Ong · CC BY 2.5 · cropped',
    url: `${COMMONS}Hainanese_Chicken_Rice.jpg`,
  },
  laksa: {
    src: laksa,
    alt: 'A bowl of laksa in coconut broth with egg and chopsticks',
    credit: 'Photo: Giddy98 · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Nyonya_Laksa.jpg`,
  },
  'chilli-crab': {
    src: chilliCrab,
    alt: 'Chilli crab in red sauce on a plate',
    credit: 'Photo: megawatts86 · CC BY-SA 2.0 · cropped',
    url: `${COMMONS}Chilli_crab-02.jpg`,
  },
  'sri-mariamman': {
    src: sriMariamman,
    alt: 'The carved, painted gopuram tower of Sri Mariamman Temple',
    credit: 'Photo: Chainwit. · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Gopuram_-_Sri_Mariamman_Temple_Singapore_(2023)_-_img_01.jpg`,
  },
  'thian-hock-keng': {
    src: thianHockKeng,
    alt: 'The front of Thian Hock Keng Temple with its curved tiled roofs',
    credit: 'Photo: Zairon · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Singapore_Tempel_Thian_Hock_Keng_1.jpg`,
  },
  'sultan-mosque': {
    src: sultanMosque,
    alt: 'Sultan Mosque’s golden dome at the end of a street of shophouses',
    credit: 'Photo: Chainwit. · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Masjid_Sultan,_Singapore_(2023_June)_-_img_07.jpg`,
  },
  'lunar-new-year': {
    src: lunarNewYear,
    alt: 'Hundreds of glowing red lanterns hung overhead at night for Chinese New Year in Singapore',
    credit: 'Photo: Dileep Kaluaratchie · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Chinese_New_Year_Celebrations_with_Lanterns_in_Singapore.jpg`,
  },
  'hari-raya-puasa': {
    src: hariRayaPuasa,
    alt: 'The Hari Raya street light-up in Geylang Serai at night',
    credit: 'Photo: Jnzl’s Photos · CC BY 2.0 · cropped',
    url: `${COMMONS}Geylang_Serai_light_up.jpg`,
  },
  'hari-raya-haji': {
    src: hariRayaHaji,
    alt: 'Sultan Mosque at nightfall on the eve of Hari Raya Haji',
    credit: 'Photo: Erwin Soo · CC BY 2.0 · cropped',
    url: `${COMMONS}Nighfall_at_Sultan_Mosque_at_Kampong_Glam,_Singapore_(8124991632).jpg`,
  },
  'hawker-culture': {
    src: hawkerCulture,
    alt: 'Diners at tables under the cast-iron roof of Lau Pa Sat hawker centre',
    credit: 'Photo: kallerna · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Lau_Pa_Sat_Singapore_1.jpg`,
  },
  'botanic-gardens': {
    src: botanicGardens,
    alt: 'Red palms beside Symphony Lake in the Singapore Botanic Gardens',
    credit: 'Photo: Velela · Public domain · cropped',
    url: `${COMMONS}Symphony_Lake,_Singapore_Botanic_Gardens_-_20041025.jpg`,
  },
  kebaya: {
    src: kebaya,
    alt: 'A white Peranakan kebaya with embroidered flowers, from the 1950s',
    credit: 'Photo: Bjoertvedt · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Kebaya_from_Singapore_ca_1950s_IMG_9860_singapore_peranakan_museum.jpg`,
  },
  chingay: {
    src: chingay,
    alt: 'Chingay performers with clear umbrellas in the night parade',
    credit: 'Photo: Fortresseconomist · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Chingay_Performers_at_Parade.jpg`,
  },
  getai: {
    src: getai,
    alt: 'A getai stage lit in red, with Chinese characters along the front',
    credit: 'Photo: Ah leong 99 · CC0 · cropped',
    url: `${COMMONS}Getai_stage,_Singapore_-_20120124.jpg`,
  },
  'dikir-barat': {
    src: dikirBarat,
    alt: 'Dikir barat performers in green and gold at the Chingay parade',
    credit: 'Photo: Stsanto · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Dikir_Barat_with_family.jpg`,
  },
  'temasek-singapura': {
    src: temasek,
    alt: 'Part of the Mao Kun map, a Ming-dynasty sea chart that names Temasek',
    credit: 'Map: Wubei Zhi · Public domain · cropped',
    url: `${COMMONS}Mao_Kun_map_-_Singapore.png`,
  },
  'singapore-treaty-1819': {
    src: treaty1819,
    alt: 'The statue of Stamford Raffles at his landing site by the Singapore River',
    credit: 'Photo: Birbirby · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Statue_of_Sir_Stamford_Raffles_at_his_historic_landing_site_in_1819.jpg`,
  },
  'merger-and-separation': {
    src: mergerAndSeparation,
    alt: 'A copy of the 1965 Proclamation of Singapore on display',
    credit: 'Photo: Smuconlaw · CC BY-SA 4.0 · cropped',
    url: `${COMMONS}Proclamation_of_Singapore,_Supreme_Court_of_Singapore_-_20151118.jpg`,
  },
};
