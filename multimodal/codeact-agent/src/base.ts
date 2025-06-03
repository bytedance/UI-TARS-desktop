/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { Tool } from '@multimodal/agent';
import { CodeActMemory } from './memory';
import { logger } from './logger';
import { CodeHighlighter } from './highlighter';

/**
 * Result of code execution
 */
export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  timeTaken: number;
  memoryUsage?: number;
}

/**
 * Configuration options for code execution behavior
 */
export interface CodeActOptions {
  /**
   * Whether to print code and results to console with highlighting
   * @default false
   */
  printToConsole?: boolean;

  /**
   * Optional callback for real-time stdout/stderr output
   * This allows streaming output to the CLI or other interfaces
   */
  onOutputChunk?: (chunk: string, isError?: boolean) => void;
}

/**
 * Base parameters for all CodeAct tools
 */
export const baseCodeActSchema = z.object({
  code: z.string().describe('The code to execute'),
  installDependencies: z
    .string()
    .optional()
    .describe('Optional comma-separated dependencies to install before execution'),
  memoryKey: z
    .string()
    .optional()
    .describe('Optional key to store results in memory for future executions'),
});

/**
 * Abstract base class for Code Act tools
 *
 * This class provides common functionality for code execution tools,
 * including workspace management, memory management, and safety constraints.
 *
 * Derived classes must implement the actual code execution logic.
 */
export abstract class CodeActBase<T extends z.ZodRawShape> extends Tool<z.infer<z.ZodObject<T>>> {
  protected memory: CodeActMemory;
  protected initialized = false;
  protected options: CodeActOptions;

  /**
   * Create a new CodeAct tool
   *
   * @param id Tool identifier
   * @param description Tool description
   * @param workspacePath Path to the restricted workspace directory
   * @param schema Zod schema for tool parameters
   * @param options Configuration options
   */
  constructor(
    id: string,
    description: string,
    protected workspacePath: string,
    schema: z.ZodObject<T>,
    options: CodeActOptions = {},
  ) {
    super({
      id,
      description,
      // @ts-expect-error
      parameters: schema,
      function: (args) => this.execute(args),
    });

    this.memory = new CodeActMemory(workspacePath);
    this.ensureWorkspaceExists();
    this.options = {
      printToConsole: false,
      ...options,
    };
  }

  /**
   * Initialize the tool
   * Sets up workspace and memory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.memory.initialize();
    this.initialized = true;
    logger.info(`${this.name} initialized with workspace: ${this.workspacePath}`);
  }

  /**
   * Ensure the workspace directory exists
   */
  private ensureWorkspaceExists(): void {
    try {
      if (!fs.existsSync(this.workspacePath)) {
        fs.mkdirSync(this.workspacePath, { recursive: true });
        logger.info(`Created workspace directory: ${this.workspacePath}`);
      }
    } catch (error) {
      logger.error(`Error creating workspace directory: ${error}`);
      throw new Error(`Failed to create workspace directory: ${error}`);
    }
  }

  /**
   * Print code to console with syntax highlighting
   *
   * @param code The code to print
   * @param language The programming language
   * @param fileName Optional filename to display
   */
  protected printCode(code: string, language: string, fileName?: string): void {
    if (this.options.printToConsole) {
      console.log(CodeHighlighter.highlightCode(code, language, fileName));
    }
  }

  /**
   * Print execution result to console with highlighting
   *
   * @param result The execution result
   * @param success Whether execution was successful
   * @param fileName Optional filename associated with the result
   */
  protected printResult(result: string, success: boolean, fileName?: string): void {
    if (this.options.printToConsole) {
      console.log(CodeHighlighter.highlightResult(result, success, fileName));
    }
  }

  /**
   * Validate that a path is within the workspace for security
   *
   * @param filePath Path to validate
   * @returns Normalized absolute path within workspace
   * @throws Error if path is outside workspace
   */
  protected validatePath(filePath: string): string {
    const normalizedPath = path.normalize(
      path.isAbsolute(filePath) ? filePath : path.join(this.workspacePath, filePath),
    );

    // Security check to prevent directory traversal
    if (!normalizedPath.startsWith(this.workspacePath)) {
      throw new Error(
        `Security violation: Path "${filePath}" attempts to access location outside of workspace`,
      );
    }

    return normalizedPath;
  }

  /**
   * Write content to a file within the workspace
   *
   * @param filePath Path to the file (relative to workspace)
   * @param content Content to write
   */
  protected async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.validatePath(filePath);

    // Ensure directory exists
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Read content from a file within the workspace
   *
   * @param filePath Path to the file (relative to workspace)
   * @returns File content as string
   */
  protected async readFile(filePath: string): Promise<string> {
    const fullPath = this.validatePath(filePath);
    return fs.promises.readFile(fullPath, 'utf-8');
  }

  /**
   * Execute the code
   * This is implemented by derived classes
   *
   * @param args Tool arguments
   */
  protected abstract execute(args: z.infer<z.ZodObject<T>>): Promise<string>;

  /**
   * Install dependencies for the code
   * This is implemented by derived classes
   *
   * @param dependencies Comma-separated list of dependencies
   */
  protected abstract installDependencies(dependencies: string): Promise<string>;
}
