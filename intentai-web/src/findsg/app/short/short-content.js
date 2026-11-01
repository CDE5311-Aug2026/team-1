export const SHORT_EPISODE={
  id:'gold-under-glass',title:'Beneath the Golden Dome',english:'THE GLASS BENEATH THE GOLD',district:'Kampong Gelam',
  subtitle:'An ordinary thing, worth a city remembering.',
  hero:'./assets/cinematic/gold-under-glass.png',
  premise:'Ah Ning, an editor, is making a folded street paper. Two buildings are already drawn, but the last line is still blank. Take a proof book and a small parcel, and go and find the people hidden in the small print and beneath the golden dome.',
  letter:'To today’s explorer,\n\nI drew the buildings on this street, but I left out so many of the people who kept them standing. Please go to 101 Jalan Sultan first, find that arch, then turn to the last page of the proof book. Bring the parcel too: at the second building, you will know where what is inside belongs.\n\nAh Ning\nEditor of the street paper · fictional client',
  places:[
    {id:'press',name:'The old press',english:'Former Al-Ahmadiah / HARMY Press',address:'101 Jalan Sultan, Singapore 199002',today:'Today: The Sultan',phone:'+65 6723 7101',website:'https://www.thesultan.com.sg/about',
      prompt:'Look up for a tall louvred window and notice the outline of its top edge.',
      task:'Turn the model and find the upper window arch. Tap the curve to add it to the proof book.',
      view:'You can see the facade from the public walkway outside No. 101. The arch, tall columns and long louvred windows are backed by the building owner’s own material; there is no need to enter the hotel.',
      hint:'Look at the whole building first, then move your eye to the long upper windows. The window arch in the phone model can be lit up on its own.',
      fact:'101 Jalan Sultan was once home to the Al-Ahmadiah and HARMY presses. An NHB curated article shows a 1959 issue of Fesyen printed here by HARMY Press. The small print at the back of a magazine kept the names of those who made it, too.',
      sourceIds:['ura','publisher','hotel']},
    {id:'mosque',name:'Sultan Mosque',english:'Sultan Mosque · Masjid Sultan',address:'3 Muscat Street, Singapore 198833',today:'Below the golden dome, a dark band of detail',phone:'+65 6293 4405',website:'https://www.sultanmosque.sg/',
      prompt:'Look at the golden dome first, then at where it meets the building below: there is a band of a different colour.',
      task:'Find the band on the model. Open the parcel you brought, pick up the glass sample and place it back in the digital band.',
      view:'View the whole building from a public spot on the Muscat / Bussorah side where you may stand. Pick out the dark band first; the bottle ends can be enlarged in the model. There is no need to count bottles or enter the prayer space.',
      hint:'Look for the dark band between the golden dome and the base that carries it. The glass layout here is illustrative.',
      fact:'NHB records that the glass bottles at the base of the dome came from donations to the rebuilding by those who had little to give. NLB marks the specific “soy sauce bottle” version as oral tradition. Ordinary people’s gifts found a place on the building, too.',
      sourceIds:['monument','nlb','mosque']}
  ],
  pages:[
    {label:'FIELD IMPRESSION / 01',title:'The arch you found',body:'Today’s facade keeps its tall columns, wide arches and long louvred windows. What you just noticed matches the building in front of you to the site of the old press.'},
    {label:'A NAME IN SMALL TYPE / 02',title:'Di-chetak oleh',body:'“Printed by…”. NHB’s article on the area’s publishing history looks at this line of small print in old magazines, and shows a 1959 issue of Fesyen printed by HARMY Press at No. 101. Beyond the cover, there were people worth remembering too.'},
    {label:'NEXT ADDRESS / 03',title:'Look a little lower',body:'“Go to 3 Muscat Street. Beneath the golden dome there is another way ordinary people’s gifts were made visible. Take the parcel with you.”\n\n— Ah Ning’s commission (contemporary fiction)\n\nNext stop: Sultan Mosque, Singapore 198833.'}
  ],
  sources:[
    {id:'ura',label:'URA · 101 Jalan Sultan',url:'https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/kpgl-00075/',note:'Site of the old press, its restoration and its use today.'},
    {id:'publisher',label:'NHB / MHC · Dichetak Oleh',url:'https://www.roots.gov.sg/stories-landing/stories/dichetak-oleh-a-walk-through-kampong-gelam/story',note:'The printer’s line at the back of magazines, with a 1959 issue of Fesyen.'},
    {id:'hotel',label:'The Sultan · About the building',url:'https://www.thesultan.com.sg/about',note:'Tall columns, wide arches, long louvred windows and the No. 101 address.'},
    {id:'monument',label:'NHB · Sultan Mosque',url:'https://www.roots.gov.sg/places/places-landing/Places/national-monuments/sultan-mosque',note:'The rebuilding, community donations and the band of glass bottles below the dome.'},
    {id:'nlb',label:'NLB · History of the domed building',url:'https://biblioasia.nlb.gov.sg/all-sections/vol-9-issue-1-apr-jun-2013-tradition-indo-saracenic/',note:'Rebuilding proposed in 1924, begun in 1928, opened in 1929, completed in 1932; the “soy sauce bottle” is oral tradition.'},
    {id:'mosque',label:'Sultan Mosque · Official information',url:'https://www.sultanmosque.sg/',note:'Address and contact details. The main story only asks you to look from public areas outside.'}
  ],
  distinction:'The buildings, the publishing history and the glass bottle donations are based on sources. The editor, the commission letter, the proof book, the parcel and the assembly puzzle are contemporary fiction written for the story. No source claims a direct link between the former press and the mosque’s fundraising.',
  access:'On-site check-ins are self-reported and not location-verified yet. Remote play is saved separately and does not count as a site visit. The models are illustrative building studies; sight lines have not yet been checked on site.'
};
export function shortMap(place){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;}
export function shortDirections(){return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SHORT_EPISODE.places[0].address)}&destination=${encodeURIComponent(SHORT_EPISODE.places[1].address)}&travelmode=walking`;}
