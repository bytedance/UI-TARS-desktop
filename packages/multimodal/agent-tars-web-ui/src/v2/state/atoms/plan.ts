import { atom } from 'jotai';
import { PlanStep } from '@multimodal/agent-interface';

/**
 * Plan state interface for storing plan data by session
 */
export interface PlanState {
  steps: PlanStep[];
  isComplete: boolean;
  summary: string | null;
  hasGeneratedPlan: boolean;
}

/**
 * Default empty plan state
 */
const DEFAULT_PLAN_STATE: PlanState = {
  steps: [],
  isComplete: false,
  summary: null,
  hasGeneratedPlan: false,
};

/**
 * Atom for storing plans for each session
 */
export const plansAtom = atom<Record<string, PlanState>>({});

/**
 * Atom for UI state related to plan display
 */
export const planUIStateAtom = atom<{
  isVisible: boolean;
}>({
  isVisible: false,
});
