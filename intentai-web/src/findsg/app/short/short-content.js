// Beneath the Golden Dome: a hunt in Kampong Gelam. Only the first building is given. Everything after it is earned:
// a photo of the right detail, a parcel hidden behind it, a line of backwards type, and a guess on a rough sketch.
// The buildings and their history are from the sources below; Ah Ning, Yusof, the parcel and the clues are fiction.
export const SHORT_EPISODE = {
  id: 'gold-under-glass', title: 'Beneath the Golden Dome', english: 'THE GLASS BENEATH THE GOLD', district: 'Kampong Gelam',
  subtitle: 'An ordinary thing, worth a city remembering.',
  hero: './assets/cinematic/gold-under-glass.png',
  premise: 'A typesetter hid the last line of a street paper in Kampong Gelam and never came back for it. Start at the old press. The street will tell you the rest.',
  start: {address: '101 Jalan Sultan', area: 'Kampong Gelam', radius: 'Everything is within a 5-minute walk'},
  letter: 'To whoever picks this up,\n\nLast week I bought an old type case. In its bottom drawer was a note from Yusof, who once set type at the press on Jalan Sultan:\n\n“Our last line was never printed. I hid it at the press, behind the tall window under the arch. Whoever finds it will know where it belongs.”\n\nI don’t know where it belongs. I only know where it starts: 101 Jalan Sultan.\n\nAh Ning\nEditor, the folded street paper',
  places: [
    {id: 'press', name: 'The old press', english: 'Former Al-Ahmadiah / HARMY Press', address: '101 Jalan Sultan, Singapore 199002', today: 'Today: The Sultan',
      phone: '+65 6723 7101', website: 'https://www.thesultan.com.sg/about',
      prompt: 'Stand across from No. 101. Find a tall louvred window with an arch above it.',
      frame: 'Frame the arch above the tall window, then take the photo.',
      hint: 'Look past the columns to the long louvred windows. The curve above them is the arch.',
      view: 'Everything can be seen from the public walkway outside No. 101. There is no need to enter the hotel.',
      fact: 'No. 101 was once home to the Al-Ahmadiah and HARMY presses. A 1959 issue of the magazine Fesyen was printed here by HARMY Press. Old Malay magazines named their printers in one line of small type: “Di-chetak oleh”, printed by.',
      sourceIds: ['ura', 'publisher', 'hotel']},
    {id: 'mosque', name: 'Sultan Mosque', english: 'Masjid Sultan', address: '3 Muscat Street, Singapore 198833', today: 'Below the golden dome, a dark band',
      phone: '+65 6293 4405', website: 'https://www.sultanmosque.sg/',
      prompt: 'Look at the golden dome, then lower, where it meets the building: there is a dark band.',
      frame: 'Frame the dark band below the dome, then take the photo.',
      hint: 'The band sits between the gold and the base that carries it.',
      view: 'Look from the public street on the Muscat Street or Bussorah Street side. There is no need to enter the prayer hall.',
      fact: 'When the mosque was rebuilt (1928 to 1932), people who had little money gave glass bottles. Their ends were set into the dark band at the foot of the dome. That they were soy sauce bottles is oral tradition.',
      sourceIds: ['monument', 'nlb', 'mosque']},
  ],
  // what the parcel behind the shutter holds
  parcel: [
    {id: 'stick', name: 'A composing stick', text: 'A line of metal type, still locked in. The letters are backwards.'},
    {id: 'glass', name: 'A disc of dark glass', text: 'The end of a bottle, worn smooth.'},
    {id: 'slip', name: 'A printer’s slip', text: '“Di-chetak oleh ______” · printed by… The name is blank.'},
  ],
  // the line Yusof set; metal type reads backwards until you hold it to a mirror
  mirrorLines: ['BENEATH THE GOLD', 'THE GLASS OF THE POOR'],
  // the rough sketch of the area: one place fits the line
  landmarks: [
    {id: 'mansion', label: 'A yellow mansion', x: 22, y: 30, miss: 'Yellow, not gold. And no glass to speak of.'},
    {id: 'dome', label: 'A golden dome over the roofs', x: 64, y: 22},
    {id: 'lane', label: 'A lane of painted walls', x: 78, y: 62, miss: 'Bright paint, but nothing golden overhead.'},
    {id: 'shops', label: 'Shops full of cloth', x: 40, y: 76, miss: 'Rolls of cloth, not glass.'},
  ],
  pressAt: {x: 26, y: 58},
  // the blank on the slip, filled at the end
  lastLine: {malay: 'Di-chetak oleh orang ramai', english: 'Printed by the many'},
  reply: '“Yusof’s line is set at last. Next time you look at a building, look a little longer: past its brightest part, who else left something of themselves there?” · Ah Ning',
  sources: [
    {id: 'ura', label: 'URA · 101 Jalan Sultan', url: 'https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/kpgl-00075/', note: 'Site of the old press, its restoration and its use today.'},
    {id: 'publisher', label: 'NHB / MHC · Dichetak Oleh', url: 'https://www.roots.gov.sg/stories-landing/stories/dichetak-oleh-a-walk-through-kampong-gelam/story', note: 'The printer’s line at the back of magazines, with a 1959 issue of Fesyen.'},
    {id: 'hotel', label: 'The Sultan · About the building', url: 'https://www.thesultan.com.sg/about', note: 'Tall columns, wide arches, long louvred windows and the No. 101 address.'},
    {id: 'monument', label: 'NHB · Sultan Mosque', url: 'https://www.roots.gov.sg/places/places-landing/Places/national-monuments/sultan-mosque', note: 'The rebuilding, community donations and the band of glass bottles below the dome.'},
    {id: 'nlb', label: 'NLB · History of the domed building', url: 'https://biblioasia.nlb.gov.sg/all-sections/vol-9-issue-1-apr-jun-2013-tradition-indo-saracenic/', note: 'Rebuilding proposed in 1924, begun in 1928, opened in 1929, completed in 1932; the “soy sauce bottle” is oral tradition.'},
    {id: 'mosque', label: 'Sultan Mosque · Official information', url: 'https://www.sultanmosque.sg/', note: 'Address and contact details.'},
  ],
  distinction: 'The buildings, the press history and the glass bottles are from the sources. Ah Ning, Yusof, the hidden parcel and the clues are fiction. No source links the press to the mosque’s rebuilding.',
  access: 'On-site check-ins are self-reported; location is not checked. Photos stay on your phone and are not checked either. Remote play is kept apart from real visits.',
};
export function shortMap(place) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`; }
export function shortDirections() { return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SHORT_EPISODE.places[0].address)}&destination=${encodeURIComponent(SHORT_EPISODE.places[1].address)}&travelmode=walking`; }
