import { describe, expect, it } from 'vitest';
import { buildDays, dayOfTime, dayParts, type JournalEntry } from './journal';

const at = (day: string, hm: string) => new Date(`${day}T${hm}:00`).getTime();

describe('buildDays', () => {
  const entries: JournalEntry[] = [
    { id: 'v1', kind: 'visit', day: '2026-10-31', title: 'Thian Hock Keng', note: '', tag: 'Temple' },
    { id: 's1', kind: 'stamp', day: '2026-11-01', at: at('2026-11-01', '15:10'), title: 'Fuk Tak Chi', note: '', tag: 'Hunt stamp', image: 'hunt.jpg' },
    { id: 'p1', kind: 'photo', day: '2026-11-01', at: at('2026-11-01', '18:30'), title: 'Lanterns', note: '', tag: 'Photo', image: 'blob:1', photoId: '1' },
    { id: 'v2', kind: 'visit', day: '2026-11-01', title: 'Our Tampines Hub', note: '', tag: 'Hub' },
    { id: 's2', kind: 'stamp', day: '2026-11-01', at: at('2026-11-01', '09:40'), title: 'Fuk Tak Chi', note: '', tag: 'Hunt stamp' },
    { id: 'bad', kind: 'visit', day: 'someday', title: 'x', note: '', tag: '' },
  ];
  const days = buildDays(entries);

  it('groups by day, newest first, and drops entries without a real day', () => {
    expect(days.map((d) => d.day)).toEqual(['2026-11-01', '2026-10-31']);
  });

  it('orders a day as it went: date-only entries first, then by time', () => {
    expect(days[0].entries.map((e) => e.id)).toEqual(['v2', 's2', 's1', 'p1']);
    expect(days[0].from).toBe(at('2026-11-01', '09:40'));
    expect(days[0].to).toBe(at('2026-11-01', '18:30'));
  });

  it('prefers your own photo for the print and tallies places, stamps and photos', () => {
    expect(days[0].cover?.id).toBe('p1');
    expect(days[0].stats).toEqual({ places: 2, stamps: 2, photos: 1 });
    expect(days[1].cover).toBeUndefined();
    expect(days[1].from).toBeUndefined();
  });
});

describe('day helpers', () => {
  it('reads a local day and its parts', () => {
    expect(dayOfTime(new Date(2026, 10, 1, 23, 50).getTime())).toBe('2026-11-01');
    expect(dayParts('2026-11-01')).toEqual({ num: '1', month: 'Nov', weekday: 'Sun' });
  });
});
