import aiLogo from '../../assets/onboarding/ai-logo.svg';
import styles from './AiHint.module.css';

interface AiHintProps {
  children: string;
  nodeId: string;
}

/** IntentAI speech bubble (Figma "AI hint"); a live region, because its text follows the user's choices. */
export default function AiHint({ children, nodeId }: AiHintProps) {
  return (
    <div className={styles.hint} data-node-id={nodeId}>
      <img src={aiLogo} alt="" width={28} height={28} />
      <p className={styles.bubble} aria-live="polite">
        <span className={styles.name}>IntentAI</span>
        <span className={styles.text}>{children}</span>
      </p>
    </div>
  );
}
