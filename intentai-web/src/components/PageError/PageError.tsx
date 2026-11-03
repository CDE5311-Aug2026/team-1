// What a person sees when a screen breaks (user test round 1, heuristic 9: "no error messages"). Before, a screen that
// threw left a blank page with no way out. Now the screen is replaced by a note on the app's kraft paper that says in
// plain words what happened and offers two ways on: try the screen again, or go back to Home. The error is kept with
// the Help Center's feedback (sent to the team the next time Help opens), so the person does not have to report it.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { paths } from '../../routes';
import styles from './PageError.module.css';

const QUEUE = 'findsg-help-feedback';

/** A screen's code that did not arrive (offline, or a new version replaced the old files). */
export function isLoadError(error: unknown): boolean {
  const m = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|Failed to fetch/i.test(m);
}

function keep(error: unknown, where: string) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as unknown[];
    const text = `Screen error on ${where}: ${error instanceof Error ? error.message : String(error)}`.slice(0, 400);
    localStorage.setItem(QUEUE, JSON.stringify([...q, { at: Date.now(), kind: 'bug', page: where, text }].slice(-20)));
  } catch {
    // private mode: nothing kept
  }
}

export function PageErrorNote({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const load = isLoadError(error);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <main className={styles.page} role="alert">
      <span className={styles.paper} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}home/paper.webp)` }} aria-hidden="true" />
      <div className={styles.note}>
        <span className={styles.tape} aria-hidden="true" />
        <p className={styles.kicker}>{load ? 'Not loaded' : 'Something went wrong'}</p>
        <h1 className={styles.title}>{load ? 'This page did not arrive' : 'This page tore'}</h1>
        <p className={styles.body}>
          {load
            ? offline
              ? 'You are offline. Connect to the internet, then try again.'
              : 'The connection dropped while it was loading. Try again.'
            : 'Your journal, stamps and progress are safe. Try the page again, or go back to Home.'}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onRetry}>
            Try again
          </button>
          <a className={styles.secondary} href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${paths.today}`}>
            Back to Home
          </a>
        </div>
        {!load && <p className={styles.small}>We have noted the problem for the team.</p>}
      </div>
    </main>
  );
}

interface Props {
  /** A new key (another screen) clears the error. */
  resetKey: string;
  children: ReactNode;
}

export default class PageErrorBoundary extends Component<Props, { error: unknown; key: string }> {
  state = { error: null as unknown, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: unknown; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (!isLoadError(error)) keep(error, this.props.resetKey);
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error === null) return this.props.children;
    const error = this.state.error;
    // the code of a screen that did not load is fetched again by a reload; any other error, by rendering again
    const retry = () => (isLoadError(error) ? window.location.reload() : this.setState({ error: null }));
    return <PageErrorNote error={error} onRetry={retry} />;
  }
}
