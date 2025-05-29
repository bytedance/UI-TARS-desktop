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

// Python-specific parameters schema
const pythonCodeActSchema = baseCodeActSchema.extend({
  pythonVersion: z
    .enum(['python', 'python3'])
    .optional()
    .describe('Python interpreter to use (python or python3)'),
  saveToFile: z
    .string()
    .optional()
    .describe('Optional filename to save the code to before execution'),
  args: z
    .string()
    .optional()
    .describe('Optional command-line arguments to pass to the Python script'),
});

/**
 * Tool for executing Python code in a sandboxed environment
 *
 * Features:
 * - Execute Python code safely within a workspace directory
 * - Install dependencies using pip
 * - Maintain state between executions using memory
 * - Save code to files for more complex scenarios
 */
export class PythonCodeAct extends CodeActBase<typeof pythonCodeActSchema.shape> {
  private sitePackagesDir: string;

  /**
   * Create a new PythonCodeAct tool
   *
   * @param workspacePath Path to the restricted workspace directory
   * @param options Configuration options
   */
  constructor(workspacePath: string, options: CodeActOptions = {}) {
    super(
      'pythonCodeAct',
      'Execute Python code in a secure sandbox environment. The code will run in a restricted workspace with limited permissions. You can install dependencies, save files, and execute Python scripts. IMPORTANT: Always include print() statements to output results, otherwise they will not be visible to the user.',
      workspacePath,
      pythonCodeActSchema,
      options,
    );

    // Create site-packages directory in workspace for dependencies
    this.sitePackagesDir = path.join(this.workspacePath, 'site-packages');
    if (!fs.existsSync(this.sitePackagesDir)) {
      fs.mkdirSync(this.sitePackagesDir, { recursive: true });
    }
  }

  /**
   * Execute Python code
   *
   * @param args Tool arguments
   * @returns Execution result
   */
  protected async execute(args: z.infer<typeof pythonCodeActSchema>): Promise<string> {
    await this.initialize();

    try {
      // Install dependencies if requested
      if (args.installDependencies) {
        const installResult = await this.installDependencies(args.installDependencies);
        logger.info(`Installed dependencies: ${args.installDependencies}`);
      }

      // Determine how to execute the code
      let executionResult: string;
      const pythonCmd = args.pythonVersion || 'python3';

      // If saving to file
      if (args.saveToFile) {
        const filename = args.saveToFile.endsWith('.py')
          ? args.saveToFile
          : `${args.saveToFile}.py`;

        const filePath = path.join(this.workspacePath, filename);

        // Write code to file
        await this.writeFile(filename, args.code);
        logger.info(`Saved code to file: ${filePath}`);

        // Print the code to console with syntax highlighting and filename
        this.printCode(args.code, 'python', filename);

        // Prepare command line arguments
        const cmdArgs = args.args ? args.args.split(' ') : [];

        // Execute with spawn to capture real-time output
        executionResult = await this.executeWithRealTimeOutput(
          pythonCmd,
          [filename, ...cmdArgs],
          filename,
        );
      } else {
        // Execute code via a temporary file
        const tempFilename = `temp_${Date.now()}.py`;
        await this.writeFile(tempFilename, args.code);

        // Print the code to console with syntax highlighting and filename
        this.printCode(args.code, 'python', tempFilename);

        // Execute with spawn to capture real-time output
        executionResult = await this.executeWithRealTimeOutput(
          pythonCmd,
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
      logger.error(`Error executing Python code: ${error}`);
      const errorResult = `Error executing Python code: ${error}`;

      // Print error result with generic filename
      this.printResult(errorResult, false, 'python_error.py');

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

      // Set PYTHONPATH to include our site-packages directory
      const env = {
        ...process.env,
        PYTHONPATH:
          this.sitePackagesDir +
          (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ''),
      };

      // Spawn the process
      const proc = spawn(command, args, {
        cwd: this.workspacePath,
        shell: true,
        env: env,
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
   * Install Python dependencies using pip
   *
   * @param dependencies Comma-separated list of dependencies
   * @returns Installation result
   */
  protected async installDependencies(dependencies: string): Promise<string> {
    try {
      // Parse and sanitize dependencies
      const deps = dependencies
        .split(',')
        .map((dep) => dep.trim())
        .filter((dep) => /^[a-zA-Z0-9_\-\.]+[a-zA-Z0-9_\-\.=<>]*$/.test(dep)); // Basic security check

      if (deps.length === 0) {
        return 'No valid dependencies specified';
      }

      // Install dependencies to workspace site-packages directory
      const { stdout, stderr } = await execAsync(
        `pip install --target="${this.sitePackagesDir}" ${deps.join(' ')}`,
        {
          maxBuffer: 1024 * 1024,
        },
      );

      return `Dependencies installed:\n${stdout}\n${stderr}`;
    } catch (error) {
      logger.error(`Error installing Python dependencies: ${error}`);
      return `Error installing Python dependencies: ${error}`;
    }
  }
}
