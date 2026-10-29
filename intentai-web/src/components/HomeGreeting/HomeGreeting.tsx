import { forwardRef, type CSSProperties } from 'react';
import styles from './HomeGreeting.module.css';

interface HomeGreetingProps {
  /** Date line as written, e.g. "Sat 7 Nov"; uppercased by CSS. */
  date: string;
  name: string;
}

const delay = (s: number) => ({ animationDelay: `${s}s` }) as CSSProperties;

/** Date line and "Good morning, {name}" h1; the words blur in one after another. The h1 takes focus on arrival. */
const HomeGreeting = forwardRef<HTMLHeadingElement, HomeGreetingProps>(function HomeGreeting({ date, name }, ref) {
  return (
    <div className={styles.block}>
      <p className={`a-up ${styles.date}`} style={delay(0.05)}>
        {date}
      </p>
      <h1 ref={ref} className={styles.title} tabIndex={-1}>
        <span className="a-blur" style={delay(0.1)}>
          Good
        </span>{' '}
        <span className="a-blur" style={delay(0.22)}>
          {name ? 'morning,' : 'morning'}
        </span>
        {name && (
          <>
            {' '}
            <span className={`a-blur ${styles.name}`} style={delay(0.34)}>
              {name}
            </span>
          </>
        )}
      </h1>
    </div>
  );
});

export default HomeGreeting;
