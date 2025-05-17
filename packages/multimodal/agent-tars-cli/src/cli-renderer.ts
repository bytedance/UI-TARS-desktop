/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import readline from 'readline';
import { EventType, Event } from '@agent-tars/core';
import chalk from 'chalk';
import boxen from 'boxen';
import logUpdate from 'log-update';
import stringWidth from 'string-width';
import figures from 'figures';
import cliTruncate from 'cli-truncate';
import ansiEscapes from 'ansi-escapes';

/**
 * CLI renderer configuration options
 */
export interface CLIRendererOptions {
  /** Whether to show tool execution details */
  showTools?: boolean;
  /** Whether to show system events */
  showSystemEvents?: boolean;
  /** Whether to use colors in output */
  useColors?: boolean;
  /** Terminal width */
  terminalWidth?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Configuration info to be displayed in the config box
 */
export interface ConfigInfo {
  sessionId: string;
  workdir?: string;
  model?: string;
  provider?: string;
  [key: string]: string | undefined;
}

/**
 * Step tracking for visualizing agent workflow
 */
interface StepInfo {
  id: string;
  type: 'thinking' | 'tool' | 'result';
  title: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  content?: string;
  details?: Record<string, unknown>;
  startTime: number;
  endTime?: number;
}

/**
 * Enhanced CLI renderer for Agent TARS
 * Provides a cleaner, more visually appealing CLI experience
 */
export class CLIRenderer {
  private options: CLIRendererOptions;
  private rl: readline.Interface;
  private hasShownDivider = false;
  private terminalWidth: number;
  private steps: StepInfo[] = [];
  private thinkingMessage = '';
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private spinnerIndex = 0;
  private spinnerInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private stepCount = 0;
  private currentToolCallId: string | null = null;
  private activeTools: Record<string, StepInfo> = {};
  private progressShown = false;

  constructor(readlineInterface: readline.Interface, options: CLIRendererOptions = {}) {
    this.rl = readlineInterface;
    this.options = {
      showTools: false,
      showSystemEvents: false,
      useColors: true,
      debug: process.env.AGENT_DEBUG === 'true',
      ...options,
    };

    // Use provided terminal width or default to 80 characters
    this.terminalWidth = options.terminalWidth || process.stdout.columns || 80;
  }

  /**
   * Clear the current line
   */
  private clearLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  /**
   * Format text to fit within terminal width
   */
  private formatText(text: string, indent = 0, maxWidth?: number): string {
    const width = maxWidth || this.terminalWidth - indent - 2;
    if (stringWidth(text) <= width) return text;

    return cliTruncate(text, width, { position: 'end' });
  }

  /**
   * Format object for display
   */
  private formatObject(obj: unknown): string {
    if (obj === null || obj === undefined) {
      return String(obj);
    }

    if (typeof obj === 'string') {
      return obj;
    }

    try {
      if (typeof obj === 'object') {
        // Try to extract meaningful content from common result patterns
        const objAny = obj as any;

        // Handle array of objects specially
        if (Array.isArray(obj)) {
          // For short arrays, show full content
          if (obj.length <= 3) {
            return JSON.stringify(obj);
          }

          // For longer arrays, show length and sample
          return `[${obj.length} items] ${JSON.stringify(obj.slice(0, 2))}...`;
        }

        // Handle common result patterns
        if (objAny.text) return objAny.text;
        if (objAny.content) return objAny.content;
        if (objAny.result) return String(objAny.result);
        if (objAny.message) return objAny.message;
        if (objAny.data) return this.formatObject(objAny.data);

        // Special handling for object with type and text fields (common in tool results)
        if (objAny.type === 'text' && objAny.text) {
          return objAny.text;
        }

        // Fall back to stringified object with intelligent truncation
        const jsonString = JSON.stringify(obj);
        if (jsonString.length > 100) {
          return jsonString.substring(0, 97) + '...';
        }
        return jsonString;
      }

      return String(obj);
    } catch (err) {
      return '[Complex Object]';
    }
  }

  /**
   * Start spinner animation
   */
  private startSpinner(message: string): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
    }

    this.isProcessing = true;
    this.spinnerIndex = 0;
    let dots = '';

    this.spinnerInterval = setInterval(() => {
      const frame = this.spinnerFrames[this.spinnerIndex];
      this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;

      dots = dots.length < 3 ? dots + '.' : '';

      logUpdate(`${chalk.cyan(frame)} ${chalk.dim(message)}${dots}`);
    }, 80);
  }

  /**
   * Stop spinner animation
   */
  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
      logUpdate.clear();
      this.isProcessing = false;
    }
  }

  /**
   * Print configuration info in a box
   */
  printConfigBox(config: ConfigInfo): void {
    const lines = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        return `${chalk.dim(formattedKey)}: ${chalk.white(value)}`;
      });

    const boxContent = lines.join('\n');

    console.log(
      boxen(boxContent, {
        title: chalk.cyan.bold('Agent TARS'),
        titleAlignment: 'center',
        padding: 1,
        borderColor: 'blue',
        borderStyle: 'round',
        width: Math.min(this.terminalWidth - 4, 80),
        dimBorder: true,
      }),
    );
  }

  /**
   * Print a divider line
   */
  printDivider(forceDisplay = false, style: 'normal' | 'thin' | 'thick' = 'normal'): void {
    if (this.hasShownDivider && !forceDisplay) return;

    this.clearLine();

    const char = style === 'thick' ? '━' : style === 'thin' ? '─' : '─';
    const divider = char.repeat(Math.min(this.terminalWidth - 2, 60));

    console.log(style === 'thick' ? chalk.cyan(divider) : chalk.gray(divider));
    this.hasShownDivider = true;
  }

  /**
   * Print welcome message
   */
  printWelcome(): void {
    console.log();
    console.log(
      `${chalk.cyan.bold('Welcome to Agent TARS')} ${chalk.white.bold('CLI')} ${chalk.gray(
        'v' + process.env.npm_package_version || '0.0.0',
      )}`,
    );
    console.log(chalk.dim('Type your query or commands (/help, /exit)'));
    console.log();
    this.printDivider(true, 'thick');
  }

  /**
   * Print user input
   */
  printUserInput(input: string): void {
    this.hasShownDivider = false;
    console.log(chalk.bold.blue(figures.arrowRight) + ' ' + chalk.white.bold(input));
    this.printDivider();

    // Reset steps for new interaction
    this.steps = [];
    this.activeTools = {};
    this.stepCount = 0;
    this.isProcessing = true;
    this.progressShown = false;
  }

  /**
   * Print assistant response
   */
  printAssistantResponse(response: string): void {
    this.stopSpinner();
    this.clearLine();
    this.hasShownDivider = false;

    // Render completed steps if we have any
    if (this.steps.length > 0) {
      this.renderCompletedSteps();
    }

    console.log();
    console.log(chalk.bold.cyan(figures.arrowLeft) + ' ' + response);
    console.log();
    this.printDivider(true);

    this.isProcessing = false;
  }

  /**
   * Create a new step or update an existing one
   */
  private createOrUpdateStep(
    type: StepInfo['type'],
    title: string,
    status: StepInfo['status'] = 'pending',
    content?: string,
    details?: Record<string, unknown>,
    id?: string,
  ): StepInfo {
    // If ID is provided, try to update existing step
    if (id) {
      const existingStep = this.steps.find((step) => step.id === id);
      if (existingStep) {
        existingStep.status = status;
        if (content) existingStep.content = content;
        if (details) existingStep.details = { ...(existingStep.details || {}), ...details };
        if (status === 'complete' || status === 'error') existingStep.endTime = Date.now();
        return existingStep;
      }
    }

    // Create a new step
    const step: StepInfo = {
      id: id || `step-${++this.stepCount}`,
      type,
      title,
      status,
      content,
      details,
      startTime: Date.now(),
    };

    this.steps.push(step);
    return step;
  }

  /**
   * Render progress of active steps in real-time
   */
  private renderStepsProgress(): void {
    // Start by clearing any existing spinner
    this.stopSpinner();

    // Get list of active tools
    const activeToolIds = Object.keys(this.activeTools);

    if (activeToolIds.length === 0) {
      // If no active tools, but we're still processing, start the thinking spinner
      if (this.isProcessing) {
        this.startSpinner('Agent TARS is thinking...');
      }
      return;
    }

    // Temporarily show progress update
    console.log();
    console.log(chalk.dim(`${figures.pointer} Working on ${activeToolIds.length} steps:`));

    activeToolIds.forEach((id) => {
      const tool = this.activeTools[id];
      const indicator = chalk.cyan(figures.play);
      console.log(`  ${indicator} ${chalk.bold(tool.title)}${chalk.dim(' (in progress...)')}`);
    });

    // Mark that we've shown the progress so we don't show it repeatedly
    this.progressShown = true;
  }

  /**
   * Render all completed steps
   */
  private renderCompletedSteps(): void {
    // Group steps by their type for better organization
    const tools = this.steps.filter((s) => s.type === 'tool' && s.status === 'complete');
    const results = this.steps.filter((s) => s.type === 'result');

    // Show a summary
    if (tools.length > 0) {
      console.log();
      console.log(chalk.dim(`${figures.pointer} Completed ${tools.length} steps:`));

      // Render each tool and its result together
      tools.forEach((toolStep, index) => {
        const resultStep = results.find((r) => r.id.includes(toolStep.id));

        // Tool
        console.log(`  ${chalk.cyan(figures.play)} ${chalk.bold(toolStep.title)}`);

        // Arguments if debug mode
        if (this.options.debug && toolStep.details) {
          const args = JSON.stringify(toolStep.details);
          if (args.length > 80) {
            console.log(`    ${chalk.dim('Args:')} ${this.formatText(args, 10, 70)}`);
          } else {
            console.log(`    ${chalk.dim('Args:')} ${args}`);
          }
        }

        // Result
        if (resultStep) {
          const status =
            resultStep.status === 'error' ? chalk.red(figures.cross) : chalk.green(figures.tick);

          const duration =
            resultStep.endTime && toolStep.startTime
              ? ` ${chalk.gray(`(${Math.round((resultStep.endTime - toolStep.startTime) / 100) / 10}s)`)}`
              : '';

          // Format the result content - properly handling the [object Object] issue
          let content = resultStep.content ? this.formatObject(resultStep.content) : '';

          // Ensure content displays properly
          if (content.length > 120) {
            content = this.formatText(content, 6, 120) + chalk.dim(' (truncated)');
          }

          console.log(`    ${status} ${chalk.dim('Result:')} ${content}${duration}`);
        }

        // Add spacing between tool pairs except for the last one
        if (index < tools.length - 1) console.log();
      });
    }
  }

  /**
   * Print tool execution
   */
  printToolExecution(id: string, name: string, args: Record<string, unknown>): void {
    this.stopSpinner();

    // Create a new tool step
    this.currentToolCallId = id;
    const step = this.createOrUpdateStep('tool', name, 'active', undefined, args, id);

    // Add to active tools tracking
    this.activeTools[id] = step;

    // Reset progress shown flag so we show the updated progress
    this.progressShown = false;

    // Show tool execution details right away if showTools is enabled
    if (this.options.showTools || this.options.debug) {
      this.clearLine();
      console.log(chalk.cyan(`${figures.pointer} Executing: ${chalk.bold(name)}`));

      if (this.options.debug) {
        // In debug mode, show arguments
        console.log(chalk.dim(`  Args: ${JSON.stringify(args)}`));
      }
    } else if (!this.progressShown) {
      // Render step progress
      this.renderStepsProgress();
    }
  }

  /**
   * Print tool result
   */
  printToolResult(id: string, name: string, result: unknown, error?: string): void {
    this.stopSpinner();

    // Remove from active tools
    delete this.activeTools[id];

    // Mark the tool step as complete if it exists
    const toolStep = this.steps.find((s) => s.id === id);
    if (toolStep) {
      toolStep.status = 'complete';
      toolStep.endTime = Date.now();
    }

    // Create a result step linked to the tool
    const resultId = `${id}-result`;
    const status = error ? 'error' : 'complete';
    const formattedResult = this.formatObject(result);

    this.createOrUpdateStep(
      'result',
      `${name} result`,
      status,
      error || formattedResult,
      undefined,
      resultId,
    );

    // Show immediate feedback for tool completion
    if (this.options.showTools || this.options.debug) {
      this.clearLine();
      if (error) {
        console.log(chalk.red(`${figures.cross} ${chalk.bold(name)} failed: ${error}`));
      } else {
        console.log(chalk.green(`${figures.tick} ${chalk.bold(name)} completed`));

        // Format the result for display
        const displayResult = formattedResult;

        if (displayResult.length > 100) {
          console.log(chalk.dim(`  Result: ${this.formatText(displayResult, 10, 100)} [...]`));
        } else {
          console.log(chalk.dim(`  Result: ${displayResult}`));
        }
      }
    } else if (Object.keys(this.activeTools).length === 0) {
      // If there are no more active tools, show all completed steps
      this.renderCompletedSteps();
    }

    // Reset current tool call ID
    this.currentToolCallId = null;

    // If we still have active tools, update their progress
    if (Object.keys(this.activeTools).length > 0) {
      this.renderStepsProgress();
    } else if (this.isProcessing) {
      // Resume thinking spinner if we're still processing but no active tools
      this.startSpinner('Agent TARS is thinking...');
    }
  }

  /**
   * Print system event
   */
  printSystemEvent(level: 'info' | 'warning' | 'error', message: string): void {
    if (!this.options.showSystemEvents && !this.options.debug) return;

    this.stopSpinner();
    this.clearLine();

    const prefix =
      level === 'info'
        ? chalk.blue(`${figures.info} `)
        : level === 'warning'
          ? chalk.yellow(`${figures.warning} `)
          : chalk.red(`${figures.cross} `);

    console.log(prefix + message);

    // Resume progress display
    if (Object.keys(this.activeTools).length > 0) {
      this.renderStepsProgress();
    } else if (this.isProcessing) {
      this.startSpinner('Agent TARS is thinking...');
    }
  }

  /**
   * Update thinking status
   */
  updateThinking(content: string): void {
    this.stopSpinner();

    // Create or update thinking step
    const existingStep = this.steps.find((s) => s.type === 'thinking' && s.status === 'active');

    if (existingStep) {
      existingStep.content = content;
    } else {
      this.createOrUpdateStep('thinking', 'Reasoning', 'active', content);
    }

    // If in debug mode, show thinking content
    if (this.options.debug) {
      this.clearLine();
      console.log(chalk.cyan(`${figures.arrowDown} Thinking: ${content}`));
    }

    // Resume spinner or show active tools
    if (Object.keys(this.activeTools).length > 0) {
      this.renderStepsProgress();
    } else if (this.isProcessing) {
      this.startSpinner(`Thinking: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
    }
  }

  /**
   * Process agent events for display
   */
  processAgentEvent(event: Event): void {
    switch (event.type) {
      case EventType.TOOL_CALL:
        this.printToolExecution(event.toolCallId, event.name, event.arguments);
        break;
      case EventType.TOOL_RESULT:
        this.printToolResult(event.toolCallId, event.name, event.content, event.error);
        break;
      case EventType.SYSTEM:
        this.printSystemEvent(event.level, event.message);
        break;
      case EventType.ASSISTANT_THINKING_MESSAGE:
        // Complete any active thinking steps if this is a final message
        if (event.isComplete) {
          const thinkingStep = this.steps.find(
            (s) => s.type === 'thinking' && s.status === 'active',
          );
          if (thinkingStep) {
            thinkingStep.status = 'complete';
            thinkingStep.endTime = Date.now();
          }
        }

        this.updateThinking(event.content);
        break;
      case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
        this.updateThinking(event.content);
        break;
    }
  }

  /**
   * Update the prompt with the specified text
   */
  updatePrompt(text?: string): void {
    this.stopSpinner();

    const promptSymbol = chalk.cyan.bold('❯ ');
    this.rl.setPrompt(text ? `${text}${promptSymbol}` : promptSymbol);
    this.rl.prompt(true);
  }

  /**
   * Clean up resources when shutting down
   */
  cleanup(): void {
    this.stopSpinner();
  }
}
