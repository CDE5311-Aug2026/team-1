import { useNavigate } from 'react-router-dom';
import chevronLeft from '../../assets/onboarding/icon-chevron-left.svg';
import styles from './StepHeader.module.css';

interface StepHeaderProps {
  step: 1 | 2 | 3;
  backTo: string;
  backNodeId: string;
}

const STEPS = 3;

export default function StepHeader({ step, backTo, backNodeId }: StepHeaderProps) {
  const navigate = useNavigate();
  return (
    <>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.back}
          aria-label="Back"
          data-node-id={backNodeId}
          onClick={() => navigate(backTo)}
        >
          <img src={chevronLeft} alt="" width={20} height={20} />
        </button>
        <div
          className={styles.segments}
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={STEPS}
          aria-valuenow={step}
        >
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i < step ? styles.done : styles.todo} />
          ))}
        </div>
      </div>
      <p className={styles.label}>
        {`STEP ${step} OF ${STEPS}`}
      </p>
    </>
  );
}
