/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { PlannerContext, ToolFilterResult } from '../types';
import { IAgent } from '@agent-tars/interface';

/**
 * Abstract base class for planner strategies
 */
export abstract class BasePlannerStrategy {
  protected logger: ConsoleLogger;
  protected eventStream: AgentEventStream.Processor;
  protected options: import('../types').PlannerOptions;
  protected agent?: IAgent;

  constructor(
    logger: ConsoleLogger,
    eventStream: AgentEventStream.Processor,
    options: import('../types').PlannerOptions,
    agent?: IAgent,
  ) {
    this.logger = logger.spawn(`${this.constructor.name}`);
    this.eventStream = eventStream;
    this.options = options;
    this.agent = agent;
  }

  /**
   * Get a system prompt for instructions on how to work
   */
  abstract getSystemInstrucution(): string;

  /**
   * Create planning tools for the current context
   */
  abstract createPlanningTools(context: PlannerContext): Tool[];

  /**
   * Create plan update tools for the current context
   */
  abstract createPlanUpdateTools(context: PlannerContext): Tool[];

  /**
   * Filter tools based on current planning stage
   */
  abstract filterToolsForStage(context: PlannerContext): ToolFilterResult;

  /**
   * Check if planning is completed based on the current state
   */
  abstract isPlanningCompleted(steps: AgentEventStream.PlanStep[]): boolean;

  /**
   * Send plan events to the event stream
   */
  protected sendPlanEvents(
    sessionId: string,
    steps: AgentEventStream.PlanStep[],
    type: 'start' | 'update' | 'finish',
  ): void {
    switch (type) {
      case 'start':
        this.eventStream.sendEvent(this.eventStream.createEvent('plan_start', { sessionId }));
        break;
      case 'update':
        this.eventStream.sendEvent(
          this.eventStream.createEvent('plan_update', { sessionId, steps }),
        );
        break;
      case 'finish':
        const summary = `Completed ${steps.filter((s) => s.done).length} out of ${steps.length} planned steps`;
        this.eventStream.sendEvent(
          this.eventStream.createEvent('plan_finish', { sessionId, summary }),
        );
        break;
    }
  }
}
