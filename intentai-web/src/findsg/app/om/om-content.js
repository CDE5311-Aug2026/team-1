/* Hunt (2 Nov 2026, owner: "all future demos are built from this story"): Only One Missing, KeyScript v3.5 / pack v3.7,
 * set in Kampong Gelam. It runs in the same stop shell as every other hunt (check in, observe, solve, keep the clue,
 * the night race, the Clues bag); its puzzles are hand-held props (PropStage.jsx) instead of building models.
 * Fiction rules kept from the script: no real person or business; real institutions are never villains; Sam's face is
 * never shown; Sultan Mosque is seen from outside only; the missing piece exists only in a fictional archive model;
 * the back-lane gallery and its works are never named or shown; nobody pays, bids or waits at the scene. */

export const OM_ID = 'only-one-missing';

export const OM_META = {
  area: 'Kampong Gelam', en: 'KAMPONG GELAM', title: 'Only One Missing', motif: 'ONLY ONE MISSING',
  tag: 'Glass · Forgery · Night lamps', asset: 'only-one-missing', accent: '#c9a24a',
  date: 'Six days ago · a maintenance night', object: 'Open the case bag', action: 'open', power: 'Inspect', no: '05',
  material: 'Green glass / brass / batik', quote: 'Everyone checks the top. Nobody checks underneath.',
};

const NHB = 'https://www.roots.gov.sg/-/media/Roots/Files/kampong-glam-heritage-trail/kampongglamtrail3-brochure.pdf?la=en';
const MFA = 'https://www.mfa.gov.sg/';
const URA = 'https://www.ura.gov.sg/conservation/';

/** The six real places, as the place file reads them. */
const PLACES = [
  {name: 'Bussorah Street', english_name: 'Bussorah Street, facing Sultan Mosque', address: 'Bussorah Street pedestrian mall, facing Sultan Mosque',
    historical_fact: 'Renamed Bussorah Street in 1909. The stretch by the mosque was Kampong Kaji, where pilgrims waited for ships. The mosque was rebuilt from 1924; worshippers gave glass bottles, set into the base of the domes. National monument since 1975.',
    source_urls: [NHB], access_note: 'Outside only. The game pauses at prayer times.'},
  {name: 'Baghdad Street', english_name: 'Baghdad Street (Kampong Intan)', address: 'Baghdad Street, between Bussorah Street and Arab Street',
    historical_fact: 'Once Little Cross Street, renamed in 1909. Old residents called it Kampong Intan, the diamond village: Banjarese diamond traders and cutters lived here.',
    source_urls: [NHB], access_note: 'A walk-through stop. Read on the move.'},
  {name: 'Arab Street', english_name: 'Arab Street five-foot way', address: 'Arab Street, under the five-foot way',
    historical_fact: 'One of the few streets here to keep its early-1800s name. Cloth, rattan, gold and printing shops; old residents remember kain pelakat sold by the bolt.',
    source_urls: [NHB], access_note: 'The mould shop is fictional. It opens only in the app.'},
  {name: 'Muscat Street', english_name: 'Muscat Street, granite arch', address: 'Muscat Street, by the arch',
    historical_fact: 'Named in 1909 after Muscat in Oman. Reopened on 8 November 2012 after a Singapore–Oman makeover: two granite arches about 8 m tall, and stone frames painted by Omani artists. The Jewel of Muscat sailed in to Singapore in 2010.',
    source_urls: [MFA, NHB], access_note: 'Look, do not touch. Keep the path clear.'},
  {name: 'Kandahar Street', english_name: 'Kandahar Street, upper floors', address: 'Kandahar Street, from the far five-foot way',
    historical_fact: 'Named in 1909 after Kandahar. A showcase of shophouse styles: Nos. 44–54 are Late style (tiles, plaster reliefs); No. 18 is Art Deco (geometric lines).',
    source_urls: [URA, NHB], access_note: 'Photograph the upper floors only. Shops below are open.'},
  {name: 'Muscat Street back lane', english_name: 'Back lane behind Muscat Street', address: 'Lane entrance at the Baghdad Street end',
    historical_fact: 'Two parallel back lanes once used for bins and deliveries, later turned into an open-air gallery, open around the clock.',
    source_urls: [NHB], access_note: 'Homes and kitchens are close. Confirm the spot and leave.'},
].map((p, i) => ({...p, id: `om-0${i + 1}`, order: i + 1, field_verified: false}));

export const OM_STORY = {
  id: 'only-one-missing-case', route_id: OM_ID, title: OM_META.title, area: OM_META.area,
  subtitle: 'A piece in a museum case may not be the piece the curator signed for.', stops: PLACES,
};

/** What the book and the cards read. */
export const OM_GAME = {
  routeId: OM_ID, title: 'Only One Missing', kicker: 'Six places, three night lamps, one swap',
  logline: 'A curator suspects the glass piece in her case was swapped on a maintenance night. Find who swapped it, and where the real one is tonight.',
  playerRole: 'Provenance investigator (fictional assignment)',
  mission: 'Who swapped it, and where it is tonight. Evidence only, no hunches.',
  guideName: 'Aini', guideRole: 'A fictional museum curator; the case, the auction and every character are invented.',
  prologue: [
    {speaker: 'Aini', text: 'I think the piece in our case was swapped. I cannot prove it.'},
    {speaker: 'Aini', text: 'The case file is on Bussorah Street. Bring evidence, not instinct.'},
  ],
  goalLabel: 'Seal four pieces of evidence',
  ending: {title: 'Cancelled at 19:52',
    text: 'Aini passed the envelope to the police at 18:05. At 19:40 Sam handed the real piece back; at 19:52 the auction page read “Cancelled” and the three lamps went out. Next morning the museum added one line to its rules: after maintenance, two people check the underside. Master Lin cut R and 07-04 into a new piece: “This one says what it is.”',
    reflection: 'In reality the bottle band under Sultan Mosque’s dome is whole. Nothing was removed or sold; there is no such auction.'},
  stops: [
    {id: 'only-one-missing-01', chapterTitle: 'Only one missing', objective: 'Prove which piece is real.', discovery: {title: 'Evidence 01 · The gap fits', text: 'The lot online fits the archive gap. The piece in the case is a cast copy.'}},
    {id: 'only-one-missing-02', chapterTitle: 'Makers know their marks', objective: 'Find who made the copy.', discovery: {title: 'Evidence 02 · Marked R', text: 'Only one mould shop cuts R and a cast number. Cloth and carpets face its door: Arab Street.'}},
    {id: 'only-one-missing-03', chapterTitle: 'Two in, two out', objective: 'Read the cast number and find who ordered it.', discovery: {title: 'Evidence 03 · 07-03 · Y. · 4471', text: 'Copy 07-03 was ordered by “Y.”. The cut batik edge matches the bundle Sam carried in. Y. is Sam.'}},
    {id: 'only-one-missing-04', chapterTitle: 'A 1975 certificate, a 2012 wall', objective: 'Find the first lamp and its password.', discovery: {title: 'Evidence 04 · The certificate lies', text: 'The border copies a wall painted in 2012. Password: DALLAH.'}},
    {id: 'only-one-missing-05', chapterTitle: 'The seller shows his hand', objective: 'Find the second lamp.', discovery: {title: 'Evidence 05 · Payee Y. · 4471', text: 'The deposit card pays Y., phone ending 4471. The swapper is the seller.'}},
    {id: 'only-one-missing-06', chapterTitle: 'We do not wait here', objective: 'Find the third lamp, then hand it over.', discovery: {title: 'Evidence 06 · Tonight, 20:00', text: 'Muscat Street back lane, 20:00. Same account, pinned at 22:35 that night. The envelope goes to the police.'}},
  ],
};

const look = (title, instruction, target, detail, note, urls) => ({title, instruction, photoTarget: target, detailToFind: detail, referenceNote: note, sourceUrls: urls, photoRecommended: true});
/** A hand-held prop puzzle: `items` are what can be offered, `answer` the one that is right, `misses` what a wrong one says. */
const prop = (kind, title, instruction, answer, items, extra = {}) => ({type: 'prop', kind, title, instruction, answer,
  items: items.map(([id, label]) => ({id, label})), ...extra});
const chain = (title, stages, foundText) => ({type: 'chain', title, instruction: stages[0].instruction, foundText, stages});
const stop = (id, name, at, sceneLine, objective, observation, quest, reward, transition) =>
  ({id, name, at, modelKind: 'prop', sceneLine, objective, observation, quest, reward: {id: `${id}-onsite-discovery`, ...reward}, transition});

const g = OM_GAME.stops;
const STOPS = [
  stop('only-one-missing-01', 'Bussorah Street', 'Facing Sultan Mosque',
    'The case file is somewhere on this street. Look around.',
    'Find the case bag, compare the two pieces, then test them on the archive band.',
    look('The dark band under the gold', 'From the pedestrian mall, look up at the main dome. Under the gold runs a dark band: the bottle bases.', 'The dome and the whole dark band under it, in one frame. No worshippers.', 'The dark band of bottle bases under the dome.', 'Remote: the archive photo stands in for the street.', [NHB]),
    chain('Only one missing', [
      prop('bag', 'The case bag', 'Look around. Lift the clasp.', 'open', [['open', 'Brass clasp']], {foundText: 'A letter, an invitation, a CCTV clip and the exhibit page.'}),
      prop('compare', 'Lot against case', 'Turn both over. Tap each difference.', 'three', [['three', 'Three differences']], {foundText: 'The top matches; underneath does not.'}),
      prop('band', 'The archive band', 'Swipe the band round. Fit an edge in the gap.', 'lot', [['lot', 'Edge from the lot'], ['case', 'Edge from the case']],
        {misses: {case: 'A gap stays. A round edge, no hook.'}}),
    ], 'The one online is real. The one in the case went in six days ago.'),
    g[0].discovery, {text: 'The case piece carries a mould maker’s scratches. Which maker?', cta: 'On to Baghdad Street'}),

  stop('only-one-missing-02', 'Baghdad Street', 'Kampong Intan',
    'Diamond cutters, coppersmiths, mould makers. Every maker knows their mark.',
    'Find the mould shop that marks its pieces, then the street it faces.',
    look('Kampong Intan', 'Walk Baghdad Street. Diamond traders and cutters once lived here; coppersmiths made cake moulds round the corner.', 'Any stretch of the street. Avoid shop signs.', 'Old trades: the street of makers.', 'A walk-through stop. Read as you go.', [NHB]),
    chain('Makers know their marks', [
      prop('catalogue', 'The mould directory', 'Turn the cards. File the one that matches.', 'r', [['plain', 'Shop A'], ['r', 'Shop B'], ['top', 'Shop C']],
        {misses: {plain: 'Shop A marks nothing.', top: 'Shop C stamps the top. The case piece is marked underneath.'}}),
      prop('pinmap', 'Across the five-foot way', 'Pin the photo to its street.', 'arab', [['arab', 'Arab Street'], ['bussorah', 'Bussorah Street'], ['baghdad', 'Baghdad Street']],
        {misses: {bussorah: 'Palms and the dome, no bolts of cloth.', baghdad: 'You are standing on it. No carpets across the way.'}}),
    ], 'Cloth on one side, carpets on the other. Arab Street.'),
    g[1].discovery, {text: 'A mould shop behind a five-foot way on Arab Street.', cta: 'On to Arab Street'}),

  stop('only-one-missing-03', 'Arab Street', 'Five-foot way',
    'Cloth on one side, carpets on the other. Like the photo.',
    'Open the shop, read the cast number, match the cloth.',
    look('Columns and bolts of cloth', 'Stand under the five-foot way. Frame a run of columns with the bolts of cloth across the street.', 'Columns in a row, cloth across the way. No faces, no signs.', 'Columns, and cloth across the street.', 'The shop is fictional and opens only in the app.', [NHB]),
    chain('Two in, two out', [
      prop('door', 'The green door', 'Slide the bolt.', 'open', [['open', 'Brass bolt']], {foundText: 'Master Lin: “Every piece I make has an R.”'}),
      prop('ring', 'The cast number', 'Lock each photo by its notch. Read clockwise from R.', '0703', [['0703', '07-03'], ['0702', '07-02'], ['0307', '03-07'], ['0803', '08-03']],
        {misses: {'0702': 'Lin lifts 07-02 out of the sample box. “It is here.”', '0307': 'No mould 03. Read clockwise.', '0803': 'No mould 08. One of those marks is a scratch.'},
          miss: 'No such entry in the register.', foundText: '07-03. Ordered by “Y.”, phone ending 4471.'}),
      prop('batik', 'Half a cloth', 'Fit Lin’s half beside the CCTV half.', 'match', [['match', 'Cut edge']]),
    ], 'In two, out two. Y. is Sam.'),
    g[2].discovery, {text: 'Lin: “This boat, two flags. Muscat Street, in a stone frame.”', cta: 'On to Muscat Street'}),

  stop('only-one-missing-04', 'Muscat Street', 'Granite arch',
    'The first lamp sits beside the boat on the certificate border.',
    'Find the boat, lay the certificate on it, read the password.',
    look('The stone frames', 'From the arch, look along the row of pointed stone frames. Find the boat flying two flags.', 'The boat frame with both flags. Do not touch the wall.', 'A boat under two flags, a coffee pot beside it.', 'Remote: the archive photo stands in for the wall.', [MFA]),
    chain('A 1975 certificate, a 2012 wall', [
      prop('lamprow', 'The first lamp', 'Carry the lamp to its frame.', 'ship', [['castle', 'Fort'], ['dagger', 'Dagger'], ['ship', 'Boat'], ['pot', 'Coffee pot'], ['palm', 'Palm']],
        {misses: {castle: 'No boat here.', dagger: 'No boat here.', pot: 'Close. The boat is next door.', palm: 'No boat here.'}}),
      prop('overlay', 'The certificate border', 'Lay the fragment over the boat.', 'aligned', [['aligned', 'Fragment']], {foundText: 'On its back: “the one to the right”.'}),
      prop('letters', 'The coffee pot', 'What hangs to the right of the boat?', 'DALLAH', [['DALLAH', 'DALLAH']], {miss: 'The lamp stays dark.'}),
    ], 'A 1975 certificate copied a 2012 wall.'),
    g[3].discovery, {text: 'The first lamp drops a blurred photo: upper floors, seen past an arch.', cta: 'Through the far arch'}),

  stop('only-one-missing-05', 'Kandahar Street', 'Upper floors',
    'Round plaster flowers, green shutters. Look up.',
    'Match the blurred photo, then open the preview pack.',
    look('Look up', 'From the far five-foot way, look at the upper floors. Late style: tiles and plaster flowers. Art Deco: clean lines.', 'Upper floors only. No shopfronts, numbers or signs.', 'Round plaster flowers and green shutters.', 'Remote: the archive photo stands in for the facade.', [URA]),
    chain('The seller shows his hand', [
      prop('facade', 'Which facade?', 'Lay the photo on its facade.', 'late', [['late', 'Late style'], ['deco', 'Art Deco']],
        {misses: {deco: 'Clean lines, no plaster flowers.'}}),
      prop('pack', 'The preview pack', 'Pull the string. Match the payee.', 'match', [['match', 'Payment card'], ['notice', 'Notice'], ['pin', 'Pin record'], ['photo', 'Photo']],
        {misses: {notice: 'Not a name.', pin: 'Not a name.', photo: 'Not a name.'}, foundText: 'Payee Y., 4471. We are not paying.'}),
    ], 'The swapper and the seller are the same man.'),
    g[4].discovery, {text: 'The notice: a back lane, framed works, a painted bin, two lanes side by side.', cta: 'To the back lane'}),

  stop('only-one-missing-06', 'Muscat Street back lane', 'Baghdad Street end',
    'Two lanes, side by side. Confirm it and go.',
    'Find the live lamp, then seal the evidence.',
    look('From the lane mouth', 'Stand outside the lane on the public road. Two facing walls, frames, a painted bin.', 'The lane mouth only. No single artwork, no readable signs.', 'Two facing walls and a painted bin.', 'Do not wait here. Confirm, and leave.', [NHB]),
    chain('We do not wait here', [
      prop('lanelamps', 'The third lamp', 'Hold a lamp to light it.', 'live', [['live', 'Bright lamp'], ['old', 'Dim lamp']],
        {misses: {old: 'Expired. Pinned seven days ago.'}, foundText: '20:00 tonight. Same account. Pinned 22:35.'}),
      prop('envelope', 'The envelope', 'Seal four: what, who swapped, who sells, where.', 'sealed', [['sealed', 'Envelope']],
        {miss: 'True, but it names no one and no place.'}),
    ], 'Sealed at 18:05.'),
    g[5].discovery, {text: 'Aini has it. Now it is theirs.', cta: 'Close the case'}),
];
// Wikimedia Commons photos under CC BY-SA, credited where they are used (pack: docs/credits-v3.7.md). A puzzle uses R06;
// the films after stops 2, 3 and 4 were made from R07, R13 and R14. R03 (the Bussorah Street panorama) is CC0.
const commons = (author, file) => ({text: `${author} · CC BY-SA 4.0`, url: `https://commons.wikimedia.org/wiki/File:${file}`});
const CREDITS = {
  'only-one-missing-02': [commons('Honeylemons', 'ArabStreet_01.jpg'), commons('Honeylemons', 'ArabStreet_04.jpg')],
  'only-one-missing-03': [commons('Josep M. Gracia', 'KPG_-_Masjid_Sultan_from_Muscat_Street,_Singapore,_2019.jpg')],
  'only-one-missing-04': [commons('Marcin Konsek', '2016_Singapur,_Kampong_Glam,_Ulica_Kandahar,_Zdobiona_fasada_domu-sklepu_(01).jpg')],
};
for (const s of STOPS) if (CREDITS[s.id]) s.observation.credits = CREDITS[s.id];
export const OM_ONSITE = {routeId: OM_ID, stops: STOPS};

/** Map pins (approximate: OneMap street positions, to check on site). */
export const OM_PINS = {
  'only-one-missing-01': {lat: 1.301617, lng: 103.8596}, 'only-one-missing-02': {lat: 1.30205, lng: 103.86005}, 'only-one-missing-03': {lat: 1.30082, lng: 103.85962},
  'only-one-missing-04': {lat: 1.30266, lng: 103.85954}, 'only-one-missing-05': {lat: 1.30318, lng: 103.85958}, 'only-one-missing-06': {lat: 1.30252, lng: 103.86012},
};

/** The pack's films: the prologue, the CCTV clip inside the bag, one after each stop, the finale. */
export const OM_FILMS = {intro: 'OM-01', bag: 'OM-02', stops: {2: 'OM-03', 3: 'OM-04', 4: 'OM-05', 5: 'OM-06', 6: 'OM-07'}, ending: 'OM-08'};
