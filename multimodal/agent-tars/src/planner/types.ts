/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, AgentEventStream } from '@agent-tars/interface';
import type { PlannerStrategyType } from '@agent-tars/interface';

export type { PlannerStrategyType };

/**
 * Current planning stage
 */
export type PlannerStage = 'plan' | 'execute';

/**
 * Planning session state
 */
export interface PlannerState {
  /** Current planning stage */
  stage: PlannerStage;
  /** Current plan steps */
  steps: AgentEventStream.PlanStep[];
  /** Whether planning is completed */
  completed: boolean;
  /** Session identifier */
  sessionId: string;
  /** Current iteration */
  iteration: number;
}

/**
 * Context passed to planner strategies
 */
export interface PlannerContext {
  /** Current user input */
  userInput: string;
  /** Available tools */
  availableTools: Tool[];
  /** Current planner state */
  state: PlannerState;
  /** Session identifier */
  sessionId: string;
}

/**
 * Planner configuration options
 */
export interface PlannerOptions {
  /** Strategy to use */
  strategy: PlannerStrategyType;
  /** Maximum steps allowed */
  maxSteps: number;
  /** Custom planning prompt */
  planningPrompt?: string;
}

/**
 * Tool filtering result
 */
export interface ToolFilterResult {
  /** Filtered tools to make available */
  tools: Tool[];
  /** System prompt addition */
  systemPromptAddition?: string;
}
