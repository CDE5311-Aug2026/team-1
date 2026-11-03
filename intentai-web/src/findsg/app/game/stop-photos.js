// Hunt demo (3 Nov 2026, owner): the check-in camera does not send a photo anywhere. It shows the real photo of the
// stop, loaded ahead, as the shot you took. These are openly licensed photos with their credit (Wikimedia Commons, as in
// src/data/explore/photos.json and the Only One Missing pack); never the Singapore Culture Atlas photos.
// A stop with no photo here gets its story's concept art, marked as art.
import pins from '../../../data/hunt/stopPins.json';
import {OM_PINS} from '../om/om-content.js';

const BASE = import.meta.env.BASE_URL;
const commons = file => 'https://commons.wikimedia.org/wiki/File:' + file;
const place = (file, credit, url) => ({src: BASE + 'nearby/photos/' + file, credit, url});
const om = (file, credit, url) => ({src: BASE + 'hunt/om/refs/' + file, credit, url});

const BUSSORAH = om('R03.webp', 'Bussorah Street · CC0');
const SULTAN = place('sg-sultan-mosque.jpg', 'Chainwit. · CC BY-SA 4.0', commons('Masjid_Sultan,_Singapore_(2023_June)_-_img_07.jpg'));

/** stop id → the photo of the place, and (where it differs) the photo of the detail to look for. */
const PHOTOS = {
  'only-one-missing-01': {place: BUSSORAH, detail: SULTAN},
  'only-one-missing-03': {place: om('R06.webp', 'Honeylemons · CC BY-SA 4.0')},
  'only-one-missing-04': {place: om('R13.webp', 'Josep M. Gracia · CC BY-SA 4.0', commons('KPG_-_Masjid_Sultan_from_Muscat_Street,_Singapore,_2019.jpg'))},
  'only-one-missing-05': {place: om('R14.webp', 'Marcin Konsek · CC BY-SA 4.0', commons('2016_Singapur,_Kampong_Glam,_Ulica_Kandahar,_Zdobiona_fasada_domu-sklepu_(01).jpg'))},
  'kampong-gelam-01': {place: BUSSORAH, detail: SULTAN},
  'kampong-gelam-06': {place: place('sg-malabar-mosque.jpg', 'M. Adrian Jurhami · CC BY 4.0', commons('The_Malabar_Mosque_at_Kampong_Glam.jpg'))},
  'kampong-gelam-07': {place: place('sg-malay-heritage-centre-istana-kampong-gelam.jpg', 'Elisa.rolle · CC BY-SA 4.0', commons('Malay_Heritage_Centre,_2012.jpg'))},
  'telok-ayer-03': {place: place('sg-nagore-dargah.jpg', 'Chainwit. 2025 · CC BY 4.0', commons('Chinatown_SG_-_Nagore_Durgha_(Nagore_Dargah)_Sufi_Shrine_(2025)_-_img_01.jpg'))},
  'telok-ayer-05': {place: place('sg-thian-hock-keng-temple.jpg', 'Zairon · CC BY-SA 4.0', commons('Singapore_Tempel_Thian_Hock_Keng_1.jpg'))},
  'telok-ayer-07': {place: place('sg-al-abrar-mosque.jpg', 'Chainwit. · CC BY 4.0', commons('Al-Abrar_Mosque_SG_(2025)_-_img_04.jpg'))},
  'telok-ayer-08': {place: place('sg-telok-ayer-chinese-methodist-church.jpg', 'Marcin Konsek 2016 · CC BY-SA 4.0', commons('2016_Singapur,_Chinatown,_Ulica_Telok_Ayer,_Chiński_Kościół_Metodystyczny_(01).jpg'))},
  'civic-f1-01': {place: place('sg-chijmes.jpg', 'Wikimedia Commons contributor · CC BY-SA 3.0', commons('CHIJMES_3,_Jan_06.JPG'))},
  'civic-f1-02': {place: place('sg-old-hill-street-police-station.jpg', 'GoAheadFan95 2025 · CC BY-SA 4.0', commons('Old_Hill_Street_Police_Station,_October_2025.jpg'))},
  'civic-f1-03': {place: place('sg-the-arts-house-old-parliament-house.jpg', 'Balon Greyjoy · CC0', commons('20190819_The_Arts_House-1.jpg'))},
  'civic-f1-04': {place: place('sg-cavenagh-bridge.jpg', 'Marcin Konsek · CC BY-SA 4.0', commons('2016_Singapur,_Downtown_Core,_Most_Cavenagha_(02)_(cropped).jpg'))},
  'civic-f1-06': {place: place('sg-victoria-theatre-and-concert-hall.jpg', 'TTangMonuments · CC BY-SA 4.0', commons('Victoria_Theatre_and_Victoria_Concert_Hall,_with_54m_high_Clock_Tower.jpg'))},
  'civic-f1-08': {place: place('sg-tan-kim-seng-fountain.jpg', 'Actuall7 · CC BY 4.0', commons('Tan_Kim_Seng_Fountain,_2026_01.jpg'))},
};

/** The real photo for a stop: `kind` 'place' (checking in) or 'detail' (the thing to look for). Null when there is none. */
export function photoOf(stopId, kind = 'place') {
  const p = PHOTOS[stopId];
  return p ? (kind === 'detail' && p.detail) || p.place : null;
}

/** Where a stop is (OneMap and NHB points), or null. */
export function pinOf(stopId) {
  const p = pins.stops[stopId] || OM_PINS[stopId];
  return p ? {lat: p.lat, lng: p.lng} : null;
}

/** Metres between two points (haversine). */
export function metresBetween(a, b) {
  const r = Math.PI / 180, R = 6371000;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "80 m", "1.2 km". */
export const distanceLabel = m => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

/** Web Mercator pixels at a zoom (256px tiles), for placing a dot on a map centred elsewhere. */
export function worldPx({lat, lng}, z) {
  const s = 256 * 2 ** z, sin = Math.sin((lat * Math.PI) / 180);
  return {x: ((lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s};
}
