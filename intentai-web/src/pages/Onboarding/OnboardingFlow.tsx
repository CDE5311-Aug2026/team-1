import AppShell from '../../components/AppShell/AppShell';

/** Placeholder route target; the step flow replaces it. Renders no controls. */
export default function OnboardingFlow() {
  return (
    <AppShell chrome="none" background="var(--surface)">
      <h1>Onboarding</h1>
    </AppShell>
  );
}
