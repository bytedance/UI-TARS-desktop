import { EventHandler, EventHandlerContext } from '../types';
import { AgentEventStream } from '@/common/types';
import { plansAtom, PlanKeyframe, DEFAULT_PLAN_STATE } from '@/common/state/atoms/plan';

export class PlanStartHandler implements EventHandler<AgentEventStream.PlanStartEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.PlanStartEvent {
    return event.type === 'plan_start';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.PlanStartEvent,
  ): void {
    const { set } = context;

    set(plansAtom, (prev) => ({
      ...prev,
      [sessionId]: DEFAULT_PLAN_STATE,
    }));
  }
}

export class PlanUpdateHandler implements EventHandler<AgentEventStream.PlanUpdateEvent> {
  canHandle(event: AgentEventStream.Event): event is AgentEventStream.PlanUpdateEvent {
    return event.type === 'plan_update';
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.PlanUpdateEvent,
  ): void {
    const { set } = context;

    console.log('Plan update event:', event);
    set(plansAtom, (prev) => {
      const currentPlan = prev[sessionId] || {
        steps: [],
        isComplete: false,
        summary: null,
        hasGeneratedPlan: true,
        keyframes: [],
      };

      // Create keyframe snapshot for plan history tracking
      const newKeyframe: PlanKeyframe = {
        timestamp: event.timestamp || Date.now(),
        steps: event.steps,
        isComplete: false,
        summary: null,
      };

      const keyframes = Array.isArray(currentPlan.keyframes)
        ? [...currentPlan.keyframes, newKeyframe]
        : [newKeyframe];

      return {
        ...prev,
        [sessionId]: {
          ...currentPlan,
          steps: event.steps,
          hasGeneratedPlan: true,
          keyframes,
        },
      };
    });
  }
}

export class PlanFinishHandler
  implements EventHandler<AgentEventStream.Event & { sessionId: string; summary: string }>
{
  canHandle(
    event: AgentEventStream.Event,
  ): event is AgentEventStream.Event & { sessionId: string; summary: string } {
    return event.type === 'plan_finish' && 'summary' in event;
  }

  handle(
    context: EventHandlerContext,
    sessionId: string,
    event: AgentEventStream.Event & { sessionId: string; summary: string },
  ): void {
    const { set } = context;

    console.log('Plan finish event:', event);
    set(plansAtom, (prev) => {
      const currentPlan = prev[sessionId] || {
        steps: [],
        isComplete: false,
        summary: null,
        hasGeneratedPlan: true,
        keyframes: [],
      };

      // Create final keyframe for completed plan
      const finalKeyframe: PlanKeyframe = {
        timestamp: event.timestamp || Date.now(),
        steps: Array.isArray(currentPlan.steps) ? currentPlan.steps : [],
        isComplete: true,
        summary: event.summary,
      };

      const keyframes = Array.isArray(currentPlan.keyframes)
        ? [...currentPlan.keyframes, finalKeyframe]
        : [finalKeyframe];

      return {
        ...prev,
        [sessionId]: {
          ...currentPlan,
          isComplete: true,
          summary: event.summary,
          keyframes,
        },
      };
    });
  }
}
