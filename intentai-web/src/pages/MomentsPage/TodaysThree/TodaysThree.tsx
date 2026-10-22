import { useId, useState } from 'react';
import ContextChip from '../../../components/ContextChip/ContextChip';
import Icon from '../../../components/Icon/Icon';
import PlayAudioButton from '../../../components/PlayAudioButton/PlayAudioButton';
import type { Expression } from '../../../types';
import { useSpan } from '../../../usage/useSpan';
import styles from './TodaysThree.module.css';

/** v2: today's three phrases as one row of tiles; a tapped tile opens its full card under the row. */
interface TodaysThreeProps {
  expressions: Expression[];
  /** Phrase ids already collected (passport): their tiles carry a "got it" stamp. */
  collected?: readonly string[];
  /** Called when a card is opened, so the page can collect the phrase. */
  onOpen?: (id: string) => void;
}

export default function TodaysThree({ expressions, collected = [], onOpen }: TodaysThreeProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  useSpan('activity', "Moments › today's three card", openId !== null);
  const baseId = useId();
  const open = expressions.find((expression) => expression.id === openId);
  const detailId = `${baseId}-detail`;
  const titleId = `${baseId}-title`;

  return (
    <section className={styles.today} aria-labelledby={`${baseId}-heading`}>
      <h2 id={`${baseId}-heading`} className={styles.heading}>
        Today&apos;s three
      </h2>
      <div className={styles.row}>
        {expressions.map((expression) => {
          const isOpen = expression.id === openId;
          return (
            <button
              key={expression.id}
              type="button"
              className={isOpen ? `${styles.tile} ${styles.tileOpen}` : styles.tile}
              aria-expanded={isOpen}
              aria-controls={isOpen ? detailId : undefined}
              onClick={() => {
                setOpenId(isOpen ? null : expression.id);
                if (!isOpen) onOpen?.(expression.id);
              }}
            >
              <span className={styles.number}>{expression.number}</span>
              <span className={styles.icon}>
                <Icon name={expression.icon} size={20} />
              </span>
              <span className={styles.word}>{expression.title}</span>
              <span className={styles.meaning}>{expression.description}</span>
              {/* Visible cue that the tile opens; the button's state is already in aria-expanded. */}
              <span className={styles.cue} aria-hidden="true">
                {isOpen ? 'Close' : 'Open'}
                <svg width="10" height="10" viewBox="0 0 10 10" className={isOpen ? styles.cueUp : undefined}>
                  <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {collected.includes(expression.id) && <span className={styles.stamp}>got it</span>}
            </button>
          );
        })}
      </div>

      {open && (
        <section id={detailId} className={styles.detail} aria-labelledby={titleId}>
          {open.photo ? (
            <img className={styles.photo} src={open.photo} alt="" />
          ) : (
            <span className={`${styles.photo} ${styles.placeholder}`}>
              <Icon name={open.icon} size={40} />
            </span>
          )}
          <div className={styles.topRow}>
            <ContextChip icon={open.context.icon} label={open.context.label} />
            <PlayAudioButton text={open.title} />
          </div>
          <div className={styles.titleRow}>
            <h3 id={titleId} className={styles.title}>
              {open.title}
            </h3>
            {open.phonetic && <span className={styles.phonetic}>{open.phonetic}</span>}
          </div>
          <p className={styles.description}>{open.description}</p>
          {open.example && <p className={styles.example}>{open.example}</p>}
        </section>
      )}
    </section>
  );
}
