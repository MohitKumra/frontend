import { useLocation } from 'react-router-dom';
import { CoachStudioPanelV3 } from '../components/ai/CoachStudioPanelV3';
import { LockedFeatureWrapper } from '../components/billing/LockedFeatureWrapper';
import { useUserPlan } from '../features/billing/useUserPlan';

type AIControlsLocationState = {
  coachPrompt?: string;
  autoSend?: boolean;
} | null;

export function AIControlsPage() {
  const location = useLocation();
  const routeState = (location.state as AIControlsLocationState) ?? null;
  const initialPrompt = routeState?.coachPrompt ?? '';
  const autoSend = routeState?.autoSend ?? false;
  const { isFeatureLocked } = useUserPlan();
  const coachLocked = isFeatureLocked('aiCoach');

  return (
    <div className="h-[calc(100dvh-var(--topbar-height))] w-full overflow-hidden flex flex-col">
      <LockedFeatureWrapper isLocked={coachLocked} featureName="AI Coach" minPlanName="Basic" className="h-full w-full">
        <CoachStudioPanelV3 initialPrompt={initialPrompt} autoSend={autoSend} />
      </LockedFeatureWrapper>
    </div>
  );
}
