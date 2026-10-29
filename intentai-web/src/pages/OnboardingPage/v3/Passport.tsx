// The passport-style header of Onboarding (Figma O2–O8): six fields fill in as the questions are answered, each answered
// field has an eye (closed = private), and the machine-readable line at the bottom spells the role.
import { motion, useReducedMotionConfig } from 'motion/react';
import { areaShortName } from '../../../data/profile/finds';
import { FIELDS, FIELD_LABELS, fieldValue, mrzLine, sealDate, type FieldKey, type ProfileV3 } from '../../../data/profile/profile';
import Icon from './icons';
import styles from './v3.module.css';

interface PassportProps {
  profile: ProfileV3;
  initial: string;
  /** The field the current question fills (orange label and a caret). */
  active?: FieldKey;
  onToggleHidden?: (field: FieldKey) => void;
  /** Show the WELCOME seal (O8). */
  stamped?: string;
}

export function EyeButton({ field, hidden, onToggle, dark = true }: { field: FieldKey; hidden: boolean; onToggle: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      className={hidden && dark ? `${styles.eye} ${styles.eyeClosed}` : styles.eye}
      aria-pressed={hidden}
      aria-label={`Keep ${FIELD_LABELS[field]} private`}
      onClick={onToggle}
    >
      <Icon name={hidden ? 'eyeClosed' : 'eye'} size={16} />
    </button>
  );
}

export function Seal({ date }: { date: string }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div
      className={styles.seal}
      // The WELCOME seal lands from large (a stamp being pressed); for a moment it reaches past the side gutter.
      data-allow-bleed
      aria-label={`Stamped WELCOME, ${sealDate(date)}`}
      role="img"
      initial={reduce ? false : { scale: 2.4, opacity: 0, rotate: -40 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 16, delay: 0.25 }}
    >
      <span className={styles.sealWord}>WELCOME</span>
      <Icon name="star" size={12} className={styles.sealStar} />
      <span className={styles.sealDate}>{sealDate(date)}</span>
    </motion.div>
  );
}

export default function Passport({ profile, initial, active, onToggleHidden, stamped }: PassportProps) {
  const reduce = useReducedMotionConfig();
  return (
    <section className={styles.passport} aria-label="Your passport">
      <div className={styles.photo} aria-hidden="true">
        <span className={styles.initial}>{initial}</span>
      </div>
      {stamped && <Seal date={stamped} />}
      <dl className={styles.fields}>
        {FIELDS.map((field) => {
          const value = fieldValue(profile, field, areaShortName);
          const hidden = profile.hidden.includes(field);
          const isActive = active === field;
          return (
            <div key={field} className={styles.field}>
              <dt className={isActive ? `${styles.fieldLabel} ${styles.fieldActive}` : styles.fieldLabel}>{FIELD_LABELS[field]}</dt>
              <dd className={styles.fieldValue}>
                <motion.span
                    key={value === null ? 'empty' : hidden ? 'hidden' : value}
                    className={value === null ? styles.dots : hidden ? styles.masked : styles.valueText}
                    initial={reduce ? false : { opacity: 0, y: 6, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: reduce ? 0 : 0.28 }}
                  >
                    {value === null ? (
                      <>
                        <span aria-hidden="true">····</span>
                        <span className={styles.srOnly}>Not set</span>
                      </>
                    ) : hidden ? (
                      <>
                        <span aria-hidden="true">••••••</span>
                        <span className={styles.srOnly}>Private</span>
                      </>
                    ) : (
                      value
                    )}
                  </motion.span>
                {isActive && value === null && <span className={styles.caret} aria-hidden="true" />}
                {value !== null && onToggleHidden && (
                  <EyeButton field={field} hidden={hidden} onToggle={() => onToggleHidden(field)} />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={styles.mrz} aria-hidden="true">
        {mrzLine(initial, profile)}
      </p>
    </section>
  );
}
