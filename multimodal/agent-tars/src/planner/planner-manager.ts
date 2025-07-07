/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import {
  PlannerOptions,
  PlannerState,
  PlannerContext,
  ToolFilterResult,
  PlannerStrategyType,
} from './types';
import {
  BasePlannerStrategy,
  DefaultPlannerStrategy,
  SequentialThinkingStrategy,
} from './strategies';

/**
 * Central manager for planning functionality
 * Coordinates between different planner strategies and manages planning state
 */
export class PlannerManager {
  private strategy: BasePlannerStrategy;
  private state: PlannerState;
  private logger: ConsoleLogger;

  constructor(
    private options: PlannerOptions,
    private eventStream: AgentEventStream.Processor,
    logger: ConsoleLogger,
  ) {
    this.options = options;
    this.logger = logger.spawn('PlannerManager');

    // Initialize strategy based on configuration
    this.strategy = this.createStrategy(options.strategy, eventStream, options);

    // Initialize empty state
    this.state = {
      stage: 'plan',
      steps: [],
      completed: false,
      sessionId: '',
      iteration: 0,
    };

    this.logger.info(`Planner initialized with strategy: ${options.strategy}`);
  }

  /**
   * Update planner state for new iteration
   */
  onEachAgentLoopStart(iteration: number): void {
    this.state.iteration = iteration;
    this.logger.info(`[Plan] Starting iteration ${iteration} with current state:`, {
      stage: this.state.stage,
      stepsCount: this.state.steps.length,
      completed: this.state.completed,
      sessionId: this.state.sessionId,
    });
    this.logger.debug(
      `[Plan] State summary - Iteration: ${iteration}, Stage: ${this.state.stage}, Steps: ${this.state.steps.length}, Completed: ${this.state.completed}`,
    );
  }

  /**
   * Filter tools based on current planning state
   */
  buildTools(availableTools: Tool[]): ToolFilterResult {
    const events = this.eventStream.getEvents(['user_message'], 1);
    const userInput =
      // @ts-expect-error FIX TYPE LATER
      events.length > 0 ? (typeof events[0].content === 'string' ? events[0].content : '') : '';

    if (this.state.completed) {
      // Planning completed - return all tools
      return { tools: availableTools };
    }

    const context: PlannerContext = {
      userInput,
      availableTools,
      state: this.state,
      sessionId: this.state.sessionId,
    };

    console.log('[Plan] filterTools this.state.stage', this.state.stage);

    return this.strategy.filterToolsForStage(context);
  }

  /**
   * Get system prompt additions for current state
   */
  getSystemInstrucution(): string {
    return this.strategy.getSystemInstrucution();
  }

  /**
   * Get current planning state (for debugging/monitoring)
   */
  getCurrentState(): PlannerState {
    return { ...this.state };
  }

  /**
   * Check if planning is completed
   */
  isCompleted(): boolean {
    return this.state.completed;
  }

  /**
   * Create strategy instance based on type
   */
  private createStrategy(
    strategyType: string,
    eventStream: AgentEventStream.Processor,
    options: PlannerOptions,
  ): BasePlannerStrategy {
    switch (strategyType) {
      case 'default':
        return new DefaultPlannerStrategy(this.logger, eventStream, options);
      case 'sequentialThinking':
        return new SequentialThinkingStrategy(this.logger, eventStream, options);
      default:
        this.logger.warn(`Unknown planner strategy: ${strategyType}, falling back to default`);
        return new DefaultPlannerStrategy(this.logger, eventStream, options);
    }
  }
}
