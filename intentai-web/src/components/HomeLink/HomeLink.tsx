import { Link } from 'react-router-dom';
import mascotLogo from '../../assets/mascot-logo.png';
import { paths } from '../../routes';
import styles from './HomeLink.module.css';

interface HomeLinkProps {
  /** The page's own size and offset for the 58px mascot. */
  className: string;
  nodeId?: string;
  onClick?: () => void;
  /** Logo image; defaults to the mascot. */
  src?: string;
}

/** The header mascot on every tab: takes the user back to Today. */
export default function HomeLink({ className, nodeId, onClick, src = mascotLogo }: HomeLinkProps) {
  return (
    <Link
      to={paths.today}
      className={`${styles.link} ${className}`}
      aria-label="Home"
      data-allow-bleed=""
      data-node-id={nodeId}
      onClick={onClick}
    >
      <img src={src} alt="" className={styles.image} />
    </Link>
  );
}
