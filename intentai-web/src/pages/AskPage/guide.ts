// The phrase guide behind "Understand the meaning". No model: every entry is written down here.
// Singlish meanings follow Wikipedia's "Singlish vocabulary" (checked 29 Oct 2026, quoted in `source.quote`); the
// readings by tone, the "still unclear" lines and the replies are the team's own guidance and are labelled so.
// Chinese workplace phrases have no outside source; they are labelled "team-written guidance".

export const TONES = ['Smiling', 'Flat', 'Rushed', 'Annoyed', 'Not sure'] as const;
export type Tone = (typeof TONES)[number];

/** Where / who / tone, plus a free detail. Every part optional. */
export interface Situation {
  where: string;
  who: string;
  /** Kept for older records and the Add context sheet; not asked for any more. */
  topic: string;
  tone?: Tone;
  detail?: string;
}

export const EMPTY_SITUATION: Situation = { where: '', who: '', topic: '' };

export const WHERE_OPTIONS = ['Office', 'Group chat', 'Class', 'Hawker centre', 'MRT', 'Home'] as const;
export const WHO_OPTIONS = ['Your boss', 'Your colleague', 'Your classmate', 'Your friend', 'A stranger', 'The stall owner'] as const;

export interface GuideSource {
  label: string;
  url: string;
  /** The source's own words for the entry (short). */
  quote: string;
}

export interface Reading {
  text: string;
  /** Tones in which this reading is the most likely one. */
  fits: readonly Tone[];
}

export interface GuideEntry {
  id: string;
  term: string;
  /** Lower-case strings that identify the phrase in a question. */
  keys: readonly string[];
  lang: 'Singlish' | '中文';
  literal: string;
  /** What it usually means when we know nothing about the situation. */
  general: string;
  /** Other ways it can be meant, and when each is most likely. */
  readings: readonly Reading[];
  unclear: string;
  reply: string;
  softer: string;
  /** Null: team-written guidance only. */
  source: GuideSource | null;
}

const WIKI: Pick<GuideSource, 'label' | 'url'> = {
  label: 'Wikipedia · Singlish vocabulary',
  url: 'https://en.wikipedia.org/wiki/Singlish_vocabulary',
};
const wiki = (quote: string): GuideSource => ({ ...WIKI, quote });

export const GUIDE: readonly GuideEntry[] = [
  {
    id: 'chope',
    term: 'Chope',
    keys: ['chope', 'chop a seat', 'chop seat'],
    lang: 'Singlish',
    literal: 'Reserve something, usually a seat.',
    general: 'They want a seat kept for them, often by leaving a tissue packet or another object on it.',
    readings: [
      { text: 'A friendly favour: please hold a seat for them.', fits: ['Smiling', 'Flat', 'Not sure'] },
      { text: 'A quick instruction because the place is filling up.', fits: ['Rushed'] },
      { text: 'A complaint that someone else has reserved seats.', fits: ['Annoyed'] },
    ],
    unclear: 'How long the seat should stay saved, and for how many people.',
    reply: 'Can! I’ll chope one for you.',
    softer: 'Sure, I’ll save you a seat. See you there!',
    source: wiki('Slang for reserving a seat… Singaporeans have a habit of leaving objects on seats or tables to reserve places (usually tissue packets).'),
  },
  {
    id: 'can-or-not',
    term: 'Can or not?',
    keys: ['can or not', 'can anot', 'can a not'],
    lang: 'Singlish',
    literal: 'Is it possible, or is it OK?',
    general: 'They are checking whether this works for you, and expect a short “Can!” or “Cannot”.',
    readings: [
      { text: 'A real question: they want your yes or no.', fits: ['Flat', 'Smiling', 'Not sure'] },
      { text: 'A nudge: they would like it done, soon.', fits: ['Rushed', 'Annoyed'] },
    ],
    unclear: 'Whether they want a firm yes now, and what happens if you say no.',
    reply: 'Can! What time works for you?',
    softer: 'Should be can. Let me check and tell you soon, OK?',
    source: wiki('Used extensively as both a question particle and an answer particle. The negative is “cannot”. E.g. “Can or not?” (Can you do that?) —“Can!” (Sure!)'),
  },
  {
    id: 'paiseh',
    term: 'Paiseh',
    keys: ['paiseh', 'pai seh', 'pai-seh'],
    lang: 'Singlish',
    literal: 'Embarrassed.',
    general: 'A soft apology, usually after a small mistake or for troubling you.',
    readings: [
      { text: 'A light “sorry about that”, nothing serious.', fits: ['Smiling', 'Flat', 'Not sure'] },
      { text: 'Sorry, and they are about to ask you for something.', fits: ['Rushed'] },
    ],
    unclear: 'How strong the apology is, and whether they are also asking for something.',
    reply: 'No problem!',
    softer: 'Don’t worry, it’s no trouble at all.',
    source: wiki('Means to be embarrassed. Usually used as an apology after making an embarrassing mistake.'),
  },
  {
    id: 'sabo',
    term: 'Sabo',
    keys: ['sabo', 'kena sabo'],
    lang: 'Singlish',
    literal: 'Sabotage.',
    general: 'Playing a trick on someone, or getting someone else into trouble.',
    readings: [
      { text: 'A joke: they are teasing you (or themselves) about a small setback.', fits: ['Smiling'] },
      { text: 'A real complaint: they think someone got them into trouble.', fits: ['Annoyed', 'Flat'] },
    ],
    unclear: 'Whether it was a joke.',
    reply: 'Haha, you sabo me ah!',
    softer: 'Haha, no worries. Next time you help me, OK?',
    source: wiki('To play a trick on someone, with a related meaning of “getting someone else in trouble”.'),
  },
  {
    id: 'shiok',
    term: 'Shiok',
    keys: ['shiok'],
    lang: 'Singlish',
    literal: 'Great, delightful.',
    general: 'Sheer delight with an experience, especially good food.',
    readings: [{ text: 'They really enjoyed it.', fits: ['Smiling', 'Flat', 'Rushed', 'Not sure'] }],
    unclear: 'Nothing much: it is almost always positive.',
    reply: 'Shiok right! Next time we go again.',
    softer: 'So glad you liked it!',
    source: wiki('To express sheer delight with an experience, especially when eating great food.'),
  },
  {
    id: 'kiasu',
    term: 'Kiasu',
    keys: ['kiasu'],
    lang: 'Singlish',
    literal: 'Afraid of losing.',
    general: 'Someone who does a lot to avoid missing out, like queueing early or grabbing extra.',
    readings: [
      { text: 'Gentle teasing about being over-prepared.', fits: ['Smiling'] },
      { text: 'A criticism of someone being too competitive.', fits: ['Annoyed', 'Flat'] },
    ],
    unclear: 'Whether it is affectionate or critical.',
    reply: 'Haha, better safe than sorry!',
    softer: 'Haha, guilty. I just didn’t want to miss it.',
    source: wiki('(From Hokkien/Teochew 驚輸) lit. ‘to be afraid of losing’.'),
  },
  {
    id: 'lepak',
    term: 'Lepak',
    keys: ['lepak'],
    lang: 'Singlish',
    literal: 'Relax, hang out.',
    general: 'To relax or hang out with no particular plan.',
    readings: [{ text: 'An invitation to hang out.', fits: ['Smiling', 'Flat', 'Not sure'] }, { text: 'Calling someone idle.', fits: ['Annoyed'] }],
    unclear: 'Whether it is an invitation, or a comment that someone is slacking.',
    reply: 'Sure, where to lepak?',
    softer: 'Sounds good, I’m free later.',
    source: wiki('To relax. E.g.: “Let’s go lepak one corner.”'),
  },
  {
    id: 'alamak',
    term: 'Alamak',
    keys: ['alamak'],
    lang: 'Singlish',
    literal: 'Oh no!',
    general: 'Shock, surprise or dismay at something that just happened.',
    readings: [{ text: 'A small oops.', fits: ['Smiling', 'Flat', 'Not sure'] }, { text: 'Real dismay: something went wrong.', fits: ['Annoyed', 'Rushed'] }],
    unclear: 'How bad the thing that happened is.',
    reply: 'Alamak, what happened?',
    softer: 'Oh no, are you OK? Anything I can help with?',
    source: wiki('It expresses shock or surprise, and also dismay.'),
  },
  {
    id: 'jialat',
    term: 'Jialat',
    keys: ['jialat', 'jia lat'],
    lang: 'Singlish',
    literal: 'Sapping strength.',
    general: 'Being in trouble, or a terrible situation.',
    readings: [{ text: 'A dramatic joke about a small problem.', fits: ['Smiling'] }, { text: 'Things really are bad.', fits: ['Annoyed', 'Flat', 'Rushed'] }],
    unclear: 'How serious it is.',
    reply: 'Jialat. Need help?',
    softer: 'That sounds tough. Want me to help with anything?',
    source: wiki('Used to describe being in trouble or a terrible situation.'),
  },
  {
    id: 'bo-jio',
    term: 'Bo jio',
    keys: ['bo jio', 'bojio', 'boh jio'],
    lang: 'Singlish',
    literal: 'You didn’t invite me.',
    general: 'They noticed they were left out of a plan.',
    readings: [{ text: 'Playful: they would have liked to come.', fits: ['Smiling', 'Not sure'] }, { text: 'They feel left out.', fits: ['Annoyed', 'Flat'] }],
    unclear: 'Whether they are joking or a bit hurt.',
    reply: 'Next time I jio you!',
    softer: 'Sorry! It was last minute. Come along next time?',
    source: wiki('You didn’t invite me.'),
  },
  {
    id: 'makan',
    term: 'Makan',
    keys: ['makan'],
    lang: 'Singlish',
    literal: 'Eat.',
    general: 'To eat; often an invitation to eat together.',
    readings: [{ text: 'An invitation to eat together.', fits: ['Smiling', 'Flat', 'Rushed', 'Not sure'] }],
    unclear: 'Where and when.',
    reply: 'Can! Where to makan?',
    softer: 'Sure, I’d love to join. Where shall we go?',
    source: wiki('To eat.'),
  },
  {
    id: 'sian',
    term: 'Sian',
    keys: ['sian', 'sien'],
    lang: 'Singlish',
    literal: 'Bored, tired.',
    general: 'Bored, tired, or sick of something.',
    readings: [{ text: 'Mild boredom.', fits: ['Flat', 'Smiling', 'Not sure'] }, { text: 'Really fed up.', fits: ['Annoyed'] }],
    unclear: 'What they are tired of, and whether they want to talk about it.',
    reply: 'So sian. Want to grab kopi?',
    softer: 'Long day? Let me know if you want a break together.',
    source: wiki('Bored, tired, or sick of something.'),
  },
  {
    id: 'atas',
    term: 'Atas',
    keys: ['atas'],
    lang: 'Singlish',
    literal: 'Above.',
    general: 'Either snobbish, or high-class and sophisticated.',
    readings: [{ text: 'Fancy, posh (a place or a thing).', fits: ['Smiling', 'Flat', 'Not sure'] }, { text: 'Snobbish (a person).', fits: ['Annoyed'] }],
    unclear: 'Whether it describes a place, or criticises a person.',
    reply: 'Haha, so atas!',
    softer: 'It does look fancy!',
    source: wiki('1. Used to describe a snobbish and arrogant person. 2. Used to describe a “high class”, well-to-do or sophisticated person.'),
  },
  {
    id: 'blur',
    term: 'Blur',
    keys: ['blur'],
    lang: 'Singlish',
    literal: 'Unclear.',
    general: 'Someone forgetful, clumsy, or not aware of what is going on.',
    readings: [{ text: 'Gentle teasing.', fits: ['Smiling'] }, { text: 'Frustration that you missed something.', fits: ['Annoyed', 'Rushed'] }],
    unclear: 'Whether it is teasing or a complaint.',
    reply: 'Paiseh, I was blur. Can explain again?',
    softer: 'Sorry, I missed that. Could you say it once more?',
    source: wiki('Someone who is forgetful, clumsy, or oblivious.'),
  },
  {
    id: 'catch-no-ball',
    term: 'Catch no ball',
    keys: ['catch no ball'],
    lang: 'Singlish',
    literal: 'Didn’t catch the ball.',
    general: 'They could not understand what was said.',
    readings: [{ text: 'They need it explained again.', fits: ['Smiling', 'Flat', 'Not sure', 'Rushed'] }, { text: 'Frustration with a confusing explanation.', fits: ['Annoyed'] }],
    unclear: 'Which part they didn’t follow.',
    reply: 'Let me explain again, slowly.',
    softer: 'Sorry, that was confusing. Let me try another way.',
    source: wiki('Unable to understand something that someone says.'),
  },
  {
    id: 'kaypoh',
    term: 'Kaypoh',
    keys: ['kaypoh', 'kay poh', 'kpo'],
    lang: 'Singlish',
    literal: 'Busybody.',
    general: 'Someone nosy, who pokes into other people’s business.',
    readings: [{ text: 'Playful: you asked a lot of questions.', fits: ['Smiling'] }, { text: 'Telling you to mind your own business.', fits: ['Annoyed', 'Flat'] }],
    unclear: 'Whether they mind your question.',
    reply: 'Haha, just curious!',
    softer: 'Sorry, didn’t mean to pry.',
    source: wiki('A busybody.'),
  },
  {
    id: 'align-granularity',
    term: '对齐 · 颗粒度',
    keys: ['对齐', '颗粒度', 'granularity'],
    lang: '中文',
    literal: '先和产品团队统一理解，再把内容拆得更具体。',
    general: '对方可能觉得方案还太笼统，希望你明确具体要做什么、交付什么，以及由谁推进。',
    readings: [
      { text: '真的需要更细的计划：交付物、负责人、时间点。', fits: ['Flat', 'Rushed', 'Not sure'] },
      { text: '对目前的方案不太满意，委婉地要求返工。', fits: ['Annoyed'] },
      { text: '例行的会议用语，不一定有很高的要求。', fits: ['Smiling'] },
    ],
    unclear: '需要细化哪一部分、细到什么程度，以及什么时候完成。',
    reply: '你希望我先细化哪一部分？我可以按交付物、负责人和时间节点整理。',
    softer: '可以呀，我先整理一版具体的交付物、负责人和时间点。你看最需要优先细化的是哪一部分？',
    source: null,
  },
  {
    id: 'shoudao',
    term: '收到',
    keys: ['收到'],
    lang: '中文',
    literal: '我收到了（你的消息）。',
    general: '确认看到了消息，常见于工作群；本身不表示同意或情绪。',
    readings: [
      { text: '只是确认，会照做。', fits: ['Flat', 'Rushed', 'Not sure'] },
      { text: '可能有点冷淡或不太高兴，但只凭“收到”两个字判断不了。', fits: ['Annoyed'] },
    ],
    unclear: '对方是同意、照办，还是只是“看到了”。',
    reply: '好的，有问题随时找我。',
    softer: '谢谢！有需要我补充的地方随时说哈。',
    source: null,
  },
  {
    id: 'xian-fang-zhe',
    term: '先放着',
    keys: ['先放着', '放一放', '先放一放'],
    lang: '中文',
    literal: '先放在那里，暂时不处理。',
    general: '现在不急，或者有更优先的事；不一定是否定。',
    readings: [
      { text: '真的不急，之后再处理。', fits: ['Flat', 'Smiling', 'Not sure'] },
      { text: '委婉地表示这件事不太重要或不打算做。', fits: ['Annoyed', 'Rushed'] },
    ],
    unclear: '“之后”是多久，以及以后谁来跟进。',
    reply: '好的，那我先放着。需要的时候提醒我一下？',
    softer: '没问题～我先记下来，你觉得什么时候再看比较合适？',
    source: null,
  },
  {
    id: 'xinku-le',
    term: '辛苦了',
    keys: ['辛苦了', '辛苦啦'],
    lang: '中文',
    literal: '你辛苦了。',
    general: '感谢和认可你的付出，是常见的客气话。',
    readings: [
      { text: '真心感谢。', fits: ['Smiling', 'Flat', 'Not sure'] },
      { text: '礼貌性的结束语，表示这件事告一段落。', fits: ['Rushed'] },
    ],
    unclear: '是单纯感谢，还是暗示事情结束了。',
    reply: '不辛苦，应该的！',
    softer: '谢谢～也辛苦你啦！',
    source: null,
  },
  {
    id: 'huitou-zaishuo',
    term: '回头再说',
    keys: ['回头再说', '回头说', '以后再说'],
    lang: '中文',
    literal: '之后再谈。',
    general: '现在不方便讨论；可能真会再谈，也可能是委婉拒绝。',
    readings: [
      { text: '现在忙，之后会再聊。', fits: ['Rushed', 'Flat', 'Not sure'] },
      { text: '委婉地拒绝或不想继续这个话题。', fits: ['Annoyed'] },
      { text: '轻松的随口一说。', fits: ['Smiling'] },
    ],
    unclear: '会不会真的再谈，以及什么时候。',
    reply: '好的，那我们找个时间再聊。',
    softer: '没问题～你方便的时候跟我说一声就好。',
    source: null,
  },
  {
    id: 'damo',
    term: '打磨一下',
    keys: ['打磨'],
    lang: '中文',
    literal: '再磨一磨，让它更好。',
    general: '方向基本可以，但细节还需要改进。',
    readings: [
      { text: '小修小改就行。', fits: ['Smiling', 'Flat', 'Not sure'] },
      { text: '其实不太满意，需要比较大的修改。', fits: ['Annoyed', 'Rushed'] },
    ],
    unclear: '具体哪些地方要改，改到什么程度。',
    reply: '好的，你觉得最需要打磨的是哪几处？',
    softer: '收到～我先列一下我觉得可以改的地方，你帮我看看方向对不对？',
    source: null,
  },
];

/** Where a key first appears: whole words for Latin keys ("sian" is not in "Asian"), anywhere for Chinese ones. */
function keyAt(lower: string, key: string): number {
  if (!/[a-z]/.test(key)) return lower.indexOf(key);
  const m = new RegExp(`(^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`).exec(lower);
  return m ? m.index + m[1].length : -1;
}

/** The guide entry a question is about: the earliest key it mentions. */
export function findEntry(text: string): GuideEntry | undefined {
  const lower = text.toLowerCase();
  let best: { entry: GuideEntry; at: number } | undefined;
  for (const entry of GUIDE) {
    for (const key of entry.keys) {
      const at = keyAt(lower, key);
      if (at >= 0 && (!best || at < best.at)) best = { entry, at };
    }
  }
  return best?.entry;
}

const WHO_WORDS: [RegExp, string][] = [
  [/领导|老板|上司|主管|经理|\bboss\b|\bmanager\b|\bsupervisor\b/i, 'Your boss'],
  [/同事|colleague|teammate|co-?worker/i, 'Your colleague'],
  [/同学|classmate|\bTA\b|tutor/i, 'Your classmate'],
  [/朋友|friend|buddy/i, 'Your friend'],
  [/店员|摊主|uncle|auntie|stall/i, 'The stall owner'],
  [/陌生人|stranger/i, 'A stranger'],
];
const WHERE_WORDS: [RegExp, string][] = [
  [/群里|群聊|group ?chat|whatsapp|telegram|微信/i, 'Group chat'],
  [/开会|会议|公司|办公室|meeting|office/i, 'Office'],
  [/上课|课堂|lecture|tutorial|class/i, 'Class'],
  [/hawker|小贩|食阁|kopitiam|咖啡店/i, 'Hawker centre'],
  [/\bMRT\b|地铁|bus|巴士/i, 'MRT'],
  [/家里|at home|\bhome\b/i, 'Home'],
];
/**
 * Only words that describe how it was said. "Annoyed" is never pre-selected: "是不是不高兴了" / "is he upset?" is the
 * question being asked, so assuming it would bias the reading. The user picks it.
 */
const TONE_WORDS: [RegExp, Tone][] = [
  [/笑着|笑了|哈哈|haha|lol|😂|😆|开玩笑|joking|laugh|smil/i, 'Smiling'],
  [/急着|赶时间|rushed|in a hurry/i, 'Rushed'],
];

/** Whatever the sentence itself says about the situation (who, where, tone). */
export function detectSituation(text: string): Partial<Situation> {
  const pick = <T,>(list: [RegExp, T][]) => list.find(([re]) => re.test(text))?.[1];
  const found: Partial<Situation> = {};
  const who = pick(WHO_WORDS);
  const where = pick(WHERE_WORDS);
  const tone = pick(TONE_WORDS);
  if (who) found.who = who;
  if (where) found.where = where;
  if (tone) found.tone = tone;
  return found;
}

export type Likelihood = 'Most likely' | 'Possible';

/** The entry's readings for this situation: the ones that fit its tone first. */
export function rankReadings(entry: GuideEntry, situation: Situation): { text: string; likelihood: Likelihood }[] {
  const tone = situation.tone && situation.tone !== 'Not sure' ? situation.tone : undefined;
  const ranked = tone ? [...entry.readings].sort((a, b) => Number(b.fits.includes(tone)) - Number(a.fits.includes(tone))) : entry.readings;
  return ranked.map((r, i) => ({ text: r.text, likelihood: i === 0 ? 'Most likely' : 'Possible' }));
}

export type ConfidenceLevel = 'Low' | 'Medium' | 'Good';

export interface Confidence {
  level: ConfidenceLevel;
  /** Why, one line each: what raised it and what would raise it more. */
  reasons: { ok: boolean; text: string }[];
}

/**
 * How sure the reading can be. Never "certain": the words alone don't decide. Points: the phrase is in the guide,
 * an outside source backs its meaning, and the user said who, where and how it was said.
 */
export function confidenceOf(entry: GuideEntry | undefined, s: Situation): Confidence {
  const reasons = [
    { ok: Boolean(entry), text: entry ? `“${entry.term}” is in the phrase guide` : 'This phrase isn’t in the guide yet' },
    { ok: Boolean(entry?.source), text: entry?.source ? `Its meaning is backed by ${entry.source.label}` : 'No outside source for this phrase' },
    { ok: Boolean(s.who.trim()), text: s.who.trim() ? `You said who: ${s.who}` : 'Who said it is unknown' },
    { ok: Boolean(s.where.trim()), text: s.where.trim() ? `You said where: ${s.where}` : 'Where it was said is unknown' },
    { ok: Boolean(s.tone && s.tone !== 'Not sure'), text: s.tone && s.tone !== 'Not sure' ? `You said how: ${s.tone.toLowerCase()}` : 'The tone is unknown' },
  ];
  if (!entry) return { level: 'Low', reasons };
  const points = reasons.filter((r) => r.ok).length;
  return { level: points >= 5 ? 'Good' : points >= 3 ? 'Medium' : 'Low', reasons };
}

/** True when the situation says nothing about who said it, where, or how. */
export function situationIsThin(s: Situation): boolean {
  return [s.who, s.where].filter((x) => x.trim()).length + (s.tone && s.tone !== 'Not sure' ? 1 : 0) < 2;
}
