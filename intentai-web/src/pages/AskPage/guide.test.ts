import { describe, expect, it } from 'vitest';
import { GUIDE, confidenceOf, detectSituation, findEntry, rankReadings, situationIsThin } from './guide';

const none = { where: '', who: '', topic: '' };

describe('phrase guide', () => {
  it('has unique ids and keys, and every Singlish entry quotes its source', () => {
    expect(new Set(GUIDE.map((e) => e.id)).size).toBe(GUIDE.length);
    const keys = GUIDE.flatMap((e) => e.keys);
    expect(new Set(keys).size).toBe(keys.length);
    for (const e of GUIDE.filter((x) => x.lang === 'Singlish')) {
      expect(e.source?.url, e.id).toBe('https://en.wikipedia.org/wiki/Singlish_vocabulary');
      expect(e.source?.quote.length, e.id).toBeGreaterThan(5);
    }
    for (const e of GUIDE.filter((x) => x.lang === '中文')) expect(e.source, e.id).toBeNull();
  });

  it('matches English keys as whole words, Chinese keys anywhere', () => {
    expect(findEntry('Why is she so sian today?')?.id).toBe('sian');
    expect(findEntry('An Asian restaurant')).toBeUndefined();
    expect(findEntry('领导说你先放着吧')?.id).toBe('xian-fang-zhe');
    expect(findEntry('Can or not? And chope also')?.id).toBe('can-or-not');
  });

  it('reads who / where / tone from the sentence', () => {
    expect(detectSituation('My boss said it in the meeting, laughing')).toEqual({ who: 'Your boss', where: 'Office', tone: 'Smiling' });
    expect(detectSituation('同学在群里说的')).toEqual({ who: 'Your classmate', where: 'Group chat' });
    expect(detectSituation('does it work?')).toEqual({});
    // The question asks whether they are upset: don't pre-select it.
    expect(detectSituation('他回我“收到”是不是不高兴了')).toEqual({});
  });

  it('puts the reading that fits the tone first', () => {
    const sabo = findEntry('sabo')!;
    expect(rankReadings(sabo, { ...none, tone: 'Annoyed' })[0]).toEqual({ text: 'A real complaint: they think someone got them into trouble.', likelihood: 'Most likely' });
    expect(rankReadings(sabo, none).map((r) => r.likelihood)).toEqual(['Most likely', 'Possible']);
  });

  it('confidence never claims more than the situation gives', () => {
    const chope = findEntry('chope')!;
    expect(confidenceOf(chope, none).level).toBe('Low');
    expect(confidenceOf(chope, { ...none, who: 'Your friend' }).level).toBe('Medium');
    expect(confidenceOf(chope, { where: 'Office', who: 'Your friend', topic: '', tone: 'Smiling' }).level).toBe('Good');
    expect(confidenceOf(findEntry('收到'), { where: 'Office', who: 'Your friend', topic: '', tone: 'Smiling' }).level).toBe('Medium');
    expect(confidenceOf(undefined, { where: 'Office', who: 'Your friend', topic: '', tone: 'Smiling' }).level).toBe('Low');
  });

  it('asks for the situation when fewer than two of who / where / how are known', () => {
    expect(situationIsThin(none)).toBe(true);
    expect(situationIsThin({ ...none, who: 'Your boss' })).toBe(true);
    expect(situationIsThin({ ...none, who: 'Your boss', tone: 'Not sure' })).toBe(true);
    expect(situationIsThin({ ...none, who: 'Your boss', where: 'Office' })).toBe(false);
  });
});
