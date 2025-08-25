/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn, ChildProcess } from 'child_process';
// Simple logger implementation
function getLogger(name: string) {
  return {
    info: (message: string, ...args: any[]) => console.log(`[${name}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[${name}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[${name}] ${message}`, ...args),
    debug: (message: string, ...args: any[]) => console.debug(`[${name}] ${message}`, ...args),
  };
}

/**
 * CLI process monitoring events
 */
export interface CLIMonitorEvents {
  onStatusChange?: (status: CLIProcessStatus) => void;
  onOutput?: (output: string, type: 'stdout' | 'stderr') => void;
  onCompletion?: (result: any, exitCode: number) => void;
  onError?: (error: Error) => void;
  onAborted?: () => void;
}

/**
 * CLI process status
 */
export interface CLIProcessStatus {
  state: 'idle' | 'starting' | 'executing' | 'completed' | 'aborted' | 'error';
  pid?: number;
  startTime?: Date;
  endTime?: Date;
  exitCode?: number;
}

/**
 * Options for CLI process monitoring
 */
export interface CLIMonitorOptions {
  /** CLI command to execute */
  command: string;
  /** Command arguments */
  args: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Enable structured JSON output parsing */
  parseJsonOutput?: boolean;
}

/**
 * CLI Process Monitor - Fallback solution for agent state monitoring
 * 
 * This monitor spawns and monitors CLI processes, particularly useful for:
 * - Silent mode executions (one-shot scenarios)
 * - WebSocket connection failure fallback
 * - Legacy system compatibility
 * 
 * Note: This is a secondary solution. WebSocket monitoring is preferred for server mode.
 */
export class CLIProcessMonitor {
  private logger = getLogger('CLIProcessMonitor');
  private process: ChildProcess | null = null;
  private status: CLIProcessStatus = { state: 'idle' };
  private events: CLIMonitorEvents = {};
  private outputBuffer: string[] = [];
  private errorBuffer: string[] = [];
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(private options: CLIMonitorOptions) {}

  /**
   * Start monitoring the CLI process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Process is already running');
    }

    this.updateStatus({ state: 'starting', startTime: new Date() });

    try {
      this.process = spawn(this.options.command, this.options.args, {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.setupProcessHandlers();
      this.updateStatus({ 
        state: 'executing', 
        pid: this.process.pid,
        startTime: this.status.startTime 
      });

      // Set timeout if specified
      if (this.options.timeout) {
        this.timeoutId = setTimeout(() => {
          this.abort();
        }, this.options.timeout);
      }

      this.logger.info(`Started CLI process: ${this.options.command} ${this.options.args.join(' ')}`);

    } catch (error) {
      this.updateStatus({ state: 'error' });
      this.events.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    // Handle stdout
    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputBuffer.push(output);
      this.events.onOutput?.(output, 'stdout');
      this.parseStructuredOutput(output);
    });

    // Handle stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.errorBuffer.push(output);
      this.events.onOutput?.(output, 'stderr');
      this.parseStructuredOutput(output);
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.clearTimeout();
      
      const endTime = new Date();
      const finalState = signal === 'SIGTERM' || signal === 'SIGKILL' ? 'aborted' : 
                        code === 0 ? 'completed' : 'error';
      
      this.updateStatus({ 
        state: finalState, 
        exitCode: code ?? undefined,
        endTime 
      });

      // Parse final result
      const result = this.parseResult();
      
      if (finalState === 'aborted') {
        this.events.onAborted?.();
      } else {
        this.events.onCompletion?.(result, code ?? -1);
      }

      this.process = null;
      this.logger.info(`CLI process exited with code: ${code}, signal: ${signal}`);
    });

    // Handle process errors
    this.process.on('error', (error) => {
      this.clearTimeout();
      this.updateStatus({ state: 'error', endTime: new Date() });
      this.events.onError?.(error);
      this.logger.error('CLI process error:', String(error));
    });
  }

  /**
   * Parse structured output from CLI (JSON format)
   */
  private parseStructuredOutput(output: string): void {
    if (!this.options.parseJsonOutput) return;

    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        
        // Handle status events
        if (parsed.type === 'status' && parsed.data) {
          const statusData = parsed.data;
          this.updateStatus({
            ...this.status,
            state: this.mapCLIStatusToState(statusData.state)
          });
        }
        
        // Handle completion events
        if (parsed.type === 'completion' && parsed.data) {
          // Will be handled in process exit
        }
        
      } catch (error) {
        // Not JSON, ignore
      }
    }
  }

  /**
   * Map CLI status strings to monitor states
   */
  private mapCLIStatusToState(cliStatus: string): CLIProcessStatus['state'] {
    switch (cliStatus) {
      case 'idle': return 'idle';
      case 'executing': return 'executing';
      case 'aborted': return 'aborted';
      default: return 'executing';
    }
  }

  /**
   * Parse the final result from output buffers
   */
  private parseResult(): any {
    const allOutput = this.outputBuffer.join('');
    
    if (this.options.parseJsonOutput) {
      // Try to parse the last complete JSON object
      const lines = allOutput.split('\n').filter(line => line.trim());
      
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed.type === 'completion' && parsed.data) {
            return parsed.data;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }
    
    // Fallback to raw output
    return {
      stdout: allOutput,
      stderr: this.errorBuffer.join(''),
      exitCode: this.status.exitCode
    };
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(newStatus: Partial<CLIProcessStatus>): void {
    this.status = { ...this.status, ...newStatus };
    this.events.onStatusChange?.(this.status);
  }

  /**
   * Clear timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Abort the running process
   */
  abort(): boolean {
    if (!this.process || this.status.state !== 'executing') {
      return false;
    }

    this.logger.info('Aborting CLI process');
    
    // Try graceful termination first
    this.process.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }, 5000);

    return true;
  }

  /**
   * Register event callbacks
   */
  on(events: CLIMonitorEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * Remove specific event callback
   */
  off(eventType: keyof CLIMonitorEvents): void {
    delete this.events[eventType];
  }

  /**
   * Get current status
   */
  getStatus(): CLIProcessStatus {
    return { ...this.status };
  }

  /**
   * Get output buffers
   */
  getOutput(): { stdout: string[]; stderr: string[] } {
    return {
      stdout: [...this.outputBuffer],
      stderr: [...this.errorBuffer]
    };
  }

  /**
   * Check if process is running
   */
  isRunning(): boolean {
    return this.status.state === 'executing' && this.process !== null;
  }

  /**
   * Send input to the process (if stdin is available)
   */
  sendInput(input: string): boolean {
    if (!this.process || !this.process.stdin) {
      return false;
    }

    try {
      this.process.stdin.write(input + '\n');
      return true;
    } catch (error) {
      this.logger.error('Failed to send input to process:', String(error));
      return false;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearTimeout();
    
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
    }
    
    this.process = null;
    this.outputBuffer = [];
    this.errorBuffer = [];
    this.events = {};
  }
}
