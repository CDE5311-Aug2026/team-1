import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AppShell from '../../components/AppShell/AppShell';
import { ONB_FIELDS, type OnbField, type Onboarding } from '../../data/domain';
import { usePersistentStore } from '../../data/persistentStore';
import { onboardingStore } from '../../data/stores';
import { showToast } from '../../hooks/useToast';
import { paths } from '../../routes';
import { applyPatch, finishOnboarding, resumeStep } from './flow';
import OnboardingCta, { CtaBar } from './OnboardingCta/OnboardingCta';
import motion from './Onboarding.module.css';
import styles from './OnboardingFlow.module.css';
import PassportCard from './PassportCard/PassportCard';
import { FIELD_NAME } from './PassportCard/passport';
import { QUESTION_COUNT, STEPS } from './steps';
import type { StepProps } from './steps/types';

const toast = (msg: string) => {
  showToast(msg);
};

const update = (patch: Partial<Onboarding>) => onboardingStore.set((previous) => applyPatch(previous, patch));

const BackIcon = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/** The onboarding steps on one route: welcome, six questions filling a passport, then the stamp. */
export default function OnboardingFlow() {
  const [data] = usePersistentStore(onboardingStore);
  // Decided once: someone already onboarded who opens /onboarding goes Home. Finishing here stays on the stamp.
  const [doneAtMount] = useState(() => onboardingStore.get().done);
  const [step, setStep] = useState(() => resumeStep(STEPS, onboardingStore.get()));
  const [dir, setDir] = useState<1 | -1>(1);
  const stepRef = useRef(step);
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  // The step whose heading last had focus moved to it (the first one never does).
  const focusedStep = useRef(step);

  useEffect(() => {
    stepRef.current = step;
    scrollRef.current?.scrollTo?.({ top: 0 });
    // After a step change (not on first open), focus moves to the new step's heading so keyboard and
    // screen reader users land on the new content. Steps never manage this themselves.
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    const heading = columnRef.current?.querySelector<HTMLElement>('h1');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }, [step]);

  const go = useCallback((to: number, direction: 1 | -1) => {
    stepRef.current = to;
    setDir(direction);
    setStep(to);
  }, []);

  // Reads the step at call time: welcome calls it after its cover animation.
  const next = useCallback(() => {
    const current = stepRef.current;
    const def = STEPS[current];
    if (!def.answered(onboardingStore.get())) {
      toast(def.blockedToast);
      return;
    }
    if (def.id === 'topics' && !finishOnboarding()) {
      // An answer vanished (e.g. the store was reset in another tab): back to the first open question.
      go(resumeStep(STEPS, onboardingStore.get()), -1);
      toast('Pick one to continue');
      return;
    }
    if (current < STEPS.length - 1) go(current + 1, 1);
  }, [go]);

  const back = () => {
    if (step > 0) go(step - 1, -1);
  };

  const toggleHidden = (field: OnbField) => {
    const hide = !data.hidden.includes(field);
    update({ hidden: hide ? [...data.hidden, field] : data.hidden.filter((f) => f !== field) });
    toast(`${FIELD_NAME[field]} ${hide ? 'hidden' : 'shown'} on your passport`);
  };

  if (doneAtMount) return <Navigate to={paths.today} replace />;

  const def = STEPS[step];
  const props: StepProps = { data, update, toast, next };
  const { Body, Preview, Stamp, Footer } = def;
  const answered = def.answered(data);
  const position = Math.min(step, QUESTION_COUNT);
  const active = (ONB_FIELDS as readonly string[]).includes(def.id) ? (def.id as OnbField) : null;

  return (
    <AppShell chrome="none" layout="fill" background="#eceae5">
      <div className={`${styles.screen} ${motion.root}`}>
        <div className={styles.column} ref={columnRef}>
          {def.shell === 'none' ? (
            <Body {...props} />
          ) : (
            <>
              <div className={styles.topBar}>
                <button type="button" className={`${styles.back} ${motion.press}`} aria-label="Back" onClick={back}>
                  {BackIcon}
                </button>
                <div
                  className={styles.segments}
                  role="progressbar"
                  aria-label="Onboarding progress"
                  aria-valuemin={0}
                  aria-valuemax={QUESTION_COUNT}
                  aria-valuenow={position}
                  aria-valuetext={def.shell === 'done' ? 'All questions answered' : `Question ${position} of ${QUESTION_COUNT}`}
                >
                  {Array.from({ length: QUESTION_COUNT }, (_, i) => {
                    const fill = step - 1 > i ? 100 : step - 1 === i ? (answered ? 100 : 35) : 0;
                    return (
                      <span key={i} className={styles.segment}>
                        <span className={styles.segmentFill} style={{ width: `${fill}%` }} data-fill={fill} />
                      </span>
                    );
                  })}
                </div>
                <span className={styles.count} aria-hidden="true">
                  {position}/{QUESTION_COUNT}
                </span>
              </div>
              <div className={styles.passport}>
                <PassportCard
                  data={data}
                  active={active}
                  onToggleHidden={toggleHidden}
                  stamp={Stamp ? <Stamp {...props} /> : undefined}
                />
              </div>
              <div className={styles.scroll} ref={scrollRef}>
                <div
                  key={step}
                  data-step={def.id}
                  data-dir={dir > 0 ? 'fwd' : 'back'}
                  className={`${styles.stepBody} ${dir > 0 ? motion.slideFwd : motion.slideBack} ${def.shell === 'done' ? styles.doneBody : ''}`}
                >
                  <Body {...props} />
                  {def.shell === 'question' && Preview && (
                    <section className={`${styles.preview} ${motion.aUp}`} aria-live="polite" aria-label="Preview" style={{ animationDelay: '0.25s' }}>
                      <Preview {...props} />
                    </section>
                  )}
                </div>
              </div>
              {def.shell === 'question' ? (
                <CtaBar>
                  <OnboardingCta label={def.ctaLabel ?? 'Continue'} enabled={answered} onClick={next} />
                </CtaBar>
              ) : (
                Footer && (
                  <CtaBar>
                    <Footer {...props} />
                  </CtaBar>
                )
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
