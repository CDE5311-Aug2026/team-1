import motion from '../Onboarding.module.css';
import styles from './QuestionHeader.module.css';

export interface QuestionHelper {
  icon: 'info' | 'eye';
  text: string;
}

const ICONS = {
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  eye: <path d="M3 10c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5M6.5 13.5 5 16M12 14.5V17M17.5 13.5 19 16" />,
};

/** Question title plus helper lines (info or closed-eye icon), each entering with a short stagger. `hidden` renders nothing. */
export default function QuestionHeader({
  title,
  helpers = [],
  hidden = false,
}: {
  title: string;
  helpers?: readonly QuestionHelper[];
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <>
      <h1 className={`${styles.title} ${motion.aUp}`}>{title}</h1>
      {helpers.map((h, i) => (
        <p
          key={h.text}
          className={`${styles.helper} ${i > 0 ? styles.helperNext : ''} ${motion.aUp}`}
          style={{ animationDelay: i === 0 ? '0.05s' : '0.08s' }}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E4671F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[h.icon]}
          </svg>
          {h.text}
        </p>
      ))}
    </>
  );
}
