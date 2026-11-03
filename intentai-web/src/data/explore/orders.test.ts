import { describe, expect, test } from 'vitest';
import { availableOptions, defaultChoices, ORDER_GUIDES, orderText, settle } from './orders';

const kopi = ORDER_GUIDES.kopi;
const say = (c: Record<string, string>) => orderText(kopi, { ...defaultChoices(kopi), ...c });

describe('order like a local', () => {
  test('plain kopi, and the article’s own combinations', () => {
    expect(say({})).toEqual({ said: 'Uncle, kopi, having here.', meaning: 'Coffee, with condensed milk, with sugar, to eat here.' });
    expect(say({ greet: 'auntie', milk: 'o', sugar: 'none', where: 'dabao' })).toEqual({
      said: 'Auntie, kopi O kosong, da bao.',
      meaning: 'Black coffee, without sugar, to take away.',
    });
    expect(say({ milk: 'o', ice: 'peng' }).said).toBe('Uncle, kopi O peng, having here.');
    expect(say({ sugar: 'less' }).said).toBe('Uncle, kopi siew dai, having here.');
    expect(say({ milk: 'c', sugar: 'more', ice: 'peng' })).toEqual({
      said: 'Uncle, kopi C gah dai peng, having here.',
      meaning: 'Coffee, with evaporated milk, with extra sugar, iced, to eat here.',
    });
  });

  test('“kosong” is offered only with black coffee, and dropped when the milk changes', () => {
    const sugar = kopi.steps.find((s) => s.id === 'sugar')!;
    expect(availableOptions(sugar, { ...defaultChoices(kopi), milk: 'condensed' }).map((o) => o.id)).not.toContain('none');
    expect(availableOptions(sugar, { ...defaultChoices(kopi), milk: 'o' }).map((o) => o.id)).toContain('none');
    expect(settle(kopi, { ...defaultChoices(kopi), milk: 'c', sugar: 'none' }).sugar).toBe('normal');
  });

  test('chicken rice', () => {
    const g = ORDER_GUIDES['chicken-rice'];
    expect(orderText(g, { ...defaultChoices(g), chicken: 'roasted', where: 'dabao' })).toEqual({
      said: 'Uncle, one chicken rice roasted, da bao.',
      meaning: 'One plate of chicken rice, with roasted chicken, to take away.',
    });
  });

  test('every guide names its sources', () => {
    for (const g of Object.values(ORDER_GUIDES)) {
      expect(g.sources.length).toBeGreaterThan(0);
      for (const s of g.sources) expect(s.url).toMatch(/^https:\/\/[^/]+\/.+/);
    }
  });
});
