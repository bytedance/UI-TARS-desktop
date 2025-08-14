/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageToolCall, Tool, ToolCallEngine } from '@tarko/agent';

/**
 * Abstract base class for tool call engine providers that can be composed
 */
export abstract class ToolCallEngineProvider<T extends ToolCallEngine = ToolCallEngine> {
  /** Unique identifier for this tool call engine */
  abstract readonly name: string;

  /** Priority for this engine (higher priority engines are tried first) */
  abstract readonly priority: number;

  /** Description of what this engine handles */
  abstract readonly description?: string;

  /** Singleton instance cache */
  private engineInstance?: T;

  /** Get an instance of the tool call engine (using singleton pattern) */
  getEngine(): T {
    if (!this.engineInstance) {
      this.engineInstance = this.createEngine();
    }
    return this.engineInstance;
  }

  /** Create a new instance of the tool call engine */
  protected abstract createEngine(): T;

  /** Determine if this engine should handle the given context */
  abstract canHandle?(context: ToolCallEngineContext): boolean;
}

/**
 * Context for determining which tool call engine to use
 */
export interface ToolCallEngineContext {
  /** Current tools available */
  tools?: Tool[];

  toolCalls?: ChatCompletionMessageToolCall[];

  /** Message history */
  messageHistory?: unknown[];

  /** Latest model output from in current loop */
  latestAssistantMessage?: string;
}

/**
 * Configuration for composing tool call engines
 */
export interface ToolCallEngineCompositionConfig {
  /** List of tool call engine providers to compose */
  engines: ToolCallEngineProvider[];
  /** Default engine to use when no specific engine matches */
  defaultEngine?: ToolCallEngineProvider;
}
