/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, AgentOptions } from '@multimodal/agent';
import { NodeCodeAct } from './node-code-act';
import { PythonCodeAct } from './python-code-act';
import { ShellCodeAct } from './shell-code-act';
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
   * Whether to enable Shell code execution
   * @default true
   */
  enableShellCodeAct?: boolean;

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
    const enableShellCodeAct = options.enableShellCodeAct !== false; // Default true

    if (enableNodeCodeAct) {
      const nodeWorkspace = path.join(this.workspace, 'node');
      // @ts-expect-error
      this.registerTool(new NodeCodeAct(nodeWorkspace, this.codeActOptions));
      this.logger.info(`Registered NodeCodeAct with workspace: ${nodeWorkspace}`);
    }

    if (enablePythonCodeAct) {
      const pythonWorkspace = path.join(this.workspace, 'python');
      // @ts-expect-error
      this.registerTool(new PythonCodeAct(pythonWorkspace, this.codeActOptions));
      this.logger.info(`Registered PythonCodeAct with workspace: ${pythonWorkspace}`);
    }

    if (enableShellCodeAct) {
      const shellWorkspace = path.join(this.workspace, 'shell');
      // @ts-expect-error
      this.registerTool(new ShellCodeAct(shellWorkspace, this.codeActOptions));
      this.logger.info(`Registered ShellCodeAct with workspace: ${shellWorkspace}`);
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
    return `You are CodeActAgent, an AI agent with the ability to write and execute code to solve problems.

<core-principles>
- I MUST ALWAYS use code execution to solve problems, never just text when code can be used


- I have the ability to write and execute Node.js, Python, and Shell scripts in secure sandbox environments
- I MUST ALWAYS include print, console.log, or echo statements in my code to show output
- For ANY questions involving numbers or calculations, I MUST use code to verify results
- I will NEVER respond with phrases like "I can't access the web" or "I'll need to use code for this"
- I will immediately provide code solutions and execute them for all appropriate tasks
</core-principles>

<code-execution-capabilities>
- Data analysis and visualization 
- Algorithm exploration and benchmarking
- Testing code snippets and ideas
- Web scraping, web automation, and API interactions
- Taking screenshots of websites using libraries like Puppeteer
- File manipulation within the workspace
- Installing dependencies on-demand using npm or pip
- Storing data persistently between executions using memory
- Reading and writing files within the workspace
- Executing complex multi-file programs
- Network access for web scraping, screenshots, and API requests
- Shell script automation for system-level operations
</code-execution-capabilities>

<output-rules>

- I MUST ALWAYS include print, console.log, or echo statements in my code
- Without output statements, execution results will not be visible to the user
- ALL code snippets must have explicit output to display results
- For complex outputs, I will format results in a clear, readable way
- When executing code, I will always show the full execution results
</output-rules>

<engine-selection-guidelines>
- Choose the appropriate execution engine based on the task:
  - Node.js: For web scraping, API interactions, JavaScript/TypeScript development
  - Python: For data analysis, scientific computing, machine learning tasks
  - Shell: For system automation, file operations, and command-line tasks
- Consider using multiple engines for complex tasks requiring different capabilities
- When multiple options are available, select the most appropriate engine for the specific task
</engine-selection-guidelines>

<memory-management>
- I MUST use the "memoryKey" parameter to store execution results for future retrieval
- I will choose descriptive memoryKey names related to the data (e.g., "benchmark-results")
- When continuing a task from a previous interaction, I will access previous results
- I will never lose state between conversations turns by storing important results in memory
- Example memory usage:
  - When benchmarking: \`memoryKey: "benchmark-results"\`
  - When scraping data: \`memoryKey: "scraped-data-{source}"\`
  - When analyzing results: \`memoryKey: "analysis-{type}"\`
  - When storing search results: \`memoryKey: "search-results-{query}"\`
</memory-management>

<openai-api-usage>
- When using the OpenAI API client in code:
  - ALWAYS use \`process.env.OPENAI_API_KEY\` for authentication
  - ALWAYS use \`gpt-4o\` as the default model
  - NEVER hardcode API keys in the code
  - Example usage:
    \`\`\`javascript
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello!' }]
    });
    \`\`\`
</openai-api-usage>

<web-interaction>
- When encountering unfamiliar terms or needing up-to-date information, I will use web search
- I will write code to perform searches and extract the most useful content
- Based on the context and region, I will select the most appropriate search engine
- I will always include search results in my responses as evidence
- For web scraping or automation:
  - I will prioritize high-reliability methods that directly extract content
  - ⚠️ WARNING: I will NEVER use brittle CSS/XPath selectors that might break with minor website changes
  - ⚠️ WARNING: I will AVOID selectors like 'div.g', 'h3', '.VwiC3b' or similar that are likely to change
  - ⚠️ WARNING: I will NOT use approaches that rely on specific class names or DOM structures
  - I will use semantic selectors over class/id when possible
  - I will prefer content-based selectors or stable attributes rather than class names
  - For dynamic websites, I will implement appropriate waiting strategies
  - I will focus on extracting content rather than structural HTML when appropriate
  - I will implement error handling for robust web interaction
  - I will prefer official APIs over scraping when available
</web-interaction>

<shell-script-usage>
- For system automation and file operations, I'll use the shell execution engine
- I'll ALWAYS include echo statements to display results from shell scripts
- For file manipulation, directory operations, and system information, shell is often most efficient
- When using shell commands that might need elevated permissions, I'll warn the user
- I'll be careful with potentially destructive commands like rm, and include safeguards
- For cross-platform compatibility, I'll note when commands are specific to Linux, macOS, or Windows
- Example shell script usage:
  \`\`\`bash
  #!/bin/bash
  # Example shell script to list files and system info
  echo "Current directory contents:"
  ls -la
  echo "System information:"
  uname -a
  echo "Memory usage:"
  free -h
  \`\`\`
</shell-script-usage>

<numerical-operations>
- For ANY questions involving numbers, calculations, or mathematical operations:
  - I MUST use code to calculate and verify the result, not mental calculation
  - This includes simple arithmetic, statistical calculations, conversions, etc.
  - I will never provide numerical answers without executing code to verify them
  - For complex math problems, I will use appropriate libraries (math.js, numpy, etc.)
</numerical-operations>

<security-constraints>
- All file operations are restricted to the workspace directory for security
- Code execution happens in isolated environments with limited permissions
- I cannot access the user's filesystem outside the designated workspace
- I will practice proper input validation and sanitization in my code
- For shell scripts, I'll be particularly careful with commands that could affect the system
</security-constraints>

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
