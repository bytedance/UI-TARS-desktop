/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentOptions,
  AgentReasoningOptions,
  AgentRunOptions,
  AgentRunStreamingOptions,
  AgentRunNonStreamingOptions,
  EventStream,
  Event,
  EventType,
  AssistantMessageEvent,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ToolDefinition,
  isAgentRunObjectOptions,
  isStreamingOptions,
} from '../types';
import { AgentRunner } from './agent-runner';
import { EventStream as EventStreamImpl } from '../stream/event-stream';
import { ToolManager } from './tool-manager';
import { ModelResolver } from '../utils/model-resolver';
import { getLogger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Testing configuration for agent snapshot generation
 */
interface TestSnapshotConfig {
  /**
   * Whether to dump test snapshots during execution
   */
  enabled: boolean;
  /**
   * Directory to dump snapshots to
   */
  outputDir: string;
  /**
   * Current test case name
   */
  testCaseName: string;
  /**
   * Current iteration/loop count
   */
  currentLoop: number;
  /**
   * Captured LLM requests
   */
  llmRequests: Record<number, LLMRequestHookPayload>;
  /**
   * Captured LLM responses
   */
  llmResponses: Record<number, LLMResponseHookPayload>;
  /**
   * Original source file that was executed
   */
  sourceFile?: string;
}

/**
 * An event-stream driven agent framework for building effective multimodal Agents.
 *
 * - Multi-turn reasoning agent loop
 * - highly customizable, easy to build higher-level Agents
 * - Tool registration and execution
 * - Multimodal context awareness and management
 * - Communication with multiple LLM providers
 * - Event stream management for tracking agent loop state
 */
export class Agent {
  private instructions: string;
  private maxIterations: number;
  private maxTokens: number | undefined;
  protected name: string;
  protected id?: string;
  private eventStream: EventStreamImpl;
  private toolManager: ToolManager;
  private modelResolver: ModelResolver;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  private runner: AgentRunner;
  private currentRunOptions?: AgentRunOptions;
  protected logger = getLogger('Agent');

  /**
   * Private configuration for test snapshot generation
   */
  private __testSnapshotConfig?: TestSnapshotConfig;

  /**
   * Creates a new Agent instance.
   *
   * @param options - Configuration options for the agent including instructions,
   * tools, model selection, and runtime parameters.
   */
  constructor(private options: AgentOptions = {}) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.maxIterations = options.maxIterations ?? 10;
    this.maxTokens = options.maxTokens;
    this.name = options.name ?? 'Anonymous';
    this.id = options.id;

    // Initialize event stream
    this.eventStream = new EventStreamImpl(options.eventStreamOptions);

    // Initialize Tool Manager
    this.toolManager = new ToolManager(this.logger);

    // Initialize ModelResolver
    this.modelResolver = new ModelResolver(options);

    // Register any provided tools
    if (options.tools) {
      options.tools.forEach((tool) => {
        this.registerTool(tool);
      });
    }

    const { providers } = this.options.model ?? {};
    if (Array.isArray(providers)) {
      this.logger.info(`[Models] Found ${providers.length} custom model providers`);
    } else {
      this.logger.warn(`[Models] No custom providers configured, will use built-in providers`);
    }

    // Log the default selection
    const defaultSelection = this.modelResolver.getDefaultSelection();
    if (defaultSelection.provider || defaultSelection.model) {
      this.logger.info(
        `[Agent] ${this.name} initialized | Default model provider: ${defaultSelection.provider ?? 'N/A'} | ` +
          `Default model: ${defaultSelection.model ?? 'N/A'} | ` +
          `Tools: ${options.tools?.length || 0} | Max iterations: ${this.maxIterations}`,
      );
    }

    this.temperature = options.temperature ?? 0.7;
    this.reasoningOptions = options.thinking ?? { type: 'disabled' };

    // Initialize the runner
    this.runner = new AgentRunner({
      instructions: this.instructions,
      maxIterations: this.maxIterations,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      reasoningOptions: this.reasoningOptions,
      toolCallEngine: options.tollCallEngine,
      eventStream: this.eventStream,
      toolManager: this.toolManager,
      modelResolver: this.modelResolver,
      agent: this,
    });

    // Initialize test snapshot config if enabled
    if (process.env.DUMP_AGENT_SNAPSHOP) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testCaseName =
        process.env.DUMP_AGENT_SNAPSHOP_NAME ?? `agent-run-snapshot-${timestamp}`;
      const outputDir = path.resolve(process.cwd(), 'fixtures', testCaseName);

      this.__testSnapshotConfig = {
        enabled: true,
        outputDir,
        testCaseName,
        currentLoop: 0,
        llmRequests: {},
        llmResponses: {},
        sourceFile: process.env.DUMP_AGENT_SNAPSHOP_SOURCE_FILE,
      };

      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      this.logger.info(`[Test] Snapshot generation enabled. Output directory: ${outputDir}`);
    }
  }

  /**
   * Returns the event stream manager associated with this agent.
   * The event stream tracks all conversation events including messages,
   * tool calls, and system events.
   *
   * @returns The EventStream instance
   */
  getEventStream(): EventStream {
    return this.eventStream;
  }

  /**
   * Returns a string identifier for the agent, including ID if available.
   * Used for logging and identification purposes.
   *
   * @returns A string in format "name (id)" or just "name" if id is not available
   * @protected
   */
  protected getAgentIdentifier(): string {
    return this.id ? `${this.name} (${this.id})` : this.name;
  }

  /**
   * Executes the main agent reasoning loop.
   *
   * This method processes the user input, communicates with the LLM,
   * executes tools as requested by the LLM, and continues iterating
   * until a final answer is reached or max iterations are hit.
   *
   * @param input - String input for a basic text message
   * @returns The final response from the agent as a string
   */
  async run(input: string): Promise<string>;

  /**
   * Executes the main agent reasoning loop with additional options.
   *
   * @param options - Object with input and optional configuration
   * @returns The final response event from the agent (when stream is false)
   */
  async run(options: AgentRunNonStreamingOptions): Promise<AssistantMessageEvent>;

  /**
   * Executes the main agent reasoning loop with streaming support.
   *
   * @param options - Object with input and streaming enabled
   * @returns An async iterable of streaming events
   */
  async run(options: AgentRunStreamingOptions): Promise<AsyncIterable<Event>>;

  /**
   * Implementation of the run method to handle all overload cases
   * @param runOptions - Input options
   */
  async run(
    runOptions: AgentRunOptions,
  ): Promise<string | AssistantMessageEvent | AsyncIterable<Event>> {
    this.currentRunOptions = runOptions;
    // Normalize the options
    const normalizedOptions = isAgentRunObjectOptions(runOptions)
      ? runOptions
      : { input: runOptions };

    // Generate sessionId if not provided
    const sessionId =
      normalizedOptions.sessionId ?? `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Add user message to event stream
    const userEvent = this.eventStream.createEvent(EventType.USER_MESSAGE, {
      content: normalizedOptions.input,
    });

    this.eventStream.sendEvent(userEvent);

    // Check if streaming is requested
    if (isAgentRunObjectOptions(runOptions) && isStreamingOptions(normalizedOptions)) {
      // Execute in streaming mode
      return this.runner.executeStreaming(normalizedOptions, sessionId);
    } else {
      // Execute in non-streaming mode
      const result = await this.runner.execute(normalizedOptions, sessionId);

      // For string input, return the string content
      if (typeof runOptions === 'string') {
        return result.content || '';
      }

      // For object input without streaming, return the event
      return result;
    }
  }

  /**
   * Registers a new tool that the agent can use during execution.
   * Tools are stored in a map keyed by the tool name.
   *
   * @param tool - The tool definition to register
   */
  public registerTool(tool: ToolDefinition): void {
    this.toolManager.registerTool(tool);
  }

  /**
   * Returns all registered tools as an array.
   *
   * @returns Array of all registered tool definitions
   */
  public getTools(): ToolDefinition[] {
    return this.toolManager.getTools();
  }

  /**
   * Provides the default instructions used when none are specified.
   * These instructions define the agent's basic behavior and capabilities.
   *
   * @returns The default instructions string
   * @private
   */
  private getDefaultPrompt(): string {
    return `You are an intelligent assistant that can use provided tools to answer user questions.
Please use tools when needed to get information, don't make up answers.
Provide concise and accurate responses.`;
  }

  /**
   * Hook called before sending a request to the LLM
   * This allows subclasses to inspect or modify the request before it's sent
   *
   * Note: Currently only supports inspection; modification of the request
   * will be supported in a future version
   *
   * @param id Session identifier for this conversation
   * @param payload The complete request payload
   * @returns The payload (currently must return the same payload)
   */
  public onLLMRequest(id: string, payload: LLMRequestHookPayload): LLMRequestHookPayload {
    // If test snapshot dumping is enabled, store the request
    if (process.env.DUMP_AGENT_SNAPSHOP && this.__testSnapshotConfig?.enabled) {
      this.__testSnapshotConfig.currentLoop++;
      const currentLoop = this.__testSnapshotConfig.currentLoop;
      this.__testSnapshotConfig.llmRequests[currentLoop] = payload;

      // Create loop directory
      const loopDir = path.join(this.__testSnapshotConfig.outputDir, `loop-${currentLoop}`);
      if (!fs.existsSync(loopDir)) {
        fs.mkdirSync(loopDir, { recursive: true });
      }

      // Write request to file
      fs.writeFileSync(
        path.join(loopDir, 'llm-request.jsonl'),
        JSON.stringify(payload, null, 2),
        'utf-8',
      );

      // Dump current event stream state
      const events = this.eventStream.getEvents();
      fs.writeFileSync(
        path.join(loopDir, 'event-stream.jsonl'),
        JSON.stringify(events, null, 2),
        'utf-8',
      );
    }

    // Default implementation: pass-through
    return payload;
  }

  /**
   * Hook called after receiving a response from the LLM
   * This allows subclasses to inspect or modify the response before it's processed
   *
   * @param id Session identifier for this conversation
   * @param payload The complete response payload
   * @returns The payload (possibly modified)
   */
  public onLLMResponse(id: string, payload: LLMResponseHookPayload): LLMResponseHookPayload {
    // If test snapshot dumping is enabled, store the response
    if (process.env.DUMP_AGENT_SNAPSHOP && this.__testSnapshotConfig?.enabled) {
      const currentLoop = this.__testSnapshotConfig.currentLoop;
      this.__testSnapshotConfig.llmResponses[currentLoop] = payload;

      // Write response to file
      const loopDir = path.join(this.__testSnapshotConfig.outputDir, `loop-${currentLoop}`);
      fs.writeFileSync(
        path.join(loopDir, 'llm-response.jsonl'),
        JSON.stringify(payload.response, null, 2),
        'utf-8',
      );
    }

    // Default implementation: pass-through
    return payload;
  }

  /**
   * Hook called after receiving streaming responses from the LLM
   * Similar to onLLMResponse, but specifically for streaming
   *
   * @param id Session identifier for this conversation
   * @param payload The streaming response payload
   */
  public onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    // Default implementation: do nothing
  }

  /**
   * Hook called at the end of the agent's execution loop
   * This method is invoked after the agent has completed all iterations or reached a final answer
   *
   * @param id Session identifier for the completed conversation
   */
  public onAgentLoopEnd(id: string): void {
    // If test snapshot dumping is enabled, finalize by creating setup.ts
    if (process.env.DUMP_AGENT_SNAPSHOP && this.__testSnapshotConfig?.enabled) {
      // Determine source file from which to import
      const sourceFile =
        process.env.DUMP_AGENT_SNAPSHOP_SOURCE_FILE ||
        // If not explicitly set, try to determine from the main module
        (require.main?.filename
          ? path.relative(process.cwd(), require.main.filename).replace(/\\/g, '/')
          : undefined);

      if (!sourceFile) {
        this.logger.warn(
          '[Test] Could not determine source file for test snapshot. Using mock setup file.',
        );

        // Create basic setup.ts file as fallback
        const setupFile = `import { Agent, AgentRunOptions } from '../../src';

// This is an auto-generated test setup file
// Modify this file to reproduce the agent behavior in tests

export const agent = new Agent(${JSON.stringify(this.options, null, 2)});

export const runOptions: AgentRunOptions = ${JSON.stringify(this.currentRunOptions)};
`;

        fs.writeFileSync(
          path.join(this.__testSnapshotConfig.outputDir, 'setup.ts'),
          setupFile,
          'utf-8',
        );
      } else {
        // Create setup.ts file that imports from the original source
        const sourceFileWithoutExt = sourceFile.replace(/\.(ts|js)$/, '');
        const relPath = path
          .relative(this.__testSnapshotConfig.outputDir, path.resolve(process.cwd()))
          .replace(/\\/g, '/');

        const setupFile = `import { agent, runOptions } from '${relPath ? relPath + '/' : ''}${sourceFileWithoutExt}';

export { agent, runOptions };
`;

        fs.writeFileSync(
          path.join(this.__testSnapshotConfig.outputDir, 'setup.ts'),
          setupFile,
          'utf-8',
        );
      }

      this.logger.info(
        `[Test] Snapshot generation completed: ${this.__testSnapshotConfig.outputDir}`,
      );
    }
  }
}
