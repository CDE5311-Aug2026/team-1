import { useRef, type ReactNode } from 'react';
import type { OnbField, Onboarding } from '../../../data/domain';
import { FIELD_LABEL } from '../options';
import motion from '../Onboarding.module.css';
import { FIELD_NAME, PASSPORT_FIELDS, mrzLine, passportValue } from './passport';
import styles from './PassportCard.module.css';
import { useFitText } from './useFitText';

interface PassportCardProps {
  data: Onboarding;
  /** The field the current step asks for: orange underline, and a caret while empty. */
  active: OnbField | null;
  /** Eye toggle on a filled field. */
  onToggleHidden: (field: OnbField) => void;
  /** Drawn over the photo (the done screen's stamp). */
  stamp?: ReactNode;
}

const EYE_OPEN = (
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const EYE_CLOSED = <path d="M3 10c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5M6.5 13.5 5 16M12 14.5V17M17.5 13.5 19 16" />;

/** The value line: its text shrinks (down to a floor) rather than ellipsising. */
function FitText({ text, children }: { text: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useFitText(ref, text);
  return (
    <span ref={ref} className={styles.valueText}>
      {children}
    </span>
  );
}

/** The ID page that fills in as the user answers: six fields, eye toggles, MRZ line, optional stamp. */
export default function PassportCard({ data, active, onToggleHidden, stamp }: PassportCardProps) {
  return (
    <section aria-label="Your passport" className={styles.card}>
      <span aria-hidden="true" className={styles.texture} />
      <div className={styles.row}>
        <span aria-hidden="true" className={styles.photo}>
          <span className={styles.avatar}>W</span>
        </span>
        <dl className={styles.fields}>
          {PASSPORT_FIELDS.map((field) => {
            const value = passportValue(data, field);
            const has = value !== '';
            const hidden = data.hidden.includes(field);
            const isActive = active === field;
            const name = FIELD_NAME[field];
            const lineClass = isActive ? styles.fieldActive : has ? styles.fieldFilled : '';
            return (
              <div key={field} className={`${styles.field} ${lineClass}`} data-field={field}>
                <dt className={styles.label}>{FIELD_LABEL[field]}</dt>
                <dd className={styles.value}>
                  <FitText text={has && !hidden ? value : ''}>
                    {has && !hidden && (
                      <span key={value} className={motion.aVal}>
                        {value}
                      </span>
                    )}
                    {has && hidden && (
                      <>
                        <span aria-hidden="true" className={`${styles.masked} ${motion.aVal}`}>
                          ••••••
                        </span>
                        <span className={styles.srOnly}>Hidden</span>
                      </>
                    )}
                    {!has && (
                      <>
                        <span aria-hidden="true" className={styles.empty}>
                          ····
                        </span>
                        {isActive && <span aria-hidden="true" className={motion.caret} data-caret="" />}
                        <span className={styles.srOnly}>Not set</span>
                      </>
                    )}
                  </FitText>
                  {has && (
                    <button
                      type="button"
                      className={`${styles.eye} ${hidden ? styles.eyeHidden : ''} ${motion.press}`}
                      aria-pressed={hidden}
                      aria-label={`${hidden ? 'Show' : 'Hide'} ${name.toLowerCase()}`}
                      onClick={() => onToggleHidden(field)}
                    >
                      <svg
                        key={String(hidden)}
                        className={motion.aPop}
                        aria-hidden="true"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {hidden ? EYE_CLOSED : EYE_OPEN}
                      </svg>
                    </button>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <p aria-hidden="true" className={styles.mrz} data-testid="passport-mrz">
        {mrzLine(data)}
      </p>
      {stamp !== undefined && (
        <span aria-hidden="true" className={styles.stamp} data-testid="passport-stamp">
          {stamp}
        </span>
      )}
    </section>
  );
}
