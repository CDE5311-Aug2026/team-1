import chopePhoto from '../assets/chope-photo.jpg';
import canOrNotPhoto from '../assets/can-or-not-photo.jpg';
import paisehPhoto from '../assets/paiseh-photo.jpg';
import tapauPhoto from '../assets/tapau-photo.jpg';
import steadyPhoto from '../assets/steady-photo.jpg';
import boJioPhoto from '../assets/bo-jio-photo.jpg';
import tumpangPhoto from '../assets/tumpang-photo.jpg';
import shiokPhoto from '../assets/shiok-photo.jpg';
import dieDieMustPhoto from '../assets/die-die-must-photo.jpg';
import kiasuPhoto from '../assets/kiasu-photo.jpg';
import jialatPhoto from '../assets/jialat-photo.jpg';
import makanPhoto from '../assets/makan-photo.jpg';
import { paths } from '../routes';
import type { Expression, LessonPhrase } from '../types';
import type { Topic } from './domain';

/**
 * Lesson bank, in teaching order. The first three are Figma's Home cards (1:120, 1:185, 1:252);
 * each onboarding topic has three phrases so any single-topic choice still fills a day.
 */
export const phraseBank: LessonPhrase[] = [
  {
    id: 'chope',
    topic: 'Daily life',
    icon: 'chair',
    context: { icon: 'bowl', label: 'Hawker centre · lunch' },
    title: 'Chope',
    phonetic: '/chohp/',
    description: 'Save a seat, often with a tissue packet on the table.',
    example: '“I chope a table first, you go order.”',
    photo: chopePhoto,
  },
  {
    id: 'can-or-not',
    topic: 'Work',
    icon: 'think',
    context: { icon: 'work', label: 'Team chat · work' },
    title: 'Can or not?',
    description: 'Is it possible or OK? Reply “Can!” or “Cannot lah.”',
    example: '“Meet at six, can or not?” “Can!”',
    photo: canOrNotPhoto,
  },
  {
    id: 'paiseh',
    topic: 'Getting around',
    icon: 'grim',
    context: { icon: 'metro', label: 'MRT · crowded train' },
    title: 'Paiseh',
    phonetic: '/pie-seh/',
    description: 'Sorry or embarrassed — a soft, polite apology.',
    example: '“Paiseh, can I squeeze past?”',
    photo: paisehPhoto,
  },
  {
    id: 'tapau',
    topic: 'Food',
    icon: 'bowl',
    context: { icon: 'bowl', label: 'Hawker centre · ordering' },
    title: 'Tapau',
    phonetic: '/tah-pow/',
    description: 'Takeaway — pack the food to go.',
    example: '“Auntie, one chicken rice, tapau.”',
    photo: tapauPhoto,
  },
  {
    id: 'steady',
    topic: 'Work',
    icon: 'spark',
    context: { icon: 'work', label: 'Office · praise' },
    title: 'Steady',
    description: 'Well done, reliable — a quick compliment.',
    example: '“You finished the slides already? Steady!”',
    photo: steadyPhoto,
  },
  {
    id: 'bo-jio',
    topic: 'Daily life',
    icon: 'grim',
    context: { icon: 'wave', label: 'Group chat · friends' },
    title: 'Bo jio',
    phonetic: '/boh jee-oh/',
    description: 'You didn’t invite me! — a playful complaint.',
    example: '“You all went for supper? Bo jio!”',
    photo: boJioPhoto,
  },
  {
    id: 'tumpang',
    topic: 'Getting around',
    icon: 'metro',
    context: { icon: 'metro', label: 'Car · ride home' },
    title: 'Tumpang',
    phonetic: '/toom-pahng/',
    description: 'Hitch a ride or share something for a while.',
    example: '“Can I tumpang your car to the MRT?”',
    photo: tumpangPhoto,
  },
  {
    id: 'shiok',
    topic: 'Food',
    icon: 'fire',
    context: { icon: 'bowl', label: 'Hawker centre · dinner' },
    title: 'Shiok',
    phonetic: '/shee-ok/',
    description: 'Very satisfying — great food or a great feeling.',
    example: '“Wah, this laksa damn shiok!”',
    photo: shiokPhoto,
  },
  {
    id: 'die-die-must',
    topic: 'Work',
    icon: 'think',
    context: { icon: 'work', label: 'Office · deadline' },
    title: 'Die-die must',
    description: 'Absolutely must, no matter what.',
    example: '“This report die-die must send today.”',
    photo: dieDieMustPhoto,
  },
  {
    id: 'kiasu',
    topic: 'Daily life',
    icon: 'chair',
    context: { icon: 'sunrise', label: 'Queue · weekend' },
    title: 'Kiasu',
    phonetic: '/kee-ah-soo/',
    description: 'Afraid of missing out, so always first in line.',
    example: '“Queue two hours for a free bag? So kiasu.”',
    photo: kiasuPhoto,
  },
  {
    id: 'jialat',
    topic: 'Getting around',
    icon: 'grim',
    context: { icon: 'metro', label: 'MRT · delay' },
    title: 'Jialat',
    phonetic: '/jee-ah-laht/',
    description: 'Terrible, a really bad situation.',
    example: '“Train stuck again — jialat.”',
    photo: jialatPhoto,
  },
  {
    id: 'makan',
    topic: 'Food',
    icon: 'bowl',
    context: { icon: 'bowl', label: 'Lunch plans · friends' },
    title: 'Makan',
    phonetic: '/mah-kahn/',
    description: 'Eat, or food — from Malay.',
    example: '“Let’s go makan, I’m starving.”',
    photo: makanPhoto,
  },
];

/** Figma's Home card node per slot, so geometry tests follow whichever phrase fills it. */
const SLOT_NODE_IDS = ['1:120', '1:185', '1:252'] as const;

/**
 * Today's three, from the topics picked in onboarding (all topics when none were picked).
 * One phrase per chosen topic first, in bank order, then the next phrases to fill three.
 */
export function dailyExpressions(topics: readonly Topic[]): Expression[] {
  const pool = topics.length > 0 ? phraseBank.filter((p) => topics.includes(p.topic)) : phraseBank;
  const picks: LessonPhrase[] = [];
  for (const phrase of pool) {
    if (picks.length < SLOT_NODE_IDS.length && !picks.some((p) => p.topic === phrase.topic)) picks.push(phrase);
  }
  for (const phrase of pool) {
    if (picks.length < SLOT_NODE_IDS.length && !picks.includes(phrase)) picks.push(phrase);
  }
  return picks.map((phrase, index) => ({
    ...phrase,
    number: String(index + 1).padStart(2, '0'),
    nodeId: SLOT_NODE_IDS[index],
  }));
}

export const staticCopy = {
  greeting: 'Good Morning, W',
  title: "Today's three expressions, Can or cannot learn?",
  progressLabel: (learnedCount: number) => `${learnedCount} of 3 learned today`,
  nearYou: {
    place: 'Old Airport Rd Food Centre',
    subtitle: '3 phrases you might hear here',
  },
  tabs: [
    { path: paths.today, label: 'Today', icon: 'tab-today' as const },
    { path: paths.ask, label: 'Ask', icon: 'tab-ask' as const },
    { path: paths.community, label: 'Community', icon: 'tab-community' as const },
    { path: paths.moments, label: 'Moments', icon: 'tab-moments' as const },
    { path: paths.mySpace, label: 'My Space', icon: 'tab-my-space' as const },
  ],
};
