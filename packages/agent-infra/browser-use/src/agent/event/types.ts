/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/event/types.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { BrowserState, PageState } from '../../browser/types';

export enum Actors {
  SYSTEM = 'system',
  USER = 'user',
  PLANNER = 'planner',
  NAVIGATOR = 'navigator',
  VALIDATOR = 'validator',
}

export enum EventType {
  /**
   * Type of events that can be subscribed to.
   *
   * For now, only execution events are supported.
   */
  EXECUTION = 'execution',
}

export enum ExecutionState {
  /**
   * States representing different phases in the execution lifecycle.
   *
   * Format: <SCOPE>.<STATUS>
   * Scopes: task, step, act
   * Statuses: start, ok, fail, cancel
   *
   * Examples:
   *     TASK_OK = "task.ok"  // Task completed successfully
   *     STEP_FAIL = "step.fail"  // Step failed
   *     ACT_START = "act.start"  // Action started
   */
  // Task level states
  TASK_START = 'task.start',
  TASK_OK = 'task.ok',
  TASK_FAIL = 'task.fail',
  TASK_PAUSE = 'task.pause',
  TASK_RESUME = 'task.resume',
  TASK_CANCEL = 'task.cancel',

  // Step level states
  STEP_START = 'step.start',
  STEP_OK = 'step.ok',
  STEP_FAIL = 'step.fail',
  STEP_CANCEL = 'step.cancel',

  // Action/Tool level states
  ACT_START = 'act.start',
  ACT_OK = 'act.ok',
  ACT_FAIL = 'act.fail',
}

export interface EventData {
  /** Data associated with an event */
  taskId: string;
  /** step is the step number of the task where the event occurred */
  step: number;
  /** max_steps is the maximum number of steps in the task */
  maxSteps: number;
  /** details is the content of the event */
  details: string;
  /** browserState is the browser state of the task where the event occurred */
  browserState?: BrowserState;
}

export class AgentEvent {
  /**
   * Represents a state change event in the task execution system.
   * Each event has a type, a specific state that changed,
   * the actor that triggered the change, and associated data.
   */
  constructor(
    public actor: Actors,
    public state: ExecutionState,
    public data: EventData,
    public timestamp: number = Date.now(),
    public type: EventType = EventType.EXECUTION,
  ) {}
}

// The type of callback for event subscribers
export type EventCallback = (event: AgentEvent) => Promise<void>;
