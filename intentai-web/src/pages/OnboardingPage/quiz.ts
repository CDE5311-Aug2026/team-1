import { TOPICS, type Topic } from '../../data/domain';

export const QUIZ_LENGTH = 3;

export interface QuizQuestion {
  id: string;
  topic: Topic;
  /** Context chip, e.g. "Office · pantry chat". */
  context: string;
  /** The Singlish line, with typographic quotes as shown in Figma. */
  phrase: string;
  prompt: string;
  answers: readonly [string, string, string];
  correct: 0 | 1 | 2;
}

/**
 * Figma 17:216 shows one question (Work, "Paiseh ah…"); v0 added "chope" and "can or not?". The rest
 * extend the same style so the three questions can come from whichever topics the user picked.
 */
export const QUESTION_BANK: Record<Topic, readonly QuizQuestion[]> = {
  Work: [
    {
      id: 'work-paiseh',
      topic: 'Work',
      context: 'Office · pantry chat',
      phrase: '“Paiseh ah, can help me check this report?”',
      prompt: 'What does your colleague mean?',
      answers: ['Sorry to trouble you — can you help?', 'Hurry up and check it now', "I'm embarrassed by your report"],
      correct: 0,
    },
    {
      id: 'work-can-or-not',
      topic: 'Work',
      context: 'Office · meeting',
      phrase: '“Meet at six, can or not?”',
      prompt: 'What is your manager asking?',
      answers: ['The meeting is cancelled', 'We must meet at six', 'Is meeting at six possible?'],
      correct: 2,
    },
    {
      id: 'work-jialat',
      topic: 'Work',
      context: 'Office · deadline',
      phrase: '“This project very jialat already.”',
      prompt: 'What does your colleague mean?',
      answers: ['The project is going badly', 'The project is almost done', 'The project is very fun'],
      correct: 0,
    },
  ],
  Food: [
    {
      id: 'food-chope',
      topic: 'Food',
      context: 'Hawker centre · lunch',
      phrase: '“I chope a table first, you go order.”',
      prompt: 'What does your friend mean?',
      answers: ['I will clean the table', 'I will reserve a table', 'I will order for you'],
      correct: 1,
    },
    {
      id: 'food-tapau',
      topic: 'Food',
      context: 'Hawker stall · ordering',
      phrase: '“Uncle, one mee siam, tapau.”',
      prompt: 'What is the customer asking for?',
      answers: ['One mee siam to eat here', 'One mee siam, extra spicy', 'One mee siam to take away'],
      correct: 2,
    },
    {
      id: 'food-shiok',
      topic: 'Food',
      context: 'Kopitiam · supper',
      phrase: '“Wah, this laksa damn shiok!”',
      prompt: 'How does your friend feel?',
      answers: ['The laksa is too spicy', 'The laksa is really good', 'The laksa is too expensive'],
      correct: 1,
    },
  ],
  'Daily life': [
    {
      id: 'daily-spoil',
      topic: 'Daily life',
      context: 'HDB · lift lobby',
      phrase: '“Aiyo, the lift spoil again.”',
      prompt: 'What is your neighbour saying?',
      answers: ['The lift is broken again', 'The lift is very crowded', 'The lift is being cleaned'],
      correct: 0,
    },
    {
      id: 'daily-chope-seat',
      topic: 'Daily life',
      context: 'Library · study area',
      phrase: '“This seat got people chope already.”',
      prompt: 'What does the student mean?',
      answers: ['The seat is broken', 'Someone has reserved the seat', 'The seat is free to use'],
      correct: 1,
    },
    {
      id: 'daily-paynow',
      topic: 'Daily life',
      context: 'Shop · checkout',
      phrase: '“Can PayNow or not?”',
      prompt: 'What is the shopper asking?',
      answers: ['Whether PayNow is cheaper', 'Whether they must use PayNow', 'Whether PayNow is accepted'],
      correct: 2,
    },
  ],
  'Getting around': [
    {
      id: 'around-paiseh',
      topic: 'Getting around',
      context: 'MRT · crowded train',
      phrase: '“Paiseh, excuse me, I alight here.”',
      prompt: 'What does the commuter mean?',
      answers: ["Sorry — I'm getting off here", "Sorry, I'm lost", 'Excuse me, is this seat free?'],
      correct: 0,
    },
    {
      id: 'around-siao',
      topic: 'Getting around',
      context: 'Bus stop · waiting',
      phrase: '“Wait so long, the bus still never come.”',
      prompt: 'How does the commuter feel?',
      answers: ['Happy to rest a while', 'Fed up with waiting', 'Worried the bus is full'],
      correct: 1,
    },
    {
      id: 'around-grab',
      topic: 'Getting around',
      context: 'Grab · drop-off',
      phrase: '“Uncle, can drop me at the side gate?”',
      prompt: 'What is the passenger asking?',
      answers: ['To wait at the side gate', 'To pick up a friend there', 'To be dropped off at the side gate'],
      correct: 2,
    },
  ],
};

/** Three questions taken in turn from the chosen topics (in `TOPICS` order); Work if none are chosen. */
export function quizFor(topics: readonly Topic[]): QuizQuestion[] {
  const chosen = TOPICS.filter((topic) => topics.includes(topic));
  const pool = chosen.length > 0 ? chosen : (['Work'] as const);
  const quiz: QuizQuestion[] = [];
  for (let round = 0; quiz.length < QUIZ_LENGTH; round += 1) {
    for (const topic of pool) {
      const question = QUESTION_BANK[topic][round];
      if (question && quiz.length < QUIZ_LENGTH) quiz.push(question);
    }
  }
  return quiz;
}
