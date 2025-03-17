import { PlanTask, PlanTaskStatus } from '@renderer/type/agent';
import { EventItem, EventType } from '@renderer/type/event';

export enum UIGroupType {
  ChatText = 'chat-text',
  PlanStep = 'plan-step',
  Loading = 'loading',
  End = 'end',
}

export interface UIGroup {
  type: UIGroupType;
  step: number;
  events: EventItem[];
}

export interface EventStreamUIMeta {
  planTasks: PlanTask[];
  agentStatus: string;
  currentStepIndex: number;
  currentEvent: EventItem;
  eventGroups: UIGroup[];
  isLoading: boolean;
}

/**
 * Extracts UI metadata from events stream
 */
export function extractEventStreamUIMeta(
  events: EventItem[],
): EventStreamUIMeta {
  // Get latest plan tasks
  const lastPlanUpdate = [...events]
    .reverse()
    .find((event) => event.type === EventType.PlanUpdate && event.content.plan);
  const planTasks = lastPlanUpdate
    ? (lastPlanUpdate.content as { plan: PlanTask[] }).plan
    : [];

  // Get latest agent status
  const lastAgentStatus = [...events]
    .reverse()
    .find((event) => event.type === EventType.AgentStatus);
  const agentStatus = lastAgentStatus
    ? (lastAgentStatus.content as string)
    : '';

  // Get current step
  const lastStepEvent = [...events]
    .reverse()
    .find((event) => event.type === EventType.NewPlanStep);
  const currentStepIndex = lastStepEvent
    ? (lastStepEvent.content as { step: number }).step
    : 1;

  // Get latest non-loading event
  const lastEvent = events[events.length - 1];
  const isLoading = lastEvent?.type === EventType.LoadingStatus;
  const eventGroups = groupEventsByStep(events);
  return {
    planTasks,
    agentStatus,
    currentStepIndex,
    currentEvent: lastEvent,
    isLoading,
    eventGroups,
  };
}

/**
 * Groups events by their type (ChatText vs PlanStep)
 */
export function groupEventsByStep(events: EventItem[]): UIGroup[] {
  const groups: UIGroup[] = [];
  let currentStepEvents: EventItem[] = [];
  let hasPlan = false;
  const NO_RENDER_TYPE = [
    EventType.PlanUpdate,
    EventType.Observation,
    EventType.ToolCallStart,
  ];
  let currentStep = 1;

  const filterLoading = (pendingEvents: EventItem[]) => {
    let clonedEvents = [...pendingEvents];
    let lastEvent = clonedEvents[clonedEvents.length - 1];
    const tailingNoRenderEvents: EventItem[] = [];
    if (lastEvent && NO_RENDER_TYPE.includes(lastEvent.type)) {
      clonedEvents = clonedEvents.slice(0, -1);
      tailingNoRenderEvents.unshift(lastEvent);
      lastEvent = clonedEvents[clonedEvents.length - 1];
    }
    return [
      ...clonedEvents.filter((item, index) => {
        if (
          index < clonedEvents.length - 1 &&
          item.type === EventType.LoadingStatus
        ) {
          return false;
        }
        return true;
      }),
      ...tailingNoRenderEvents,
    ];
  };
  console.log('filtered events', filterLoading(events));

  filterLoading(events).forEach((event) => {
    if (event.type === EventType.PlanUpdate) {
      hasPlan = true;
      const allDone = event.content.plan.every(
        (task) => task.status === PlanTaskStatus.Done,
      );
      if (allDone) {
        // No need to render new plan step
        return;
      }
      currentStep = (event.content as { step: number | undefined }).step || 1;

      if (currentStepEvents.length > 0) {
        const lastGroup = groups[groups.length - 1];
        if (
          lastGroup &&
          lastGroup.type === UIGroupType.PlanStep &&
          lastGroup.step <= currentStep
        ) {
          lastGroup.events.push(...currentStepEvents);
          if (lastGroup.step < currentStep) {
            groups.push({
              type: UIGroupType.PlanStep,
              step: currentStep,
              events: [],
            });
          }
        } else {
          groups.push({
            type: UIGroupType.PlanStep,
            step: currentStep,
            events: [...currentStepEvents],
          });
        }
        currentStepEvents = [];
      } else {
        groups.push({
          type: UIGroupType.PlanStep,
          step: currentStep,
          events: [],
        });
      }
      return;
    }

    // The last event
    if (event.type === EventType.LoadingStatus) {
      if (hasPlan) {
        // loading in plan step
        currentStepEvents.push(event);
      } else {
        // Initial loading
        groups.push({
          type: UIGroupType.Loading,
          step: 1,
          events: [event],
        });
      }
      return;
    }

    if (event.type === EventType.ToolCallStart) {
      return;
    }

    if (event.type === EventType.ChatText || event.type === EventType.End) {
      if (currentStepEvents.length > 0) {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.step === currentStep) {
          lastGroup.events.push(...currentStepEvents);
          currentStepEvents = [];
        }
      }
      const groupType = (() => {
        if (event.type === EventType.End) {
          return UIGroupType.End;
        }
        return UIGroupType.ChatText;
      })();
      groups.push({
        type: groupType,
        step: currentStep,
        events: [event],
      });
      return;
    }

    currentStepEvents.push(event);
  });

  if (currentStepEvents.length > 0) {
    if (groups.length > 0) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup.step === currentStep) {
        if (lastGroup.type === UIGroupType.PlanStep) {
          lastGroup.events.push(...currentStepEvents);
        } else {
          groups.push({
            type: UIGroupType.PlanStep,
            step: currentStep,
            events: [...currentStepEvents],
          });
        }
        return groups;
      }
    }
    groups.push({
      type: UIGroupType.PlanStep,
      step: currentStep,
      events: [...currentStepEvents],
    });
  }

  console.log('groups', groups);

  return groups;
}
