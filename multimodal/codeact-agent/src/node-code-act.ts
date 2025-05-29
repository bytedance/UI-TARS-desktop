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

// Node-specific parameters schema
const nodeCodeActSchema = baseCodeActSchema.extend({
  nodeVersion: z
    .enum(['node', 'nodejs'])
    .optional()
    .describe('Node interpreter to use (defaults to "node")'),
  saveToFile: z
    .string()
    .optional()
    .describe('Optional filename to save the code to before execution'),
  args: z
    .string()
    .optional()
    .describe('Optional command-line arguments to pass to the Node.js script'),
  esm: z.boolean().optional().describe('Use ECMAScript modules (true) or CommonJS (false)'),
});

/**
 * Tool for executing Node.js code in a sandboxed environment
 *
 * Features:
 * - Execute JavaScript/TypeScript code safely within a workspace directory
 * - Install npm dependencies
 * - Maintain state between executions using memory
 * - Support both ESM and CommonJS modules
 */
export class NodeCodeAct extends CodeActBase<typeof nodeCodeActSchema.shape> {
  /**
   * Create a new NodeCodeAct tool
   *
   * @param workspacePath Path to the restricted workspace directory
   * @param options Configuration options
   */
  constructor(workspacePath: string, options: CodeActOptions = {}) {
    super(
      'nodeCodeAct',
      'Execute Node.js code in a secure sandbox environment. The code will run in a restricted workspace with limited permissions. You can install npm dependencies, save files, and execute JavaScript/TypeScript. IMPORTANT: Always include console.log() statements to print results, otherwise they will not be visible to the user.',
      workspacePath,
      nodeCodeActSchema,
      options,
    );
  }

  /**
   * Execute Node.js code
   *
   * @param args Tool arguments
   * @returns Execution result
   */
  protected async execute(args: z.infer<typeof nodeCodeActSchema>): Promise<string> {
    await this.initialize();

    try {
      // Initialize package.json if it doesn't exist
      await this.ensurePackageJson(args.esm === true);

      // Install dependencies if requested
      if (args.installDependencies) {
        const installResult = await this.installDependencies(args.installDependencies);
        logger.info(`Installed dependencies: ${args.installDependencies}`);
      }

      // Determine how to execute the code
      let executionResult: string;
      const nodeCmd = args.nodeVersion || 'node';
      const useEsm = args.esm === true;

      // If saving to file
      if (args.saveToFile) {
        const filename =
          args.saveToFile.endsWith('.js') || args.saveToFile.endsWith('.ts')
            ? args.saveToFile
            : `${args.saveToFile}.js`;

        const filePath = path.join(this.workspacePath, filename);

        // Write code to file
        await this.writeFile(filename, args.code);
        logger.info(`Saved code to file: ${filePath}`);

        // Print the code to console with syntax highlighting and filename
        this.printCode(args.code, 'javascript', filename);

        // Prepare command line arguments
        const cmdArgs = args.args ? args.args.split(' ') : [];

        // Execute with spawn to capture real-time output
        executionResult = await this.executeWithRealTimeOutput(
          nodeCmd,
          [filename, ...cmdArgs],
          filename,
        );
      } else {
        // Generate a temporary filename for display purposes
        const tempFileName = `node_script_${Date.now()}.js`;

        // For direct execution, we'll save to a temporary file and execute it
        // This gives us better real-time output support than eval
        await this.writeFile(tempFileName, args.code);

        // Print the code to console with syntax highlighting
        this.printCode(args.code, 'javascript', tempFileName);

        // Execute with spawn to capture real-time output
        executionResult = await this.executeWithRealTimeOutput(
          nodeCmd,
          [tempFileName],
          tempFileName,
        );

        // Clean up the temporary file
        try {
          fs.unlinkSync(path.join(this.workspacePath, tempFileName));
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
      logger.error(`Error executing Node.js code: ${error}`);
      const errorResult = `Error executing Node.js code: ${error}`;

      // Print error result with generic filename
      this.printResult(errorResult, false, 'node_error.js');

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
   * Ensure a package.json file exists in the workspace
   *
   * @param useEsm Whether to configure package.json for ESM
   */
  private async ensurePackageJson(useEsm = false): Promise<void> {
    const packageJsonPath = path.join(this.workspacePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      const defaultPackageJson = {
        name: 'code-act-workspace',
        version: '1.0.0',
        description: 'Node.js workspace for CodeAct',
        private: true,
        type: useEsm ? 'module' : 'commonjs',
      };

      await fs.promises.writeFile(
        packageJsonPath,
        JSON.stringify(defaultPackageJson, null, 2),
        'utf-8',
      );

      logger.info(
        `Created default package.json in workspace (type: ${useEsm ? 'module' : 'commonjs'})`,
      );
    } else {
      // Update existing package.json if needed to match ESM setting
      try {
        const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);

        if (packageJson.type !== (useEsm ? 'module' : 'commonjs')) {
          packageJson.type = useEsm ? 'module' : 'commonjs';
          await fs.promises.writeFile(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2),
            'utf-8',
          );
          logger.info(`Updated package.json type to ${useEsm ? 'module' : 'commonjs'}`);
        }
      } catch (error) {
        logger.error(`Error updating package.json: ${error}`);
      }
    }
  }

  /**
   * Install Node.js dependencies using npm
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
        .filter((dep) => /^[a-zA-Z0-9_\-\.\/]+[@a-zA-Z0-9_\-\.\/=<>~^]*$/.test(dep)); // Basic security check

      if (deps.length === 0) {
        return 'No valid dependencies specified';
      }

      // Install dependencies
      const { stdout, stderr } = await execAsync(
        `cd "${this.workspacePath}" && npm install ${deps.join(' ')}`,
        { maxBuffer: 1024 * 1024 },
      );

      return `Dependencies installed:\n${stdout}\n${stderr}`;
    } catch (error) {
      logger.error(`Error installing Node.js dependencies: ${error}`);
      return `Error installing Node.js dependencies: ${error}`;
    }
  }
}
