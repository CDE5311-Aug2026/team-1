import { motion, useReducedMotionConfig } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import arrowRight from '../../../assets/v3/moments/arrow-right-white.svg';
import checkWhite from '../../../assets/v3/moments/check-white.svg';
import ClickSpark from '../../../components/reactbits/ClickSpark';
import { usePersistentStore } from '../../../data/persistentStore';
import { imageOf, snapTray, subjectOfCardId, topicOfCard, TOPIC_LABELS, type Stamp as StampData } from '../../../data/moments/moments';
import { markCardOpened } from '../../../data/openedCards';
import { openedCardsStore } from '../../../data/stores';
import type { Card } from '../../AskPage/cards';
import { paths } from '../../../routes';
import { CardDots } from '../Passport/Passport';
import { stampDate } from '../parts';
import Sheet from '../Sheet/Sheet';
import Stamp from '../Stamp/Stamp';
import styles from './SnapSheet.module.css';

/**
 * M3 Snap, without recognition (none exists): the user picks one of the app's own card photos. That photo belongs to
 * its card, so "found" is true; the card is marked opened and its place's stamp gains ink. No match percentage.
 */
export default function SnapSheet({ stamps, onClose }: { stamps: readonly StampData[]; onClose: () => void }) {
  const [opened] = usePersistentStore(openedCardsStore);
  const [picked, setPicked] = useState<{ card: Card; wasNew: boolean } | null>(null);
  const reduce = useReducedMotionConfig();
  const tray = snapTray();

  const pick = (card: Card) => {
    const wasNew = !opened.includes(card.article.id);
    markCardOpened(card.article.id);
    setPicked({ card, wasNew });
  };

  if (!picked) {
    return (
      <Sheet title="Snap a moment" onClose={onClose}>
        <p className={styles.intro}>Photo recognition isn’t here yet. Pick one of the app’s card photos instead: its card opens and its place’s stamp gains ink.</p>
        <ClickSpark sparkColor={['#e3661f', '#f4b389', '#a3400a']} sparkCount={10} sparkRadius={24} sparkSize={8}>
          <ul className={styles.tray} aria-label="Card photos">
            {tray.map((card) => {
              const image = imageOf(card.article.id)!;
              const isOpen = opened.includes(card.article.id);
              return (
                <li key={card.article.id}>
                  <button type="button" className={styles.thumb} onClick={() => pick(card)} aria-label={`${card.article.title}${isOpen ? ', opened' : ''}`}>
                    <img src={image.src} alt="" />
                    <span className={styles.thumbName}>{card.article.title}</span>
                    {isOpen && (
                      <span className={styles.thumbCheck}>
                        <img src={checkWhite} alt="" width={9} height={9} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </ClickSpark>
      </Sheet>
    );
  }

  const { card, wasNew } = picked;
  const image = imageOf(card.article.id);
  const topic = topicOfCard(card);
  const subject = subjectOfCardId(card.article.id);
  const stamp = subject ? stamps.find((s) => s.subject.id === subject.id) : undefined;
  const meta = [subject?.short, topic ? TOPIC_LABELS[topic] : undefined].filter(Boolean).join(' · ');

  return (
    <Sheet title={card.article.title} hideTitle onClose={onClose}>
      {image && (
        <figure className={styles.figure}>
          <motion.img
            src={image.src}
            alt={image.alt}
            className={styles.photo}
            initial={reduce ? false : { scale: 1.08, filter: 'brightness(2)' }}
            animate={{ scale: 1, filter: 'brightness(1)' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <figcaption>
            <a href={image.url} target="_blank" rel="noreferrer">
              {image.credit}
            </a>
          </figcaption>
        </figure>
      )}
      <p className={styles.found}>
        <span>
          <img src={checkWhite} alt="" width={9} height={9} />
        </span>
        CARD FOUND
      </p>
      <p className={styles.title}>{card.article.title}</p>
      {meta && <p className={styles.meta}>{meta}</p>}
      <p className={styles.note}>This is the photo from its card, so it’s an exact match.</p>

      {stamp && (
        <div className={styles.panel}>
          {stamp.collected ? (
            <span className={styles.mini}>
              <Stamp shape="round" name={stamp.subject.short} date={stampDate(stamp.checkedInOn)} ink={stamp.ink} />
            </span>
          ) : null}
          <div className={styles.panelText}>
            <p className={styles.panelName}>{stamp.subject.short.toUpperCase()}</p>
            <p className={styles.panelCount}>
              {stamp.openedIds.length} of {stamp.subject.cards.length} cards
            </p>
            <CardDots stamp={stamp} />
            <p className={styles.panelLine}>
              {!stamp.collected
                ? `Check in at a place in ${stamp.subject.short} in Nearby to collect its stamp.`
                : wasNew
                  ? '+1 card · ink added to your stamp'
                  : 'Already opened · your stamp keeps its ink'}
            </p>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setPicked(null)}>
          Pick another
        </button>
        <Link to={paths.card(card.article.id)} className={styles.primary}>
          Open card
          <img src={arrowRight} alt="" width={16} height={16} />
        </Link>
      </div>
    </Sheet>
  );
}
