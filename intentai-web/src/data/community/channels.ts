// Community channels and the example conversations shown in them (ZIP prototype, sixth round, community-explore.js).
// The demo community (owner decision 2026-10-29): fictional members (people.ts) asking and answering, with times,
// views and likes, so the build reads as a product in testing. Every item keeps `sample: true` in the data, and
// Settings › About says the community is illustrative; the screens themselves carry no "Example" tags.
import bakKwa from '../../assets/v3/community/bak-kwa.jpg';
import cafe from '../../assets/v3/community/cafe.jpg';
import lanterns from '../../assets/v3/community/lanterns.jpg';
import street from '../../assets/v3/community/street.jpg';
import temple from '../../assets/v3/community/temple.jpg';
import canOrNot from '../../assets/can-or-not-photo.jpg';
import chope from '../../assets/chope-photo.jpg';
import paiseh from '../../assets/paiseh-photo.jpg';
import makan from '../../assets/makan-photo.jpg';
import steady from '../../assets/steady-photo.jpg';
import kiasu from '../../assets/kiasu-photo.jpg';
import { ARTICLE_IMAGES } from '../articleImages';
import { MEMBERS, nameOf, type Member } from './people';
import { KIT, KIT_PLACE_AREAS, kitCover, kitName } from './kit';

const chickenRice = ARTICLE_IMAGES['chicken-rice'].src;
const thianHockKeng = ARTICLE_IMAGES['thian-hock-keng'].src;
const sultanMosque = ARTICLE_IMAGES['sultan-mosque'].src;
const sriMariamman = ARTICLE_IMAGES['sri-mariamman'].src;
const lunarNewYear = ARTICLE_IMAGES['lunar-new-year'].src;
const hariRaya = ARTICLE_IMAGES['hari-raya-puasa'].src;
const hawkerCulture = ARTICLE_IMAGES['hawker-culture'].src;

export const CHANNEL_IDS = ['daily-usage', 'chinese-exchange', 'chinese-culture-malaysia', 'singapore-singlish'] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

export interface Channel {
  id: ChannelId;
  name: string;
  description: string;
}

/** The four boards, named and described as in the community card kit. */
export const CHANNELS: Channel[] = CHANNEL_IDS.map((id) => {
  const b = KIT.boards.find((x) => x.id === id);
  return { id, name: b?.name ?? id, description: b?.description ?? '' };
});

export function channelName(id: ChannelId): string {
  return CHANNELS.find((c) => c.id === id)?.name ?? id;
}

export type Feed = 'top' | 'for-you';

export interface SampleThread {
  id: string;
  channel: ChannelId;
  title: string;
  body: string;
  tags: string[];
  photo: string;
  /** What the photo shows (kit covers carry one). */
  photoAlt?: string;
  author: string;
  /** Posted this many minutes before the app opens (so the feed always reads as recent activity). */
  ago: number;
  /** People who opened the thread. */
  views: number;
  /** Threads placed on the Locals map: an area (never a point). */
  areaId?: string;
  /** Closed in the seed: no new replies. */
  closed?: boolean;
  /** Asked by the demo user (the kit's "Jamie", shown as You). */
  mine?: boolean;
  sample: true;
}

export interface SampleReply {
  id: string;
  threadId: string;
  /** Another reply in the same thread; none = a reply to the question. */
  parentId?: string;
  author: string;
  text: string;
  /** Minutes before the app opens. */
  ago: number;
  /** Likes from other members (mine is added on top). */
  likes: number;
  sample: true;
}

const H = 60;
const D = 24 * H;

const t = (thread: Omit<SampleThread, 'sample' | 'author'> & { by: string }): SampleThread => {
  const { by, ...rest } = thread;
  return { ...rest, author: nameOf(by), sample: true };
};

const OUR_THREADS: SampleThread[] = [
  t({
    id: 'daily-well-see', channel: 'daily-usage', title: 'Does “we’ll see” mean maybe, or a gentle no?',
    body: 'I suggested meeting after class. A friend smiled and said “we’ll see.” I don’t want to push, but I’m not sure whether to follow up.',
    tags: ['Tone', 'Making plans'], photo: street, by: 'mira', ago: 3 * H + 12, views: 214, areaId: 'sg-clementi',
  }),
  t({
    id: 'daily-split-bill', channel: 'daily-usage', title: 'What’s an easy way to suggest splitting the bill?',
    body: 'We’re a new group of classmates having lunch together. I’d like to ask what everyone prefers, without making the moment awkward.',
    tags: ['Everyday life', 'Finding the words'], photo: bakKwa, by: 'eli', ago: 9 * H, views: 486,
  }),
  t({
    id: 'daily-more-detail', channel: 'daily-usage', title: '“Make it more detailed” — what should I clarify first?',
    body: 'A teammate said this while reviewing an early project outline. I understand the words, but I’m not sure what a useful next draft would look like.',
    tags: ['Work & study', 'Intent'], photo: cafe, by: 'sam', ago: D + 2 * H, views: 392, areaId: 'sg-marina-bay',
  }),
  t({
    id: 'chinese-let-me-know', channel: 'chinese-exchange', title: '“你到了跟我说一声”是在关心，还是在安排下一步？',
    body: '朋友约我去一个不熟悉的地方，最后补了一句“你到了跟我说一声”。我想理解这句话在这个场景里的意思。',
    tags: ['言外之意', '朋友聊天'], photo: street, by: 'anan', ago: 5 * H + 40, views: 331, areaId: 'sg-queenstown',
  }),
  t({
    id: 'chinese-kind-no', channel: 'chinese-exchange', title: '怎么用中文婉拒邀请，又不显得冷淡？',
    body: '同学邀请我周末一起出去，但我已经有安排了。我想表达感谢，也想让对方知道以后还可以约。',
    tags: ['练习表达', '礼貌与边界'], photo: temple, by: 'rae', ago: 47, views: 58, areaId: 'sg-toa-payoh',
  }),
  t({
    id: 'chinese-consider-followup', channel: 'chinese-exchange', title: '“我再考虑一下”之后，怎么自然地跟进？',
    body: '我向朋友提了一个计划，对方说想再考虑一下。过了几天，我想问问进展，又不想显得在催。',
    tags: ['语气', '如何回应'], photo: cafe, by: 'xiaohe', ago: 2 * D + 3 * H, views: 267,
  }),
  t({
    id: 'malaysia-first-family-visit', channel: 'chinese-culture-malaysia', title: 'Visiting a friend’s family in Malaysia — what should I ask beforehand?',
    body: 'A friend invited me to a family gathering. Rather than guessing what is expected, I’d like to ask a few thoughtful questions before I go.',
    tags: ['Family gatherings', 'Being a guest'], photo: lanterns, by: 'alex', ago: 14 * H, views: 305, areaId: 'sg-katong',
  }),
  t({
    id: 'malaysia-family-traditions', channel: 'chinese-culture-malaysia', title: 'How can I ask about a family tradition without making assumptions?',
    body: 'My friend mentioned a celebration their family takes part in. I’m curious about their own experience, rather than looking for a rule that applies to everyone.',
    tags: ['Traditions', 'Thoughtful questions'], photo: lanterns, by: 'leah', ago: 3 * D, views: 412, areaId: 'sg-bukit-timah',
  }),
  t({
    id: 'malaysia-language-choice', channel: 'chinese-culture-malaysia', title: 'English, Mandarin or both — how do I ask what feels comfortable?',
    body: 'I’m joining a conversation with people I’ve just met. I can follow some Mandarin, but I don’t want to assume which language they would like to use.',
    tags: ['Language choices', 'Starting a conversation'], photo: street, by: 'dee', ago: 2 * H + 5, views: 96, areaId: 'sg-tampines',
  }),
  t({
    id: 'singlish-can-or-not', channel: 'singapore-singlish', title: '“Can or not?” — a question, a nudge, or both?',
    body: 'A classmate asked this after suggesting a time to meet. I’m wondering whether they want a quick decision, or are simply checking if the plan works.',
    tags: ['Singlish', 'Reading the tone'], photo: canOrNot, by: 'kai', ago: 6 * H, views: 728, areaId: 'sg-clementi',
  }),
  t({
    id: 'singlish-paiseh', channel: 'singapore-singlish', title: 'Someone said “paiseh” after turning down help. What might they mean?',
    body: 'I offered to help a classmate, and they smiled, said “paiseh,” then declined. I’d like to respond kindly without reading too much into one word.',
    tags: ['Singlish', 'Context matters'], photo: paiseh, by: 'theo', ago: 26, views: 41, areaId: 'sg-little-india',
  }),
  t({
    id: 'singlish-chope', channel: 'singapore-singlish', title: 'Is “chope” a plan, a request, or just holding a place?',
    body: 'A friend used this word while we were organising lunch. What is a good follow-up if I don’t know what they expect me to do?',
    tags: ['Singlish', 'Everyday plans'], photo: chope, by: 'ren', ago: 20 * H, views: 553, areaId: 'sg-chinatown',
  }),
  // ---- more of the community ----
  t({
    id: 'food-hawker-order', channel: 'daily-usage', title: 'First time at a hawker centre — how do I order without holding up the queue?',
    body: 'The uncle asked me something very fast after I said “chicken rice” and I just nodded. What do stalls usually ask, so I can be ready next time?',
    tags: ['Food', 'Hawker centres'], photo: chickenRice, by: 'sam', ago: H + 18, views: 167, areaId: 'sg-chinatown',
  }),
  t({
    id: 'food-kopi-order', channel: 'singapore-singlish', title: 'Kopi O, kopi C, kopi peng… what am I actually ordering?',
    body: 'I keep ordering “kopi” and getting a very sweet coffee. I’d like to understand the coffee shop words instead of pointing at someone else’s cup.',
    tags: ['Kopitiam', 'Ordering'], photo: makan, by: 'eli', ago: 4 * H + 30, views: 941, areaId: 'sg-tiong-bahru',
  }),
  t({
    id: 'temple-visit-etiquette', channel: 'daily-usage', title: 'Visiting Thian Hock Keng with my parents — anything we should know?',
    body: 'My parents are visiting and want to see the temple. Is it fine to walk in during prayers, and is there anything we should avoid doing inside?',
    tags: ['Temples', 'Being a guest'], photo: thianHockKeng, by: 'mira', ago: D + 7 * H, views: 288, areaId: 'sg-chinatown',
  }),
  t({
    id: 'mosque-visit', channel: 'daily-usage', title: 'Can visitors go inside Sultan Mosque, and when is it better not to?',
    body: 'I’ll be around Kampong Glam on Friday afternoon with a friend from overseas. We’d like to visit respectfully and not get in the way.',
    tags: ['Mosques', 'Kampong Glam'], photo: sultanMosque, by: 'theo', ago: 8 * H, views: 203, areaId: 'sg-kampong-glam',
  }),
  t({
    id: 'deepavali-greeting', channel: 'singapore-singlish', title: 'Is it okay to say “Happy Deepavali” to a colleague who might not celebrate it?',
    body: 'Deepavali is coming up and I’d like to greet my teammates, but I don’t know who celebrates. What feels natural in a Singapore office?',
    tags: ['Festivals', 'Work'], photo: sriMariamman, by: 'dee', ago: 38, views: 74, areaId: 'sg-little-india',
  }),
  t({
    id: 'lunar-new-year-visit', channel: 'chinese-exchange', title: '第一次去本地朋友家拜年，要准备什么？',
    body: '朋友邀请我年初二去他家拜年。我听说要带橘子，但不知道几个、怎么给，也不知道见到长辈该说什么。',
    tags: ['新年', '做客'], photo: lunarNewYear, by: 'xiaohe', ago: 4 * D, views: 619, areaId: 'sg-toa-payoh',
  }),
  t({
    id: 'hari-raya-open-house', channel: 'chinese-culture-malaysia', title: 'Invited to a Hari Raya open house — what do guests usually do?',
    body: 'A colleague invited the team to her family’s open house. Do I bring something, and how long do people usually stay?',
    tags: ['Hari Raya', 'Being a guest'], photo: hariRaya, by: 'leah', ago: 6 * D, views: 377, areaId: 'sg-bedok',
  }),
  t({
    id: 'singlish-lah-tone', channel: 'singapore-singlish', title: '“Okay lah” vs “okay” — is the lah friendlier or more annoyed?',
    body: 'My housemate answers “okay lah” to almost everything. Sometimes it sounds warm, sometimes a bit tired. How do locals hear it?',
    tags: ['Singlish', 'Reading the tone'], photo: steady, by: 'kai', ago: 11 * H, views: 834, areaId: 'sg-jurong',
  }),
  t({
    id: 'chinese-chi-le-ma', channel: 'chinese-exchange', title: '阿姨问我“吃了没”，是要请我吃饭吗？',
    body: '楼下的阿姨每次见到我都问“吃饱了没”。我第一次很认真地回答了今天吃了什么，她笑了。我是不是理解错了？',
    tags: ['打招呼', '邻里'], photo: hawkerCulture, by: 'anan', ago: 2 * D, views: 455, areaId: 'sg-ang-mo-kio',
  }),
  t({
    id: 'daily-mrt-seat', channel: 'daily-usage', title: 'Do people expect you to give up a reserved seat on the MRT even when it’s empty?',
    body: 'I sat on a reserved seat on a quiet train and someone looked at me. I wasn’t sure whether I’d done something rude.',
    tags: ['Getting around', 'Unwritten rules'], photo: kiasu, by: 'alex', ago: 3 * H, views: 152, areaId: 'sg-orchard',
  }),
];

const r = (threadId: string, id: string, by: string, text: string, ago: number, likes: number, parentId?: string): SampleReply => ({
  id: `${threadId}-${id}`,
  threadId,
  parentId: parentId ? `${threadId}-${parentId}` : undefined,
  author: nameOf(by),
  text,
  ago,
  likes,
  sample: true,
});

const OUR_REPLIES: SampleReply[] = [
  r('daily-well-see', 'r1', 'liv', 'Often it’s a soft “not sure yet”. I’d leave it open: “No worries, let me know if you’re free!” If they want to come, they’ll pick it up.', 2 * H + 40, 18),
  r('daily-well-see', 'r2', 'ari', 'Depends who says it. From a close friend it really can mean maybe. If you ask once more later with a specific time, that’s not pushy.', 2 * H, 9),
  r('daily-split-bill', 'r1', 'jo', 'I’d ask before anyone pays: “Shall we split it, or would everyone prefer to pay for what they ordered?” It gives people an easy choice.', 8 * H, 34),
  r('daily-split-bill', 'r2', 'nina', 'In my group, “How would you like to do the bill?” feels relaxed. I try not to assume everyone has the same preference.', 7 * H + 15, 21),
  r('daily-split-bill', 'r1-a', 'eli', 'That gives me a better way to ask. I’ll check the situation before assuming what they meant.', 6 * H, 4, 'r1'),
  r('daily-split-bill', 'r3', 'marcus', 'At hawker centres people usually just pay for their own tray anyway. It’s more of a question at restaurants.', 5 * H, 15),
  r('daily-more-detail', 'r1', 'ari', 'I’d ask which part needs more detail, then offer a concrete structure: actions, deliverables, owners, and timing. That checks your reading before you redo everything.', D, 27),
  r('daily-more-detail', 'r2', 'daniel', 'Bring one example section rewritten the way you think they want, and ask “like this?” Saves a whole round.', 20 * H, 12),
  r('chinese-let-me-know', 'r1', 'xiaolin', '按你描述的场景，我会先理解成“到了告诉我，我好接你或安排下一步”，也可能带着关心。可以自然地接一句：“好，我到了发你消息，你在附近吗？”', 5 * H, 26),
  r('chinese-let-me-know', 'r1-a', 'anan', '这样说自然多了，谢谢。我会先确认一下当时的场景。', 4 * H + 30, 3, 'r1'),
  r('chinese-let-me-know', 'r2', 'ning', '如果是第一次去那个地方，多半是关心你别走错路。到了发个“到啦”就很好。', 3 * H, 11),
  r('chinese-consider-followup', 'r1', 'ning', '我会给对方留一个轻松的出口：“前几天说的那个计划，你现在有什么想法吗？还需要时间也没关系。”如果确实有截止时间，可以说明原因。', 2 * D, 19),
  r('chinese-consider-followup', 'r2', 'wei', '隔个三四天问一次就好。问的时候顺便讲讲你自己的安排，对方比较容易回答。', D + 9 * H, 8),
  r('malaysia-first-family-visit', 'r1', 'jun', 'Ask your friend who will be there and whether to bring something. A box of oranges or a cake is usually safe. And ask if shoes come off at the door, most homes do.', 12 * H, 22),
  r('malaysia-first-family-visit', 'r2', 'aisyah', 'Also worth asking about food: if anyone in the family keeps halal or vegetarian, a bought gift is easier than home baking.', 10 * H, 14),
  r('malaysia-family-traditions', 'r1', 'jun', 'I like being asked “How does your family usually celebrate?” It gives me room to share our own version, including the things we do differently.', 3 * D - 2 * H, 31),
  r('malaysia-family-traditions', 'r2', 'priya', 'Same. “What does it mean to you?” lands better than “what are the rules?”. Every family does it a bit differently.', 2 * D + 20 * H, 17),
  r('malaysia-language-choice', 'r1', 'siti', 'Start in English and switch if they do. Or just ask “English okay?”, nobody minds.', H + 30, 6),
  r('singlish-can-or-not', 'r1', 'mel', 'In that situation, I’d read it as checking whether the proposed time works. “Yes, that time works for me” answers it without needing to guess the tone.', 5 * H + 30, 43),
  r('singlish-can-or-not', 'r1-a', 'kai', 'Thanks! It was said quite quickly, so I wasn’t sure whether I was taking too long.', 5 * H, 5, 'r1'),
  r('singlish-can-or-not', 'r1-b', 'mel', 'That extra context helps. You could say, “Let me check one thing and I’ll confirm in a minute.” It acknowledges the question and gives you a little room.', 4 * H + 40, 19, 'r1-a'),
  r('singlish-can-or-not', 'r2', 'ash', 'The words alone don’t tell us the urgency. If timing matters, I’d ask “Do you need me to confirm now?”', 4 * H, 12),
  r('singlish-can-or-not', 'r2-a', 'mel', '@You, a specific time is easier for the other person to work with: “Can I confirm after class?”', 3 * H, 7, 'r2'),
  r('singlish-can-or-not', 'r3', 'jo', 'I like keeping the reply as simple as the question. If I can’t make it, I offer another time rather than just saying no.', 2 * H, 10),
  r('singlish-chope', 'r1', 'liv', 'I’d make the action explicit: “Are you saving a place for us, or would you like me to do that?” It’s a friendly check rather than a guess.', 19 * H, 29),
  r('singlish-chope', 'r2', 'wei', 'At lunch time someone chopes the table with a tissue packet while the others buy food. If they said “you chope”, you sit and guard the table!', 18 * H, 36),
  r('singlish-chope', 'r2-a', 'ren', 'Ah, so that’s why there are tissue packets on empty tables. Thank you!', 17 * H, 8, 'r2'),
  r('food-hawker-order', 'r1', 'marcus', 'For chicken rice they usually ask “eat here or take away?” (“tapau”), then roasted or steamed, and maybe “add egg?”. Have those answers ready and you’re fine.', H, 14),
  r('food-hawker-order', 'r2', 'wei', '讲“here eat”或者“tapau”就好。Uncle 问很快不是凶，是午餐时间人多。', 50, 9),
  r('food-kopi-order', 'r1', 'jo', 'Kopi = with condensed milk (sweet). Kopi O = black with sugar. Kopi C = evaporated milk and sugar. Add “kosong” for no sugar, “siew dai” for less sugar, “peng” for iced.', 4 * H, 58),
  r('food-kopi-order', 'r1-a', 'eli', 'This is going on a note in my phone. Kopi O kosong it is.', 3 * H + 30, 11, 'r1'),
  r('food-kopi-order', 'r2', 'marcus', 'And “gao” for stronger, “poh” for weaker. Uncles appreciate it when you say it in one go: “kopi C siew dai peng”.', 3 * H, 33),
  r('temple-visit-etiquette', 'r1', 'xiaolin', '可以进去参观，祈祷的人优先，不要挡在供桌前面拍照。穿着不要太暴露就好。', D + 5 * H, 16),
  r('temple-visit-etiquette', 'r2', 'wei', 'Step over the raised threshold, don’t stand on it. Photos are fine, just not of people praying up close.', D + 3 * H, 24),
  r('mosque-visit', 'r1', 'aisyah', 'Visitors are welcome outside prayer times. Friday around midday is the busiest prayer of the week, so a later visit is easier. Robes are available at the entrance if needed.', 7 * H, 21),
  r('mosque-visit', 'r2', 'nina', 'Shoes off before the carpet, and the main prayer hall may be closed to visitors at times. The volunteers at the door are very friendly, just ask them.', 6 * H, 13),
  r('deepavali-greeting', 'r1', 'priya', '“Happy Deepavali!” is lovely to hear, even from people who don’t celebrate. In the office everyone says it to everyone.', 20, 5),
  r('lunar-new-year-visit', 'r1', 'wei', '带两个橘子，进门时双手递给长辈，说“新年快乐”或者“恭喜发财”。离开时他们通常也会回你两个。', 4 * D - 3 * H, 41),
  r('lunar-new-year-visit', 'r2', 'ning', '如果有小孩，可以准备红包，数字避开四。不确定的话先问朋友，他们会很乐意告诉你。', 3 * D + 20 * H, 23),
  r('lunar-new-year-visit', 'r2-a', 'xiaohe', '原来是双数，谢谢！我去买红包。', 3 * D + 10 * H, 6, 'r2'),
  r('hari-raya-open-house', 'r1', 'aisyah', 'Just come! A small box of biscuits or kuih is nice but not expected. People drop in, eat, chat for an hour or so, and say “Selamat Hari Raya” when they arrive.', 5 * D + 10 * H, 38),
  r('hari-raya-open-house', 'r2', 'hafiz', 'Dress smart-casual, and no need for exact timing. Open houses go on the whole afternoon.', 5 * D, 15),
  r('singlish-lah-tone', 'r1', 'mel', 'Mostly it softens things. “Okay lah” with a smile = sure, no problem. Said flat and short after a long ask = fine, I give in. Watch the face more than the word.', 10 * H, 47),
  r('singlish-lah-tone', 'r2', 'ash', 'Agree. If you’re not sure, “really can ah?” is a friendly way to check.', 9 * H, 18),
  r('chinese-chi-le-ma', 'r1', 'xiaolin', '这是打招呼，就像“你好”。回“吃了，你呢？”就很好，不用报菜单哈哈。', 2 * D - 2 * H, 52),
  r('chinese-chi-le-ma', 'r1-a', 'anan', '哈哈原来如此，下次我就这样回。', 2 * D - 4 * H, 9, 'r1'),
  r('daily-mrt-seat', 'r1', 'daniel', 'Sitting there is fine when it’s empty. People just expect you to get up straight away when someone who needs it comes in.', 2 * H, 8),
];



export interface SampleNotification {
  id: string;
  kind: 'reply' | 'mention';
  actor: string;
  threadId: string;
  replyId: string;
  sample: true;
}

const n = (id: string, kind: SampleNotification['kind'], by: string, threadId: string, replyId: string): SampleNotification => ({
  id, kind, actor: nameOf(by), threadId, replyId: `${threadId}-${replyId}`, sample: true,
});

/** Activity on threads the user follows (ZIP communityNotifications); real ones come from answers to my own questions. */
const OUR_NOTIFICATIONS: SampleNotification[] = [
  n('n-mel-mention', 'mention', 'mel', 'singlish-can-or-not', 'r2-a'),
  n('n-mel-reply', 'reply', 'mel', 'singlish-can-or-not', 'r1-b'),
  n('n-jo-kopi', 'reply', 'jo', 'food-kopi-order', 'r1'),
  n('n-wei-chope', 'reply', 'wei', 'singlish-chope', 'r2'),
  n('n-xiaolin-chi', 'reply', 'xiaolin', 'chinese-chi-le-ma', 'r1'),
];

/* ---------- The community card kit, merged ---------- */

const ourIds = new Set(OUR_THREADS.map((x) => x.id));
/** Map areas we gave the threads the kit shares with us (it has no areas of its own beyond two places). */
const OUR_AREAS = new Map(OUR_THREADS.map((x) => [x.id, x.areaId]));
const kitIds = new Set(KIT.questions.map((q) => q.id));

/** A stable, plausible view count for a kit thread (the kit has none): grows with its replies and likes. */
function viewsFor(id: string, replies: number, likes: number): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 24 + replies * 31 + likes * 4 + (h % 60);
}

/** Kit covers that are copies of the prototype's own photos: use ours, so the photo keeps its credit line. */
const KIT_EXISTING_PHOTOS: Readonly<Record<string, string>> = {
  'existing:assets/5142c.png': bakKwa,
  'existing:assets/c15ab.png': street,
  'existing:assets/f5d56.png': temple,
  'existing:assets/1a24d.png': cafe,
};

const kitThreads: SampleThread[] = KIT.questions.map((q) => {
  const replies = KIT.replies.filter((x) => x.q === q.id);
  const cover = (q.cover && KIT_EXISTING_PHOTOS[q.cover] ? { src: KIT_EXISTING_PHOTOS[q.cover] } : undefined) ?? kitCover(q.cover);
  return {
    id: q.id,
    channel: q.board as ChannelId,
    title: q.title,
    body: q.body,
    tags: q.tags,
    photo: cover?.src ?? street,
    photoAlt: q.coverAlt ?? undefined,
    author: kitName(q.author),
    ago: q.ago,
    views: viewsFor(q.id, replies.length, replies.reduce((n, x) => n + x.likes, 0)),
    // map-temple asks about Thian Hock Keng, in Chinatown (the kit left its place empty)
    areaId: OUR_AREAS.get(q.id) ?? (q.place ? KIT_PLACE_AREAS[q.place] : q.id === 'map-temple' ? 'sg-chinatown' : undefined),
    closed: q.closed,
    mine: q.mine,
    sample: true,
  };
});

/** All community threads: the kit's 200, then ours that the kit does not have (written by our members). */
export const SAMPLE_THREADS: SampleThread[] = [...kitThreads, ...OUR_THREADS.filter((x) => !kitIds.has(x.id))];

export const SAMPLE_REPLIES: SampleReply[] = [
  ...[...KIT.replies]
    .sort((a, b) => (a.q === b.q ? a.seq - b.seq : 0))
    .map((x) => ({
      id: x.id,
      threadId: x.q,
      parentId: x.parent ?? undefined,
      author: kitName(x.author),
      text: x.text.replace(/@jamie\.chen\b/g, '@You'),
      ago: x.ago,
      likes: x.likes,
      sample: true as const,
    })),
  ...OUR_REPLIES.filter((x) => !kitIds.has(x.threadId)),
];

export const SAMPLE_NOTIFICATIONS: SampleNotification[] = [
  ...KIT.notifications.map((x) => ({
    id: x.id,
    kind: x.kind === 'mention' ? ('mention' as const) : ('reply' as const),
    actor: kitName(x.actor),
    threadId: x.q,
    replyId: x.reply,
    sample: true as const,
  })),
  ...OUR_NOTIFICATIONS.filter((x) => ourIds.has(x.threadId) && !kitIds.has(x.threadId)),
];

/** Home carousels: the kit's Top / For You order, with our own threads woven in every few cards. */
function weave(kit: string[], ours: string[]): string[] {
  const out: string[] = [];
  kit.forEach((id, i) => {
    out.push(id);
    if (i % 4 === 1 && ours.length) out.push(ours.shift()!);
  });
  return [...out, ...ours];
}
const extra = OUR_THREADS.filter((x) => !kitIds.has(x.id)).map((x) => x.id);
export const FEEDS: Record<Feed, string[]> = {
  top: weave(KIT.feeds.top.slice(0, 18), extra.slice(0, Math.ceil(extra.length / 2))),
  'for-you': weave(KIT.feeds.forYou.slice(0, 18), extra.slice(Math.ceil(extra.length / 2))),
};

export function sampleThread(id: string): SampleThread | undefined {
  return SAMPLE_THREADS.find((thread) => thread.id === id);
}

/** Locals who chose to show a profile on the Locals map: area level only, never a point. */
export interface SamplePerson {
  id: string;
  name: string;
  about: string;
  areaId: string;
  helpsWith: ChannelId[];
  sample: true;
}

function channelsFor(member: Member): ChannelId[] {
  const out: ChannelId[] = [];
  if (member.languages.some((l) => l === 'Singlish' || l === 'English')) out.push('singapore-singlish', 'daily-usage');
  if (member.languages.some((l) => l === '中文' || l === 'Mandarin')) out.push('chinese-exchange');
  if (member.line.includes('Causeway') || member.languages.includes('Malay')) out.push('chinese-culture-malaysia');
  return [...new Set(out)];
}

export const SAMPLE_PEOPLE: SamplePerson[] = MEMBERS.filter((x) => x.role === 'local').map((x) => ({
  id: `p-${x.id}`,
  name: x.name,
  about: x.line,
  areaId: x.areaId,
  helpsWith: channelsFor(x),
  sample: true,
}));
