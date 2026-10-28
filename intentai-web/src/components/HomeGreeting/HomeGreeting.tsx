import styles from './HomeGreeting.module.css';

interface HomeGreetingProps {
  /** Date line as written, e.g. "Sat 7 Nov"; uppercased by CSS. */
  date: string;
  name: string;
}

export default function HomeGreeting({ date, name }: HomeGreetingProps) {
  return (
    <div className={styles.block}>
      <p className={styles.date}>{date}</p>
      <h1 className={styles.title}>
        {name ? (
          <>
            Good morning, <span className={styles.name}>{name}</span>
          </>
        ) : (
          'Good morning'
        )}
      </h1>
    </div>
  );
}
