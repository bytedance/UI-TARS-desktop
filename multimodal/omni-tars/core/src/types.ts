/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChatCompletionMessageToolCall,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  Tool,
  ToolCallEngine,
} from '@tarko/agent';
/**
 * Standard interface that all agent plugins must implement
 */
export interface AgentPlugin {
  /** Unique identifier for this agent plugin */
  readonly name: string;

  /** Environment section this agent provides (will be combined with others) */
  readonly environmentSection?: string;

  /** Initialize the agent plugin (called during composition setup) */
  initialize?(): Promise<void>;

  /** Register tools provided by this agent plugin */
  getTools?(): Tool[];

  /** Hook called on each LLM request */
  onLLMRequest?(id: string, payload: LLMRequestHookPayload): void | Promise<void>;

  /** Hook called on each LLM response */
  onLLMResponse?(id: string, payload: LLMResponseHookPayload): void | Promise<void>;

  /** Hook called at the start of each agent loop */
  onEachAgentLoopStart?(): void | Promise<void>;

  /** Hook called at the end of each agent loop */
  onAgentLoopEnd?(): void | Promise<void>;
}

// /**
//  * Standard interface that all agent plugins must implement
//  */
// export abstract class AgentPluginBase {
//   /** Unique identifier for this agent plugin */
//   abstract readonly name: string;

//   /** Environment section this agent provides (will be combined with others) */
//   abstract readonly environmentSection: string;

//   /** Initialize the agent plugin (called during composition setup) */
//   abstract initialize(): Promise<void>;

//   /** Register tools provided by this agent plugin */
//   abstract getTools(): Tool[];

//   /** Hook called on each LLM request */
//   abstract onLLMRequest?(id: string, payload: LLMRequestHookPayload): void | Promise<void>;

//   /** Hook called on each LLM response */
//   abstract onLLMResponse?(id: string, payload: LLMResponseHookPayload): void | Promise<void>;

//   /** Hook called at the start of each agent loop */
//   abstract onEachAgentLoopStart?(): void | Promise<void>;

//   /** Hook called at the end of each agent loop */
//   abstract onAgentLoopEnd?(): void | Promise<void>;

//   /**
//    * Saves snapshot data to the file system.
//    * @param id The session ID.
//    * @param filename The filename.
//    * @param payload The data to save.
//    */
//   private saveSnapshot(
//     id: string,
//     filename: string,
//     payload: LLMRequestHookPayload | LLMResponseHookPayload,
//   ): void {
//     try {
//       const dir = join(__dirname, `../snapshot/${id}/loop-${this.loop}`);

//       this.ensureDirectoryExists(dir);

//       const filePath = join(dir, filename);
//       const content = JSON.stringify(payload, null, 2);

//       writeFileSync(filePath, content, { encoding: 'utf-8' });

//       // this.logger.debug(`Snapshot saved: ${filePath}`);
//     } catch (error) {
//       //ignore
//       // this.logger.error(`Failed to save snapshot for ${id}/${filename}:`, error);
//     }
//   }

//   /**
//    * Ensures that a directory exists, creating it if it doesn't.
//    * @param dir The directory path.
//    */
//   private ensureDirectoryExists(dir: string): void {
//     if (!existsSync(dir)) {
//       mkdirSync(dir, { recursive: true });
//     }
//   }
// }

/**
 * Configuration for composing multiple agent plugins
 */
export interface AgentCompositionConfig {
  /** Base agent name */
  name: string;

  /** Agent plugins to compose */
  plugins: AgentPlugin[];

  /** Tool call engine */
  toolCallEngine: ToolCallEngine;

  /** Maximum iterations for the composed agent */
  maxIterations?: number;
}

/**
 * Interface for environment sections that can be combined
 */
export interface EnvironmentSection {
  /** Environment name (e.g., 'CODE_ENVIRONMENT', 'MCP_ENVIRONMENT') */
  name: string;

  /** The prompt content for this environment */
  content: string;
}

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
