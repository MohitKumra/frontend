import { useLocation } from 'react-router-dom';
import { CoachStudioPanelV3 } from '../components/ai/CoachStudioPanelV3';

type AIControlsLocationState = {
  coachPrompt?: string;
  autoSend?: boolean;
} | null;

export function AIControlsPage() {
  const location = useLocation();
  const routeState = (location.state as AIControlsLocationState) ?? null;
  const initialPrompt = routeState?.coachPrompt ?? '';
  const autoSend = routeState?.autoSend ?? false;

  return (
    // Negative margin to undo the page-level padding from AppLayout so the
    // chat can fill the full viewport height below the topbar.
    <div className="-mt-3 -mx-3 sm:-mt-4 sm:-mx-4 h-[calc(100vh-var(--topbar-height))]">
      <CoachStudioPanelV3 initialPrompt={initialPrompt} autoSend={autoSend} />
    </div>
  );
}
