import { expect, test } from 'vitest';
import { ARTICLE_IMAGES } from './articleImages';
import { CATEGORIES, DEFAULT_CATEGORIES, articlesFor, categoryLabel } from './culture';

test('all six survey categories are offered', () => {
  expect(CATEGORIES.map((c) => c.id)).toEqual(['foods', 'monuments', 'holidays', 'unesco', 'ich', 'history']);
});

test('the default build is the n=24 survey top three, in rank order', () => {
  expect(DEFAULT_CATEGORIES).toEqual(['foods', 'monuments', 'holidays']);
  expect(DEFAULT_CATEGORIES.map(categoryLabel)).toEqual(['Foods', 'Monuments', 'Festivals']);
});

test('each default category leads with its survey top choice and has layered articles', () => {
  const leads = DEFAULT_CATEGORIES.map((id) => CATEGORIES.find((c) => c.id === id)!.topChoice);
  expect(leads).toEqual([
    'Iconic dishes and where they come from',
    'The story behind each monument',
    'Meaning and origins of each festival',
  ]);
  for (const id of DEFAULT_CATEGORIES) {
    const articles = articlesFor(id);
    expect(articles.length).toBeGreaterThanOrEqual(3);
    for (const a of articles) {
      expect(a.summary).not.toBe('');
      expect(a.facts.length).toBeGreaterThan(0);
      expect(a.deeper).not.toBe('');
    }
  }
});

test('article ids are unique across categories', () => {
  const ids = CATEGORIES.flatMap((c) => articlesFor(c.id).map((a) => a.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('every article names at least one source', () => {
  for (const c of CATEGORIES) {
    for (const a of articlesFor(c.id)) {
      expect(a.sources.length).toBeGreaterThan(0);
      for (const s of a.sources) expect(s.label).not.toBe('');
    }
  }
});

test('every category has at least three articles', () => {
  for (const c of CATEGORIES) expect(articlesFor(c.id).length).toBeGreaterThanOrEqual(3);
});

test('new-category articles cite exact https pages and a check date', () => {
  for (const id of ['holidays', 'ich', 'history'] as const) {
    for (const a of articlesFor(id)) {
      expect(a.sources.some((s) => s.url?.startsWith('https://'))).toBe(true);
      expect(a.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test('Festivals leaves Deepavali to its own card', () => {
  for (const a of articlesFor('holidays')) expect(`${a.id} ${a.title}`.toLowerCase()).not.toContain('deepavali');
});

test('every article shown on Today (the first three per tab) has a credited, freely licensed photo', () => {
  for (const { id } of CATEGORIES) {
    for (const article of articlesFor(id).slice(0, 3)) {
      const image = ARTICLE_IMAGES[article.id];
      expect(image, article.id).toBeDefined();
      expect(image.alt).not.toBe('');
      expect(image.credit).toMatch(/^(Photo|Map): .+ · (CC BY(-SA)? \d\.\d|CC0|Public domain) · cropped$/);
      expect(image.url).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  }
});
