import places from './explore/places.sg.json';
import {
  PLACE_AREAS,
  SUBJECTS,
  askFromCards,
  detectTopic,
  keyNumberOf,
  recommend,
  rewriteHere,
  subjectById,
  suggestionFor,
  topicsIn,
} from './cards';

const chinatown = subjectById('sg-chinatown')!;
const katong = subjectById('sg-katong')!;
const kampongGlam = subjectById('sg-kampong-glam')!;

describe('subjects', () => {
  it('maps every linked place to its catalogue area', () => {
    for (const [id, area] of Object.entries(PLACE_AREAS)) {
      const place = (places as { id: string; areaId: string }[]).find((p) => p.id === id);
      expect(place, id).toBeDefined();
      expect(place!.areaId, id).toBe(area);
    }
  });

  it('groups cards by the areas their places are in, most cards first', () => {
    expect(SUBJECTS[0].id).toBe('sg-chinatown');
    expect(chinatown.short).toBe('Chinatown');
    expect(chinatown.cards.map((c) => c.article.id).sort()).toEqual(['chicken-rice', 'sri-mariamman', 'thian-hock-keng']);
    expect(topicsIn(chinatown)).toEqual(['food', 'monument']);
    expect(katong.cards.map((c) => c.article.id).sort()).toEqual(['hari-raya-puasa', 'laksa']);
    expect(topicsIn(katong)).toEqual(['food', 'festival']);
  });
});

describe('detectTopic', () => {
  it.each([
    ['Where can I eat near here?', 'food'],
    ['Tell me about laksa', 'food'],
    ['How old is this temple?', 'monument'],
    ['When is Hari Raya Puasa?', 'festival'],
    ['What festivals happen here?', 'festival'],
    ['Where can I buy a SIM card?', undefined],
    ['', undefined],
  ])('%s → %s', (q, topic) => expect(detectTopic(q)).toBe(topic));
});

describe('askFromCards', () => {
  it('answers only with sentences from the source card', () => {
    const answer = askFromCards('How old is Sri Mariamman Temple?', chinatown);
    expect(answer.kind).toBe('card');
    if (answer.kind !== 'card') return;
    expect(answer.card.article.id).toBe('sri-mariamman');
    const { article } = answer.card;
    const text = [article.summary, ...article.facts, article.deeper].join(' ');
    for (const line of [...answer.lines, ...answer.numbers.map((n) => n.caption)]) expect(text).toContain(line);
    expect(answer.numbers.map((n) => n.value)).toContain('1827');
  });

  it('shows the stall that serves the dish for a where question', () => {
    const answer = askFromCards('Where can I try chicken rice?', chinatown);
    expect(answer.kind === 'card' && answer.card.article.id).toBe('chicken-rice');
    expect(answer.kind === 'card' && answer.places.map((p) => p.id)).toContain('curated:sg-tian-tian-hainanese-chicken-rice');
  });

  it('picks a card by topic when the question names none', () => {
    const answer = askFromCards('What festivals are there?', katong);
    expect(answer.kind === 'card' && answer.card.article.id).toBe('hari-raya-puasa');
  });

  it('says so when the area has no card for the topic', () => {
    expect(askFromCards('Where can I eat?', kampongGlam)).toEqual({ kind: 'none', topic: 'food' });
  });

  it('says so for a question outside every card', () => {
    expect(askFromCards('Where can I buy a SIM card near here?', chinatown)).toEqual({ kind: 'none', topic: undefined });
  });

  it('answers a suggested question from its own card', () => {
    for (const subject of SUBJECTS) {
      for (const card of subject.cards) {
        const s = suggestionFor(card, subject);
        const answer = askFromCards(s.question, subject, { cardId: s.cardId });
        expect(answer.kind === 'card' && answer.card.article.id, s.question).toBe(card.article.id);
      }
    }
  });
});

describe('keyNumberOf', () => {
  it('keeps the number as the sentence writes it', () => {
    expect(keyNumberOf('A Hokkien temple to Mazu, the sea goddess, built 1839 to 1842.')?.value).toBe('1839 to 1842');
    expect(keyNumberOf('The procession runs about 4 km from Serangoon Road to Tank Road.')?.value).toBe('4 km');
    expect(keyNumberOf('Built with traditional joinery, without nails.')).toBeUndefined();
  });
});

describe('recommend', () => {
  it('says which opened card a pick comes from', () => {
    const recs = recommend(chinatown, { opened: ['sri-mariamman'], interests: ['foods', 'monuments', 'holidays'], exclude: ['chicken-rice'] });
    expect(recs[0]).toMatchObject({ cardId: 'sri-mariamman', reason: 'Because you opened the Sri Mariamman Temple card' });
    expect(recs[1]).toMatchObject({ cardId: 'thian-hock-keng', reason: 'Because you opened the Sri Mariamman Temple card' });
  });

  it('falls back to the Today topics, then to the area', () => {
    const recs = recommend(chinatown, { opened: [], interests: ['monuments', 'unesco', 'ich'], limit: 3 });
    expect(recs.map((r) => r.reason)).toEqual([
      'Matches your interest in monuments',
      'Matches your interest in monuments',
      'Another card about Chinatown',
    ]);
  });
});

describe('rewriteHere', () => {
  it('names the area instead of "here"', () => {
    expect(rewriteHere('Where can I buy a SIM card near here?', 'Chinatown')).toBe('Where can I buy a SIM card near Chinatown?');
    expect(rewriteHere('Is it busy here at night?', 'Katong')).toBe('Is it busy in Katong at night?');
  });
});
