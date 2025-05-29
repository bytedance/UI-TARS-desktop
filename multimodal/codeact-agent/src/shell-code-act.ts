/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { CodeActBase, baseCodeActSchema, CodeActOptions } from './base';
import { logger } from './logger';

const execAsync = promisify(exec);

// Shell-specific parameters schema
const shellCodeActSchema = baseCodeActSchema.extend({
  shellType: z
    .enum(['bash', 'sh', 'zsh'])
    .optional()
    .describe('Shell interpreter to use (defaults to "bash")'),
  saveToFile: z
    .string()
    .optional()
    .describe('Optional filename to save the code to before execution'),
  args: z
    .string()
    .optional()
    .describe('Optional command-line arguments to pass to the shell script'),
});

/**
 * Tool for executing Shell scripts in a sandboxed environment
 *
 * Features:
 * - Execute shell scripts safely within a workspace directory
 * - Install dependencies if needed
 * - Maintain state between executions using memory
 * - Save scripts to files for more complex scenarios
 */
export class ShellCodeAct extends CodeActBase<typeof shellCodeActSchema.shape> {
  /**
   * Create a new ShellCodeAct tool
   *
   * @param workspacePath Path to the restricted workspace directory
   * @param options Configuration options
   */
  constructor(workspacePath: string, options: CodeActOptions = {}) {
    super(
      'shellCodeAct',
      'Execute shell scripts in a secure sandbox environment. The code will run in a restricted workspace with limited permissions. You can execute shell commands, save scripts, and automate system tasks. IMPORTANT: Always include echo statements to output results, otherwise they will not be visible to the user.',
      workspacePath,
      shellCodeActSchema,
      options,
    );
  }

  /**
   * Execute Shell code
   *
   * @param args Tool arguments
   * @returns Execution result
   */
  protected async execute(args: z.infer<typeof shellCodeActSchema>): Promise<string> {
    await this.initialize();

    try {
      // Install dependencies if requested
      if (args.installDependencies) {
        const installResult = await this.installDependencies(args.installDependencies);
        logger.info(`Installed dependencies: ${args.installDependencies}`);
      }

      // Determine how to execute the code
      let executionResult: string;
      const shellCmd = args.shellType || 'bash';

      // If saving to file
      if (args.saveToFile) {
        const filename = args.saveToFile.endsWith('.sh')
          ? args.saveToFile
          : `${args.saveToFile}.sh`;

        const filePath = path.join(this.workspacePath, filename);

        // Write code to file
        await this.writeFile(filename, args.code);
        logger.info(`Saved code to file: ${filePath}`);

        // Make the file executable
        await fs.promises.chmod(filePath, '755');

        // Print the code to console with syntax highlighting and filename
        this.printCode(args.code, 'bash', filename);

        // Prepare command line arguments
        const cmdArgs = args.args ? args.args.split(' ') : [];

        // Execute with spawn to capture real-time output
        executionResult = await this.executeWithRealTimeOutput(
          shellCmd,
          [filename, ...cmdArgs],
          filename,
        );
      } else {
        // Execute code via a temporary file
        const tempFilename = `temp_${Date.now()}.sh`;
        await this.writeFile(tempFilename, args.code);

        // Make the temp file executable
        const tempFilePath = path.join(this.workspacePath, tempFilename);
        await fs.promises.chmod(tempFilePath, '755');

        // Print the code to console with syntax highlighting
        this.printCode(args.code, 'bash', tempFilename);

        // Execute with spawn to capture real-time output
        executionResult = await this.executeWithRealTimeOutput(
          shellCmd,
          [tempFilename],
          tempFilename,
        );

        // Clean up temp file
        try {
          fs.unlinkSync(path.join(this.workspacePath, tempFilename));
        } catch (error) {
          logger.error(`Failed to remove temporary file: ${error}`);
        }
      }

      // Store in memory if requested
      if (args.memoryKey) {
        await this.memory.set(args.memoryKey, {
          code: args.code,
          result: executionResult,
          timestamp: new Date().toISOString(),
        });
        logger.info(`Stored execution result in memory key: ${args.memoryKey}`);
      }

      return executionResult;
    } catch (error) {
      logger.error(`Error executing Shell code: ${error}`);
      const errorResult = `Error executing Shell code: ${error}`;

      // Print error result with generic filename
      this.printResult(errorResult, false, 'shell_error.sh');

      return errorResult;
    }
  }

  /**
   * Execute a command with real-time output streaming
   *
   * @param command The command to execute
   * @param args Command arguments
   * @param displayName Display name for the execution (usually the filename)
   * @returns Full execution result as a string
   */
  private executeWithRealTimeOutput(
    command: string,
    args: string[],
    displayName: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let hasError = false;
      const startTime = Date.now();

      // Create indicator prefix for sandbox output
      const stdoutPrefix = this.options.printToConsole ? '[Sandbox] ' : '';

      // Spawn the process
      const proc = spawn(command, args, {
        cwd: this.workspacePath,
        shell: true,
      });

      // Handle stdout
      proc.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;

        // Forward to real-time output handler if available
        if (this.options.onOutputChunk) {
          this.options.onOutputChunk(stdoutPrefix + chunk);
        }
      });

      // Handle stderr
      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        hasError = true;

        // Forward to real-time output handler if available
        if (this.options.onOutputChunk) {
          this.options.onOutputChunk(stdoutPrefix + chunk, true);
        }
      });

      // Handle process completion
      proc.on('close', (code) => {
        const executionTime = Date.now() - startTime;

        // Format the complete result
        let result = `=== EXECUTION RESULT ===\n${stdout}\n\n`;
        if (stderr) {
          result += `=== ERRORS ===\n${stderr}\n\n`;
        }
        result += `=== EXECUTION TIME ===\n${executionTime}ms\n`;

        // Print the formatted result
        this.printResult(result, !hasError, displayName);

        // Resolve with the complete output
        resolve(result);
      });

      // Handle process errors
      proc.on('error', (err) => {
        reject(new Error(`Failed to execute ${command}: ${err.message}`));
      });

      // Set a timeout to prevent infinite hanging
      setTimeout(() => {
        proc.kill();
        reject(new Error('Execution timed out after 30 seconds'));
      }, 30000);
    });
  }

  /**
   * Install dependencies if needed (for shell, this is typically a no-op
   * but could be used to install specific tools via apt-get, brew, etc.)
   *
   * @param dependencies Comma-separated list of dependencies
   * @returns Installation result
   */
  protected async installDependencies(dependencies: string): Promise<string> {
    // For shell, we might not need this feature as much, but we could
    // implement it to install packages via apt-get, brew, etc. based on platform
    // For now, just log the request
    logger.info(`Shell dependency installation requested: ${dependencies}`);
    return `Shell dependencies are not automatically installed. You can use appropriate package managers in your shell scripts.`;
  }
}
