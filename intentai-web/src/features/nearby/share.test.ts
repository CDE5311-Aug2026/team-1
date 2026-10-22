import { expect, test, vi } from 'vitest';
import { collection, members } from './catalogue';
import { DEFAULT_EXPLORE_PERSONAL, type ExplorePersonalData } from './domain';
import { setVisited } from './personal';
import { appUrl, checklistShare, placeShare, shareContent, shareToast } from './share';

const hawkers = collection('sg-hawker-centres')!;
const main = collection('sg-100')!;

function visit(ids: string[]) {
  let d: ExplorePersonalData = { ...DEFAULT_EXPLORE_PERSONAL, places: [] };
  for (const id of ids) d = setVisited(d, id as never, true, { date: '2026-10-21', now: new Date('2026-10-22T10:00:00') }).data;
  return d;
}

test('a short checklist lists every place, ticked or not, with the count and a link to the list', () => {
  const [a, b] = members(hawkers);
  const c = checklistShare(hawkers, visit([a.id, b.id]));
  const lines = c.text.split('\n');
  expect(lines[0]).toBe(`${hawkers.title} (${hawkers.titleZh}): I have checked in at 2 of ${members(hawkers).length}.`);
  expect(lines).toContain(`✓ ${a.name}`);
  expect(lines.filter((l) => l.startsWith('○ '))).toHaveLength(members(hawkers).length - 2);
  expect(c.url).toBe(`${window.location.origin}/nearby?list=sg-hawker-centres`);
  // nothing about where or when: no dates, no coordinates
  expect(c.text).not.toMatch(/2026|103\.|1\.2/);
});

test('a long checklist names only the places checked in, ten at most', () => {
  const all = members(main);
  const c = checklistShare(main, visit(all.slice(0, 12).map((p) => p.id)));
  expect(c.text.split('\n').filter((l) => l.startsWith('✓ '))).toHaveLength(10);
  expect(c.text).toContain('and 2 more');
  expect(c.text).not.toContain('○');
});

test('a place shares its name, kind and area, and "I checked in here" only when it is true', () => {
  const p = members(hawkers)[0];
  expect(placeShare(p, visit([])).text).not.toContain('checked in');
  const s = placeShare(p, visit([p.id]));
  expect(s.text).toContain('I checked in here.');
  expect(s.url).toBe(`${window.location.origin}/nearby/place/${encodeURIComponent(p.id)}`);
  expect(s.text).not.toMatch(/\d\.\d{3}/);
});

test('the share sheet when there is one; cancel says nothing; otherwise the text and link are copied', async () => {
  const content = { title: 't', text: 'hello', url: 'https://x.test/a' };
  const share = vi.fn().mockResolvedValue(undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);
  expect(await shareContent(content, { share, clipboard: { writeText } } as never)).toBe('shared');
  expect(share).toHaveBeenCalledWith(content);
  const cancel = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
  expect(await shareContent(content, { share: cancel, clipboard: { writeText } } as never)).toBe('cancelled');
  expect(writeText).not.toHaveBeenCalled();
  expect(await shareContent(content, { clipboard: { writeText } } as never)).toBe('copied');
  expect(writeText).toHaveBeenCalledWith('hello\nhttps://x.test/a');
  expect(await shareContent(content, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } } as never)).toBe('failed');
  expect(shareToast('copied')).toMatch(/Link copied/);
  expect(shareToast('cancelled')).toBeNull();
  expect(appUrl('/nearby', { origin: 'https://a.test', pathname: '/x' })).toBe('https://a.test/nearby');
});
