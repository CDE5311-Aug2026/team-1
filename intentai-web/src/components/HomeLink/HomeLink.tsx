import { Link } from 'react-router-dom';
import mascotLogo from '../../assets/mascot-logo.png';
import { paths } from '../../routes';
import styles from './HomeLink.module.css';

interface HomeLinkProps {
  /** The page's own size and offset for the 58px mascot. */
  className: string;
  nodeId?: string;
  onClick?: () => void;
}

/** The header mascot on every tab: takes the user back to Today. */
export default function HomeLink({ className, nodeId, onClick }: HomeLinkProps) {
  return (
    <Link
      to={paths.today}
      className={`${styles.link} ${className}`}
      aria-label="Home"
      data-allow-bleed=""
      data-node-id={nodeId}
      onClick={onClick}
    >
      <img src={mascotLogo} alt="" className={styles.image} />
    </Link>
  );
}
