import { ActionStatus, PlanTask } from './agent';

export enum EventType {
  UserMessage = 'user-message',
  LoadingStatus = 'loading-status',
  ToolUsed = 'tool-used',
  ToolCallStart = 'tool-call-start',
  PlanUpdate = 'plan-update',
  AgentStatus = 'agent-status',
  ChatText = 'chat-text',
  Observation = 'observation',
  NewPlanStep = 'new-plan-step',
  UserInterruption = 'user-interruption',
  End = 'end',
}

export interface EventContentDescriptor {
  [EventType.ChatText]: {
    text: string;
    attachments: { path: string }[];
  };
  [EventType.LoadingStatus]: {
    title: string;
    description?: string;
  };
  [EventType.PlanUpdate]: {
    plan?: PlanTask[];
    step?: number;
  };
  [EventType.ToolUsed]: {
    actionId: string;
    tool: string;
    params: string;
    status: ActionStatus;
    description: string;
    // Key param value in the tool params, such as the filepath or the command
    value: string;
    result: any;
    // For displaying file content diff
    original?: string;
  };
  [EventType.ToolCallStart]: {
    tool: string;
    params: string;
    description: string;
    // The same as above
    value: string;
  };
  [EventType.AgentStatus]: string;
  [EventType.NewPlanStep]: {
    step: number;
  };
  // When tools return the result, it will be displayed as an observation
  [EventType.Observation]: any;
  [EventType.UserInterruption]: {
    text: string;
  };
  [EventType.End]: {
    message: string;
  };
  [EventType.UserMessage]: string;
}

export interface EventItem {
  id: string;
  content: EventContentDescriptor[keyof EventContentDescriptor];
  type: EventType;
  timestamp: number;
}
