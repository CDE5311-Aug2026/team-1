import wifiIcon from '../../assets/icon-wifi.svg';
import styles from './StatusBar.module.css';

export default function StatusBar() {
  return (
    <div className={styles.statusBar} aria-hidden="true">
      <span className={styles.time}>9:00</span>
      <span className={styles.island} />
      <div className={styles.indicators}>
        <span className={styles.signalBars}>
          <span />
          <span />
          <span />
          <span />
        </span>
        <img src={wifiIcon} alt="" width={16} height={16} />
        <span className={styles.battery}>
          <span className={styles.batteryOutline} />
          <span className={styles.batteryFill} />
          <span className={styles.batteryCap} />
        </span>
      </div>
    </div>
  );
}
