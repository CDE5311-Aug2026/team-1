import { beforeEach, describe, expect, test } from 'vitest';
import { DEFAULT_PROFILE_V3, type ProfileV3 } from './profile/profile';
import { EMPTY_LOCAL_PROFILE, publicTags, withPrefill } from './profile/localProfile';
import { activeMemories, clearMemory, EMPTY_MEMORY, forget, learnFrom, memoryStore, profileMemories, remember, resetMemory, setMemoryEnabled } from './memory';

const PROFILE: ProfileV3 = { ...DEFAULT_PROFILE_V3, from: 'IN', stay: '3to12m', role: 'student', language: 'ta' };

beforeEach(() => memoryStore.set(EMPTY_MEMORY));

describe('learning from Ask', () => {
  test('only clear first-person facts count', () => {
    expect(learnFrom('I’m from Lyon, what does lah mean?')).toBe('From Lyon');
    expect(learnFrom("I'm from Lyon.")).toBe('From Lyon');
    expect(learnFrom('I grew up in Penang and my aunt says jialat')).toBe('Grew up in Penang');
    expect(learnFrom('My native language is Korean.')).toBe('Native language: Korean');
    expect(learnFrom('I am an exchange student here')).toBe('Here as: exchange student');
    expect(learnFrom('我来自成都，想问一下')).toBe('来自成都');
    expect(learnFrom('What does paiseh mean?')).toBeUndefined();
    expect(learnFrom('Is this from China?')).toBeUndefined();
  });

  test('remember adds once, newest first, and nothing when memory is off', () => {
    remember('From Lyon', 'ask', 1);
    expect(remember('from lyon', 'ask', 2)).toBeUndefined();
    remember('Vegetarian', 'you', 3);
    expect(memoryStore.get().items.map((m) => m.text)).toEqual(['Vegetarian', 'From Lyon']);
    setMemoryEnabled(false);
    expect(remember('Likes kopi', 'you')).toBeUndefined();
    expect(activeMemories(memoryStore.get(), PROFILE)).toEqual([]);
  });
});

describe('profile entries', () => {
  test('come from onboarding and the local profile, and follow edits', () => {
    const local = withPrefill(EMPTY_LOCAL_PROFILE, PROFILE);
    expect(local).toMatchObject({ grewUp: 'India', nativeLanguages: ['Tamil'] });
    expect(profileMemories(PROFILE, local).map((m) => m.text)).toEqual([
      'From India',
      'In Singapore: 3–12 months',
      'Here as: student',
      'Prefers Tamil',
      'Native language: Tamil',
      'Grew up in India',
    ]);
  });

  test('forget hides one; clear hides all; reset brings the profile back and drops learned ones', () => {
    remember('From Lyon', 'ask');
    const ids = profileMemories(PROFILE).map((m) => m.id);
    forget('profile:from');
    expect(activeMemories(memoryStore.get(), PROFILE).map((m) => m.text)).not.toContain('From India');
    clearMemory(ids);
    expect(activeMemories(memoryStore.get(), PROFILE)).toEqual([]);
    resetMemory();
    expect(activeMemories(memoryStore.get(), PROFILE).map((m) => m.text)).toContain('From India');
    expect(memoryStore.get().items).toEqual([]);
  });

  test('the background tag stays private unless chosen', () => {
    const local = { ...EMPTY_LOCAL_PROFILE, culture: ['Peranakan'], background: 'Chinese', grewUp: 'Katong', edited: true };
    expect(publicTags(local)).toEqual(['Peranakan', 'Grew up in Katong']);
    expect(publicTags({ ...local, showBackground: true })).toContain('Chinese');
  });
});
