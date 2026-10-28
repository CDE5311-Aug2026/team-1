import { expect, test } from 'vitest';
import { CULTURE_TOPICS, ONB_COUNTRIES, ONB_LANGS, ONB_ROLES, ONB_TIMES } from '../../data/domain';
import {
  COUNTRIES,
  ICON_PATHS,
  LANGS,
  PHOTOS,
  ROLES,
  TIMES,
  TOPIC_OPTIONS,
  fromPreview,
  langLabel,
  roleLabel,
  timeLabel,
  topicsPreview,
} from './options';

const codes = (list: readonly { code?: string; name?: string; id?: string }[]) => list.map((o) => o.code ?? o.name ?? o.id);

test('12 countries, 4 times, 6 roles, 6 languages, 4 topics, in store order with unique codes', () => {
  expect(COUNTRIES.map((c) => c.name)).toEqual([...ONB_COUNTRIES]);
  expect(codes(TIMES)).toEqual([...ONB_TIMES]);
  expect(codes(ROLES)).toEqual([...ONB_ROLES]);
  expect(codes(LANGS)).toEqual([...ONB_LANGS]);
  expect(TOPIC_OPTIONS.map((t) => t.id).sort()).toEqual([...CULTURE_TOPICS].sort());
  expect(COUNTRIES).toHaveLength(12);
  expect(COUNTRIES.filter((c) => c.primary)).toHaveLength(6);
  expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(12);
});

test('canvas copy: labels, abbreviations and native language labels', () => {
  expect(TIMES.map((t) => t.label)).toEqual(['Less than 3 months', '3–12 months', '1–3 years', 'More than 3 years']);
  expect(TIMES.map((t) => t.passport)).toEqual(['< 3 months', '3–12 months', '1–3 years', '3+ years']);
  expect(timeLabel('gt3y')).toBe('More than 3 years');
  expect(roleLabel('intern')).toBe('Student intern');
  expect(langLabel('zh')).toBe('中文');
  expect(LANGS.map((l) => l.previewTitle)[3]).toBe('தியான் ஹோக் கெங் கோயில்');
});

test('every photo and icon resolves', () => {
  for (const photo of Object.values(PHOTOS)) {
    expect(photo.src).toBeTruthy();
    expect(photo.alt).not.toBe('');
    expect(photo.credit).not.toBe('');
  }
  for (const role of ROLES) expect(PHOTOS[role.photo]).toBeDefined();
  for (const topic of TOPIC_OPTIONS) expect(PHOTOS[topic.photo]).toBeDefined();
  for (const o of [...TIMES, ...ROLES]) expect(ICON_PATHS[o.icon]).toBeTruthy();
});

test('from preview: India compares Deepavali, others Lunar New Year, empty prompts', () => {
  expect(fromPreview(null).chip).toBeUndefined();
  expect(fromPreview('India')).toMatchObject({ chip: 'Compare with India', photo: PHOTOS.deepavali });
  expect(fromPreview('Vietnam')).toMatchObject({ chip: 'Compare with Vietnam', photo: PHOTOS.festival });
});

test('topics preview names #1 and the rest', () => {
  expect(topicsPreview([]).body).toBe('Tap a topic to start your ranking.');
  expect(topicsPreview(['festival'])).toMatchObject({ title: 'Festivals first', body: 'Keep tapping to rank the rest.' });
  expect(topicsPreview(['food', 'history', 'monument']).body).toBe('Then History, Monuments.');
});
