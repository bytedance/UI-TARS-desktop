import { atom } from 'jotai';
import type { AgentEventStream } from '@tarko/agent-interface';

/**
 * Plan keyframe interface for storing plan history snapshots
 */
export interface PlanKeyframe {
  timestamp: number;
  steps: AgentEventStream.PlanStep[];
  isComplete: boolean;
  summary: string | null;
}

/**
 * Plan state interface for storing plan data by session
 */
export interface PlanState {
  steps: AgentEventStream.PlanStep[];
  isComplete: boolean;
  summary: string | null;
  hasGeneratedPlan: boolean;
  keyframes?: PlanKeyframe[]; // Added keyframes for history
}

/**
 * Default empty plan state
 */
export const DEFAULT_PLAN_STATE: PlanState = {
  steps: [],
  isComplete: false,
  summary: null,
  hasGeneratedPlan: false,
  keyframes: [],
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
