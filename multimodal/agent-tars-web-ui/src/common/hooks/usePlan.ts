import { useAtom } from 'jotai';
import { plansAtom, planUIStateAtom } from '../state/atoms/plan';
import { useEffect } from 'react';

/**
 * Hook for plan management functionality
 *
 * Provides:
 * - Access to plan data for the active session
 * - UI state for plan display
 * - Toggle functions for plan visibility
 */
export function usePlan(sessionId: string | null) {
  const [plans, setPlans] = useAtom(plansAtom);
  const [planUIState, setPlanUIState] = useAtom(planUIStateAtom);

  // Get plan for current session
  const currentPlan = sessionId ? plans[sessionId] : undefined;

  // Add debug logging to trace plan state
  useEffect(() => {
    if (sessionId) {
      console.log(`[usePlan] Plan state for session ${sessionId}:`, currentPlan);
    }
  }, [sessionId, currentPlan]);

  // Toggle plan visibility
  const togglePlanVisibility = () => {
    setPlanUIState((prev) => ({
      ...prev,
      isVisible: !prev.isVisible,
    }));
  };

  // Show plan automatically when first created
  const showPlanAutomatically = () => {
    setPlanUIState((prev) => ({
      ...prev,
      isVisible: true,
    }));
  };

  return {
    currentPlan,
    isPlanVisible: planUIState.isVisible,
    togglePlanVisibility,
    showPlanAutomatically,
  };
}
