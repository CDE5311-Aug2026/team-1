import { describe, expect, test } from 'vitest';
import { newQuestion, SEED_QUESTIONS, type Question } from '../domain';
import { DEFAULT_EXPLORE_PERSONAL } from '../../features/nearby/domain';
import { SAMPLE_NOTIFICATIONS, SAMPLE_PEOPLE, SAMPLE_REPLIES, SAMPLE_THREADS } from './channels';
import { mapPeople, mapQuestions, myPlaces, nearestArea, pinStatus, statusCounts } from './map';
import {
  EMPTY_SOCIAL,
  ancestorsOf,
  isCommunitySocial,
  linkLine,
  notificationsFor,
  publicSummaries,
  questionSummary,
  replyTree,
  stageOf,
  threadFor,
  type CommunitySocial,
} from './social';

const q = (over: Partial<Question> = {}): Question => ({ ...newQuestion('Is chope rude?', ''), id: 'q', ...over });
const social = (over: Partial<CommunitySocial> = {}): CommunitySocial => ({ ...EMPTY_SOCIAL, ...over });

describe('demo community', () => {
  test('every seeded thread, reply, notification and person stays marked as sample data', () => {
    for (const item of [...SAMPLE_THREADS, ...SAMPLE_REPLIES, ...SAMPLE_NOTIFICATIONS, ...SAMPLE_PEOPLE]) expect(item.sample).toBe(true);
  });

  test('reply counts come from the replies; likes are the members’ likes plus mine', () => {
    const canOrNot = publicSummaries(EMPTY_SOCIAL).find((s) => s.id === 'singlish-can-or-not')!;
    expect(canOrNot.replies).toBe(SAMPLE_REPLIES.filter((r) => r.threadId === 'singlish-can-or-not').length);
    expect(canOrNot.author).toBe('Kai T.');
    expect(canOrNot.repliers).toHaveLength(3);
    const seeded = SAMPLE_REPLIES.filter((r) => r.threadId === 'singlish-can-or-not');
    const t = threadFor('singlish-can-or-not', [], [], social({ likes: ['singlish-can-or-not-r2'] }))!;
    expect(t.replies.map((r) => r.likes)).toEqual(seeded.map((r) => r.likes + (r.id === 'singlish-can-or-not-r2' ? 1 : 0)));
    expect(t.replies.every((r) => r.createdAt !== undefined && r.createdAt <= Date.now())).toBe(true);
  });

  test('a reply I add counts and makes an open thread answered', () => {
    const before = publicSummaries(EMPTY_SOCIAL).find((s) => s.id === 'chinese-kind-no')!;
    expect(before).toMatchObject({ replies: 0, answered: false });
    const after = publicSummaries(social({ replies: [{ id: 'x', threadId: 'chinese-kind-no', text: 'Hi', createdAt: 1 }] })).find((s) => s.id === 'chinese-kind-no')!;
    expect(after).toMatchObject({ replies: 1, answered: true });
  });
});

describe('My questions: Posted → Read → Replied → Resolved', () => {
  test('maps the stored statuses honestly', () => {
    expect(stageOf(q({ status: 'Pending' }), false)).toBe('Posted');
    expect(stageOf(q({ status: 'Seen' }), false)).toBe('Read');
    expect(stageOf(q({ status: 'Answered' }), false)).toBe('Replied');
    expect(stageOf(q({ status: 'Added' }), false)).toBe('Replied');
    expect(stageOf(q({ status: 'Pending' }), true)).toBe('Resolved');
  });

  test('summary counts replied / waiting / resolved', () => {
    expect(questionSummary(SEED_QUESTIONS, [])).toEqual({ replied: 1, waiting: 1, resolved: 0 });
    expect(questionSummary(SEED_QUESTIONS, ['paiseh'])).toEqual({ replied: 0, waiting: 1, resolved: 1 });
  });

  test('my question thread: a local answer is a reply; my own replies are marked as the author', () => {
    const answered = q({ status: 'Answered', answer: 'No.', answeredBy: 'Mei', answeredAt: 5 });
    const t = threadFor('q', [answered], [], social({ replies: [{ id: 'm', threadId: 'q', text: 'Thanks', createdAt: 6 }] }))!;
    expect(t.own).toBe(true);
    expect(t.replies.map((r) => [r.author, r.byAsker, r.mine])).toEqual([
      ['Mei', false, false],
      ['You', true, true],
    ]);
  });

  test('says what the answer goes back to, and nothing else', () => {
    expect(linkLine(q({ cardId: 'chicken-rice' }), [])).toBe('Linked to your Hainanese chicken rice card: a local’s answer will be added to it.');
    expect(linkLine(q({ cardId: 'chicken-rice', status: 'Added' }), [], 2)).toBe('Added to your Hainanese chicken rice card as a local tip · cited in Ask 2 times.');
    expect(linkLine(q(), [])).toBe('Not linked to a card or phrase: the answer stays here.');
  });
});

describe('reply tree', () => {
  const t = threadFor('singlish-can-or-not', [], [], EMPTY_SOCIAL)!;

  test('nests replies and finds the branch to expand for a reply', () => {
    const tree = replyTree(t.replies, 'top');
    expect(tree.roots.map((r) => r.id)).toEqual(['singlish-can-or-not-r1', 'singlish-can-or-not-r2', 'singlish-can-or-not-r3']);
    expect(ancestorsOf(tree, 'singlish-can-or-not-r1-b')).toEqual(['singlish-can-or-not-r1-a', 'singlish-can-or-not-r1']);
  });

  test('Top puts the most liked reply first; Latest puts my newest reply first', () => {
    const liked = threadFor('singlish-can-or-not', [], [], social({ likes: ['singlish-can-or-not-r3'] }))!;
    expect(replyTree(liked.replies, 'top').roots[0].id).toBe('singlish-can-or-not-r1');
    expect(liked.replies.find((r) => r.id === 'singlish-can-or-not-r3')!.likes).toBe(11);
    const mine = threadFor('singlish-can-or-not', [], [], social({ replies: [{ id: 'new', threadId: 'singlish-can-or-not', text: 'x', createdAt: Date.now() + 1000 }] }))!;
    expect(replyTree(mine.replies, 'latest').roots[0].id).toBe('new');
  });
});

describe('notifications', () => {
  test('one per local answer to my questions, then the examples; read state from this device', () => {
    const list = notificationsFor(SEED_QUESTIONS, social({ readNotifications: ['n-mel-reply'] }));
    expect(list.map((n) => [n.id, n.unread])).toEqual([
      ['answer:paiseh', true],
      ['n-mel-mention', true],
      ['n-jo-kopi', true],
      ['n-mel-reply', false],
      ['n-wei-chope', true],
      ['n-xiaolin-chi', true],
    ]);
    expect(list[0]).toMatchObject({ threadId: 'paiseh', replyId: 'paiseh:answer', actor: 'Siti A.' });
  });
});

describe('store', () => {
  test('validates its shape', () => {
    expect(isCommunitySocial(EMPTY_SOCIAL)).toBe(true);
    expect(isCommunitySocial({ ...EMPTY_SOCIAL, likes: [1] })).toBe(false);
    expect(isCommunitySocial({ ...EMPTY_SOCIAL, places: [{ questionId: 'a', areaId: 'b', name: 'c', lat: 'x', lng: 1 }] })).toBe(false);
  });
});

describe('Locals map', () => {
  test('a dropped point snaps to the nearest area', () => {
    expect(nearestArea({ lat: 1.2838, lng: 103.8443 }).id).toBe('sg-chinatown');
  });

  test('my places: areas with cards, then places I checked in to', () => {
    const personal = { ...DEFAULT_EXPLORE_PERSONAL, places: [] };
    expect(myPlaces(['sg-chinatown'], personal).map((p) => p.name)).toEqual(['Chinatown']);
  });

  test('pins: Pending needs a local, Seen is waiting, answered is answered; only questions with a place', () => {
    expect(pinStatus(q({ status: 'Pending' }))).toBe('needs');
    expect(pinStatus(q({ status: 'Seen' }))).toBe('waiting');
    expect(pinStatus(q({ status: 'Added' }))).toBe('answered');
    const pins = mapQuestions([q({ areaId: 'sg-chinatown', areaName: 'Chinatown' }), q({ id: 'nowhere' })], EMPTY_SOCIAL, [], []);
    expect(pins.filter((p) => p.own).map((p) => p.id)).toEqual(['q']);
    expect(statusCounts(pins).all).toBe(pins.length);
  });

  test('a pinned place wins over the area centre', () => {
    const pins = mapQuestions([q()], social({ places: [{ questionId: 'q', areaId: 'sg-orchard', name: 'Somewhere', lat: 1.3, lng: 103.83 }] }), [], []);
    expect(pins[0]).toMatchObject({ areaName: 'Somewhere', location: { lat: 1.3, lng: 103.83 } });
  });

  test('I appear only with Answer as a local on and sharing chosen, at area level', () => {
    const sharing = social({ profile: { shown: true, areaId: 'sg-tiong-bahru' } });
    expect(mapPeople(sharing, false).some((p) => p.me)).toBe(false);
    expect(mapPeople(social(), true).some((p) => p.me)).toBe(false);
    const me = mapPeople(sharing, true).find((p) => p.me)!;
    expect(me).toMatchObject({ areaId: 'sg-tiong-bahru', sample: false });
    expect(mapPeople(sharing, true).filter((p) => !p.me).every((p) => p.sample)).toBe(true);
  });
});
