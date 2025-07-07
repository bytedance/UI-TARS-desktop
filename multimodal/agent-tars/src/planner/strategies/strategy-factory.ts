/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { PlannerOptions } from '../types';
import { BasePlannerStrategy } from './base-strategy';
import { DefaultPlannerStrategy } from './default-strategy';
import { StructuredPlannerStrategy } from './structured-strategy';
import { SequentialThinkingStrategy } from './sequential-thinking-strategy';

/**
 * Strategy factory for creating planner strategies
 */
export class PlannerStrategyFactory {
  /**
   * Create a planner strategy based on the specified type
   * @param strategyType Strategy type identifier
   * @param logger Logger instance
   * @param eventStream Event stream processor
   * @param options Planner configuration options
   * @returns Planner strategy instance
   */
  static createStrategy(
    strategyType: string,
    logger: ConsoleLogger,
    eventStream: AgentEventStream.Processor,
    options: PlannerOptions,
  ): BasePlannerStrategy {
    switch (strategyType) {
      case 'default':
        return new DefaultPlannerStrategy(logger, eventStream, options);
      case 'structured':
        return new StructuredPlannerStrategy(logger, eventStream, options);
      case 'sequentialThinking':
        return new SequentialThinkingStrategy(logger, eventStream, options);
      default:
        logger.warn(`Unknown planner strategy: ${strategyType}, falling back to default`);
        return new DefaultPlannerStrategy(logger, eventStream, options);
    }
  }
}
