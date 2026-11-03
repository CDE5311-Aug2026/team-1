/* Hunt (2 Nov 2026, owner: "every clue needs at least two layers of mechanism; some pieced together like a jigsaw,
 * where laying a piece down does not unlock anything by itself; some a combination lock; all from the info cards").
 * Each stop keeps its building mechanism as layer I. What it opens is locked again: a strongbox whose number comes
 * from the stop's place file, or a torn page whose words are the place file's own history. The last stop of each
 * hunt has a third layer: the torn page gives the number for the last lock. */

const lock = (code, title, instruction) => ({
  type: 'lock', code, title, instruction,
  items: [{id: 'strongbox', label: 'Strongbox'}],
  foundText: 'Click. The shackle springs and the lid lifts.',
});

/** Torn pieces in reading order; `tray` is the order they lie in, `turns` how far each starts turned. */
const page = (title, instruction, words, tray, turns, cols = 2, foundText = 'The torn edges meet and the page reads true.') => ({
  type: 'jigsaw', title, instruction, cols, foundText,
  items: tray.map(n => ({id: `piece-${n + 1}`, label: `Torn piece: ${words[n]}`, text: words[n], cell: n, turn: turns[n]})),
});

const HISTORY = 'The number is on the History sheet of this place file.';
const PAGE = 'Lay the torn pieces in the frame and turn them until the page reads like the History sheet. Nothing clicks until every piece sits right.';

/** Layers II (and III) for every stop, and what layer I now reveals. */
export const LAYERS = {
  'telok-ayer-01': {reveal: 'Inside the envelope: a small strongbox with four number wheels.', add: [lock('1824', 'The year the shrine was founded', `Four wheels. ${HISTORY} Swipe each wheel to its digit.`)]},
  'telok-ayer-02': {reveal: 'Behind the panel the page is torn in four.', add: [page('Who the house was founded for', PAGE, ['FOUNDED 1822', 'FOR HAKKA', 'FROM FIVE', 'COUNTIES'], [2, 0, 3, 1], [1, 3, 2, 1])]},
  'telok-ayer-03': {reveal: 'The insert is pinned under a strongbox lid.', add: [lock('2011', 'When the heritage centre moved in', `Four wheels. ${HISTORY}`)]},
  'telok-ayer-04': {reveal: 'The rebuilt storeys hold a page torn in four.', add: [page('Who met here, and when', PAGE, ['1831', '36 MERCHANTS', 'MUTUAL', 'AID'], [3, 1, 0, 2], [2, 1, 3, 1])]},
  'telok-ayer-05': {reveal: 'The ridge lifts on a strongbox.', add: [lock('1839', 'The year the big temple was begun', `Four wheels. ${HISTORY} It took three years.`)]},
  'telok-ayer-06': {reveal: 'Under the cover, two school records torn into six.', add: [page('Two buildings, two beginnings', PAGE, ['BUILT', '1849', 'TAN KIM SENG', "GIRLS'", 'SCHOOL', '1915'], [4, 1, 5, 0, 3, 2], [1, 2, 3, 3, 1, 2], 3)]},
  'telok-ayer-07': {reveal: 'The street record is locked in a strongbox.', add: [lock('1827', 'The year of the attap hut', `Four wheels. ${HISTORY}`)]},
  'telok-ayer-08': {reveal: 'The roof comes away from a page torn in four, and a strongbox under it.', add: [
    page('The church in two dates and one war', PAGE, ['BEGUN 1889', 'BUILT 1925', 'SHELTER FOR', '300 PEOPLE'], [1, 3, 0, 2], [3, 1, 1, 2], 2, 'The page reads true. The box under it wants a number from it.'),
    lock('300', 'How many it sheltered', 'Three wheels. The torn page you just mended says.'),
  ]},

  'kampong-gelam-01': {reveal: 'The interview sheet was torn in four.', add: [page('What this stretch was called', PAGE, ['KAMPONG', 'KAJI', 'PILGRIMS', 'WAITED'], [2, 3, 1, 0], [1, 2, 3, 1])]},
  'kampong-gelam-02': {reveal: 'The residents’ page is in a strongbox.', add: [lock('1912', 'The year Haji Yusoff bought it', `Four wheels. ${HISTORY}`)]},
  'kampong-gelam-03': {reveal: 'Between the wings, a page torn in four.', add: [page('Two schools under one roof', PAGE, ["BOYS' WING", "GIRLS' WING", 'ONE', 'SHARED HALL'], [3, 0, 2, 1], [2, 3, 1, 1])]},
  'kampong-gelam-04': {reveal: 'The set type is locked in a strongbox.', add: [lock('101', 'The press’s house number', 'Three wheels. The number is on the Place sheet of this place file.')]},
  'kampong-gelam-05': {reveal: 'The delivery book hides a page torn in four.', add: [page('Who founded the school', PAGE, ['FOUNDED', '1912', 'ALSAGOFF', 'FAMILY'], [1, 2, 0, 3], [3, 3, 1, 2])]},
  'kampong-gelam-06': {reveal: 'The dome lifts on a strongbox.', add: [lock('1963', 'The year the mosque opened', `Four wheels. ${HISTORY}`)]},
  'kampong-gelam-07': {reveal: 'The front page is torn in four, and a strongbox sits under it.', add: [
    page('The palace today', PAGE, ['MALAY', 'HERITAGE', 'CENTRE', 'REOPENED'], [2, 0, 3, 1], [1, 2, 2, 3], 2, 'The page reads true. The box wants the day it reopened.'),
    lock('2504', 'The day and month it reopened', 'Four wheels: day, then month. The History sheet has the date.'),
  ]},

  'balestier-01': {reveal: 'Behind the two scenes, a strongbox.', add: [lock('1847', 'The year the labourers founded the temple', `Four wheels. ${HISTORY}`)]},
  'balestier-02': {reveal: 'The name board was torn in four.', add: [page('Whose name is on the corner', PAGE, ['SIM', 'KWONG HO', 'BUILT', '1926'], [3, 1, 2, 0], [2, 1, 1, 3])]},
  'balestier-03': {reveal: 'The coffee page is locked away.', add: [lock('1960', 'The year the coffee shop opened', `Four wheels. ${HISTORY} Not the year he sold on the street.`)]},
  'balestier-04': {reveal: 'The street view tears into six.', add: [page('Who drew this corner', PAGE, ['DESIGNED', 'BY KWAN', 'YOW LUEN', '1928', 'P. RAMLEE', 'FILM'], [5, 2, 0, 4, 1, 3], [1, 3, 2, 1, 2, 3], 3)]},
  'balestier-05': {reveal: 'The free-water record is in a strongbox.', add: [lock('1950', 'The year the charities merged', `Four wheels. ${HISTORY}`)]},
  'balestier-06': {reveal: 'The three memories open on a strongbox.', add: [lock('1878', 'Where it began: the year on Kinta Road', `Four wheels. ${HISTORY}`)]},
  'balestier-07': {reveal: 'The crew list is torn in four, and a strongbox sits under it.', add: [
    page('The studio’s twenty years', PAGE, ['STUDIO', 'REOPENED 1947', 'AND CLOSED', '1967'], [1, 3, 0, 2], [3, 2, 1, 1], 2, 'The page reads true. The box wants the last year on it.'),
    lock('1967', 'The year the cameras stopped', 'Four wheels. The torn page you just mended says.'),
  ]},

  'civic-f1-01': {reveal: 'The correction strip is locked in a strongbox.', add: [lock('1854', 'The year the convent began its care', `Four wheels. ${HISTORY}`)]},
  'civic-f1-02': {reveal: 'The family page was torn in four.', add: [page('Who lived at the station', PAGE, ['COMPLETED', '1934', 'HOMES FOR', 'FAMILIES'], [2, 0, 3, 1], [1, 1, 3, 2])]},
  'civic-f1-03': {reveal: 'The three events are sealed in a strongbox.', add: [lock('1871', 'The year of the king’s visit', `Four wheels. ${HISTORY}`)]},
  'civic-f1-04': {reveal: 'The mark plate covers a page torn in four.', add: [page('What the mark on the bridge is', PAGE, ['BENCHMARK', '1882', 'BROAD ARROW', 'LEVEL LINE'], [3, 2, 0, 1], [2, 3, 1, 1])]},
  'civic-f1-05': {reveal: 'The monument stands on a strongbox.', add: [lock('1850', 'The year of the Governor-General’s visit', `Four wheels. ${HISTORY}`)]},
  'civic-f1-06': {reveal: 'The two names tear apart into four.', add: [page('The hall’s two names', PAGE, ['MEMORIAL', 'HALL', 'RENAMED', '1979'], [1, 3, 2, 0], [3, 1, 2, 2])]},
  'civic-f1-07': {reveal: 'The postcard is locked to the turn it names.', add: [lock('14', 'The turn by Esplanade Bridge', `Two wheels. ${HISTORY}`)]},
  'civic-f1-08': {reveal: 'The last line is torn in four, and a strongbox sits under it.', add: [
    page('A gift and a fountain', PAGE, ['1857 GIFT', '$13,000', '1882', 'FOUNTAIN'], [2, 0, 3, 1], [2, 1, 3, 1], 2, 'The page reads true. The box asks how long the city waited.'),
    lock('25', 'The years between gift and fountain', 'Two wheels. Count them from the page you just mended.'),
  ]},
};

/** A stop's building mechanism becomes layer I of a chain; what it used to reveal at the end stays the stop's find. */
export function layered(stop) {
  const extra = LAYERS[stop.id];
  if (!extra || stop.quest?.type === 'chain') return stop;
  const first = {...stop.quest, foundText: extra.reveal};
  return {...stop, quest: {type: 'chain', title: stop.quest.title, instruction: stop.quest.instruction, foundText: stop.quest.foundText, stages: [first, ...extra.add]}};
}
