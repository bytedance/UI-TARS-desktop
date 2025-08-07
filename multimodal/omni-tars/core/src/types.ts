/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LLMRequestHookPayload, LLMResponseHookPayload, Tool } from '@tarko/agent';
// import { existsSync, mkdirSync, writeFileSync } from 'fs';
// import { join } from 'path';
/**
 * Standard interface that all agent plugins must implement
 */
export interface AgentPlugin {
  /** Unique identifier for this agent plugin */
  readonly name: string;

  /** Environment section this agent provides (will be combined with others) */
  readonly environmentSection: string;

  /** Initialize the agent plugin (called during composition setup) */
  initialize(): Promise<void>;

  /** Register tools provided by this agent plugin */
  getTools(): Tool[];

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

  /** Maximum iterations for the composed agent */
  maxIterations?: number;

  /** Additional configuration options */
  [key: string]: unknown;
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
