/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, AgentOptions } from '@multimodal/agent';
import { NodeCodeAct } from './node-code-act';
import { PythonCodeAct } from './python-code-act';
import { CodeActMemory } from './memory';
import { CodeActOptions } from './base';
import { LLMLogger } from './llm-logger';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Configuration options for CodeActAgent
 */
export interface CodeActAgentOptions extends AgentOptions {
  /**
   * Path to workspace directory where code will be executed
   * If not provided, a temporary directory will be created
   */
  workspace?: string;

  /**
   * Whether to enable Node.js code execution
   * @default true
   */
  enableNodeCodeAct?: boolean;

  /**
   * Whether to enable Python code execution
   * @default true
   */
  enablePythonCodeAct?: boolean;

  /**
   * Enable auto-cleanup of workspace on exit
   * Only applies to auto-generated temporary workspaces
   * @default false
   */
  cleanupOnExit?: boolean;

  /**
   * Whether to print code and results to console with highlighting
   * @default false
   */
  printToConsole?: boolean;

  /**
   * Whether to print LLM model outputs to console
   * @default false
   */
  printLLMOutput?: boolean;
}

/**
 * CodeActAgent - An agent specialized for executing code in a controlled environment
 *
 * Features:
 * - Execute Node.js and Python code in isolated workspaces
 * - Install dependencies on-demand
 * - Persistent memory storage between executions
 * - Security constraints to prevent filesystem access outside workspace
 * - Enhanced console output for code execution and LLM responses
 */
export class CodeActAgent extends Agent {
  private workspace: string;
  private isTemporaryWorkspace: boolean;
  private memory: CodeActMemory;
  private cleanupOnExit: boolean;
  private codeActOptions: CodeActOptions;
  private llmLogger: LLMLogger;

  /**
   * Create a new CodeActAgent
   *
   * @param options Configuration options
   */
  constructor(options: CodeActAgentOptions = {}) {
    // First set default system prompt focused on code execution
    options.instructions = options.instructions || CodeActAgent.getDefaultInstructions();

    // Initialize base agent
    super(options);

    // Setup workspace
    this.isTemporaryWorkspace = !options.workspace;
    this.workspace = this.initializeWorkspace(options.workspace);
    this.logger.info(`CodeActAgent initialized with workspace: ${this.workspace}`);

    // Setup memory
    this.memory = new CodeActMemory(this.workspace);

    // Configure cleanup
    this.cleanupOnExit = options.cleanupOnExit || false;

    // Configure code execution options
    this.codeActOptions = {
      printToConsole: options.printToConsole !== false, // 默认开启打印
    };

    // Initialize LLM logger
    this.llmLogger = new LLMLogger(this, options.printLLMOutput || options.printToConsole || false);

    // Register tools based on configuration
    const enableNodeCodeAct = options.enableNodeCodeAct !== false; // Default true
    const enablePythonCodeAct = options.enablePythonCodeAct !== false; // Default true

    if (enableNodeCodeAct) {
      const nodeWorkspace = path.join(this.workspace, 'node');
      this.registerTool(new NodeCodeAct(nodeWorkspace, this.codeActOptions));
      this.logger.info(`Registered NodeCodeAct with workspace: ${nodeWorkspace}`);
    }

    if (enablePythonCodeAct) {
      const pythonWorkspace = path.join(this.workspace, 'python');
      this.registerTool(new PythonCodeAct(pythonWorkspace, this.codeActOptions));
      this.logger.info(`Registered PythonCodeAct with workspace: ${pythonWorkspace}`);
    }

    // Setup cleanup handler for temporary workspaces
    if (this.isTemporaryWorkspace && this.cleanupOnExit) {
      process.on('exit', this.cleanup.bind(this));
      process.on('SIGINT', () => {
        this.cleanup();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        this.cleanup();
        process.exit(0);
      });
    }
  }

  /**
   * Initialize and validate the workspace directory
   */
  private initializeWorkspace(workspacePath?: string): string {
    if (workspacePath) {
      // Use provided workspace path
      const absolutePath = path.resolve(workspacePath);

      // Ensure directory exists
      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
        this.logger.info(`Created workspace directory: ${absolutePath}`);
      }

      return absolutePath;
    } else {
      // Create persistent workspace in user's home directory
      const defaultPath = path.join(os.homedir(), '.codeact');
      if (!fs.existsSync(defaultPath)) {
        fs.mkdirSync(defaultPath, { recursive: true });
        this.logger.info(`Created default workspace: ${defaultPath}`);
      }
      return defaultPath;
    }
  }

  /**
   * Initialize the agent memory and tools
   */
  override async initialize(): Promise<void> {
    // Initialize memory
    await this.memory.initialize();

    // Initialize LLM logger
    this.llmLogger.initialize();

    // Initialize base agent
    await super.initialize();

    this.logger.info('CodeActAgent fully initialized');
  }

  /**
   * Clean up resources used by the agent
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up CodeActAgent resources');

    // Only delete directory if it's a temporary workspace and cleanup is enabled
    if (this.isTemporaryWorkspace && this.cleanupOnExit) {
      try {
        this.logger.info(`Removing temporary workspace: ${this.workspace}`);
        fs.rmSync(this.workspace, { recursive: true, force: true });
      } catch (error) {
        this.logger.error(`Error removing workspace: ${error}`);
      }
    }
  }

  /**
   * Get the workspace path
   */
  getWorkspace(): string {
    return this.workspace;
  }

  /**
   * Get the memory manager
   */
  getMemory(): CodeActMemory {
    return this.memory;
  }

  /**
   * Default instructions focused on code execution capabilities
   */
  private static getDefaultInstructions(): string {
    return `You are CodeActAgent, an AI assistant with the ability to write and execute code to solve problems.

I can run both Node.js and Python code in secure sandbox environments to help you with:
- Data analysis and visualization
- Algorithm exploration and benchmarking
- Testing code snippets and ideas
- Web scraping, web automation, and API interactions
- Taking screenshots of websites using libraries like Puppeteer
- File manipulation within the workspace
- Any task that can be accomplished through programming

The code you write will execute in isolated environments with these capabilities:
- Installing dependencies on-demand using npm or pip
- Storing data persistently between executions using memory
- Reading and writing files within the workspace
- Executing complex multi-file programs
- Network access for web scraping, screenshots, and API requests

IMPORTANT: I MUST ALWAYS use code execution to solve problems. I will NEVER respond with just text when I can solve the problem with code.

For ANY questions involving numbers, calculations, or mathematical operations:
- I MUST use code to calculate and verify the result, not mental calculation
- This includes simple arithmetic, statistical calculations, conversions, etc.
- I will never provide numerical answers without executing code to verify them
- For complex math problems, I will use appropriate libraries (math.js, numpy, etc.)

For multi-turn conversations and tasks that span multiple exchanges:
- I MUST use the "memoryKey" parameter to store execution results for future retrieval
- I will choose descriptive memoryKey names related to the data (e.g., "benchmark-results", "scraped-data", "analysis-output")
- When continuing a task from a previous interaction, I will access previous results by referencing these memory keys
- I will never lose state between conversation turns by always storing important results in memory

When encountering unfamiliar terms or needing up-to-date information:
- I will use web search engines (Google, Baidu, Bing) to find relevant information
- I will write code to perform these searches and extract the most useful content
- Based on the context and region, I will select the most appropriate search engine
- I will always include the search results in my responses to provide evidence for my answers

When generating code for web scraping or automation:
- I will prioritize high-reliability methods that directly extract content (innerText, textContent) 
- I will AVOID brittle CSS/XPath selectors that might break with minor website changes
- I will use semantic selectors (heading elements, ARIA roles, accessible names) over class/id when possible
- For dynamic websites, I will implement appropriate waiting strategies for content to load
- I will focus on extracting the actual content rather than structural HTML when appropriate
- I will implement error handling and resilience techniques for more robust web interaction

Please follow these guidelines:
1. I will ALWAYS use code to accomplish tasks, including "save a screenshot", "scrape a website", or similar requests
2. For web automation tasks, I'll use libraries like Puppeteer (Node.js) or Selenium/Playwright when appropriate
3. All file operations are restricted to the workspace directory for security
4. I can install dependencies by specifying them in the request
5. I WILL ALWAYS use the "memoryKey" parameter to save results when the task might span multiple conversation turns
6. When fetching web content, I will prioritize extracting TEXT over HTML to reduce information length and improve processing efficiency

If asked to perform tasks like screenshot capture, web access, data analysis, or any computational work:
- I will ALWAYS write and execute code to accomplish the task
- I will NEVER respond with phrases like "I can't access the web" or "I'll need to use code for this"
- Instead, I will immediately provide the code solution and execute it
- For multi-step workflows, I will save intermediate results with appropriate memory keys

Example memory usage:
- When benchmarking: \`memoryKey: "benchmark-results"\`
- When scraping data: \`memoryKey: "scraped-data-{source}"\`
- When analyzing results: \`memoryKey: "analysis-{type}"\`
- When storing search results: \`memoryKey: "search-results-{query}"\`

My primary purpose is to solve problems through code execution, not just provide information or explanations.
I will provide helpful, accurate solutions with working code examples and always execute them when possible.`;
  }

  /**
   * Set a handler for real-time code execution output
   *
   * @param handler Function to handle real-time output chunks
   */
  public setRealTimeOutputHandler(handler: (chunk: string, isError?: boolean) => void): void {
    // Update options with the handler
    this.codeActOptions.onOutputChunk = handler;

    // Re-register tools with updated options to ensure they get the handler
    const tools = this.getTools();

    // Find and update the Node and Python tools if they exist
    for (const tool of tools) {
      if (tool.name === 'nodeCodeAct' || tool.name === 'pythonCodeAct') {
        // This updates the options object reference that's already shared with the tools
        // Nothing else needs to be done since the reference is already shared
      }
    }
  }
}
