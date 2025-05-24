/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import readline from 'readline';
import { Event, EventType } from '@multimodal/agent';
import { CodeHighlighter } from '../highlighter';
import chalk from 'chalk';
import boxen from 'boxen';
import figures from 'figures';
import logUpdate from 'log-update';
import stringWidth from 'string-width';
import cliTruncate from 'cli-truncate';
import ora from 'ora';

/**
 * CLI renderer configuration options
 */
export interface CLIRendererOptions {
  /** Whether to show full execution details */
  showDetails?: boolean;
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
  workspacePath: string;
  nodeEnabled?: boolean;
  pythonEnabled?: boolean;
  shellEnabled?: boolean;
  cleanupOnExit?: boolean;
  [key: string]: string | boolean | undefined;
}

/**
 * Enhanced CLI renderer for CodeAct
 * Provides a visually appealing CLI experience for code execution
 */
export class CLIRenderer {
  private options: CLIRendererOptions;
  private rl: readline.Interface;
  private hasShownDivider = false;
  private terminalWidth: number;
  private spinner: ora.Ora | null = null;
  private minimalSpinner: ora.Ora | null = null;
  public isProcessing = false;

  // For streaming response
  private streamedResponse = '';
  private isStreaming = false;
  private hasReceivedContent = false;
  private codeBlockBuffer = '';
  private inCodeBlock = false;
  private currentCodeLang = '';
  private sandboxOutputBuffer = '';
  private isCapturingOutput = false;
  private lastOutputTime = 0;

  constructor(readlineInterface: readline.Interface, options: CLIRendererOptions = {}) {
    this.rl = readlineInterface;
    this.options = {
      showDetails: true, // Always show details by default
      useColors: true,
      debug: false,
      ...options,
    };

    // Use provided terminal width or default to 80 characters
    this.terminalWidth = options.terminalWidth || process.stdout.columns || 80;
  }

  /**
   * Clear the current line
   */
  public clearLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  /**
   * Stop spinner animation
   */
  public stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }

    if (this.minimalSpinner) {
      this.minimalSpinner.stop();
      this.minimalSpinner = null;
    }

    this.isProcessing = false;
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
   * Start spinner animation
   */
  private startSpinner(message: string): void {
    this.stopSpinner();

    this.isProcessing = true;
    this.spinner = ora({
      text: chalk.dim(message),
      color: 'cyan',
    }).start();
  }

  /**
   * Start a minimal spinner for streaming
   * Unlike the full spinner, this doesn't take over the whole line
   */
  private startMinimalSpinner(): void {
    this.stopSpinner();

    // Create a more subtle spinner for streaming mode
    this.minimalSpinner = ora({
      text: '',
      color: 'cyan',
      spinner: 'dots',
      discardStdin: false,
    }).start();
  }

  /**
   * Print configuration info in a box
   */
  printConfigBox(configInfo: ConfigInfo): void {
    const lines = Object.entries(configInfo)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        return `${chalk.dim(formattedKey)}: ${chalk.white(String(value))}`;
      });

    const boxContent = lines.join('\n');

    console.log(
      boxen(boxContent, {
        title: chalk.cyan.bold('CodeAct CLI'),
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
      `${chalk.cyan.bold('Welcome to CodeAct')} ${chalk.white.bold('CLI')} ${chalk.gray('v0.1.0')}`,
    );
    console.log(
      chalk.dim('Enter text or code to send to the agent, or use commands (/help, /code, /exit)'),
    );
    console.log();
    this.printDivider(true, 'thick');
  }

  /**
   * Print system event information
   */
  printSystemEvent(level: 'info' | 'warning' | 'error', message: string): void {
    if (!this.options.debug && level === 'info') return;

    this.stopSpinner();
    this.clearLine();

    const prefix =
      level === 'info'
        ? chalk.blue(`${figures.info} `)
        : level === 'warning'
          ? chalk.yellow(`${figures.warning} `)
          : chalk.red(`${figures.cross} `);

    console.log(prefix + message);
  }

  /**
   * Start streaming assistant response
   * Prepares the UI for receiving a streamed response
   */
  startAssistantResponseStreaming(): void {
    this.stopSpinner();
    this.clearLine();
    this.streamedResponse = '';
    this.isStreaming = true;
    this.inCodeBlock = false;
    this.codeBlockBuffer = '';
    this.currentCodeLang = '';
    this.isCapturingOutput = false;
    this.sandboxOutputBuffer = '';

    // Print a prefix for the response
    process.stdout.write(chalk.bold.cyan(figures.arrowLeft) + ' ');

    // Start a minimal spinner to show activity
    this.startMinimalSpinner();
  }

  /**
   * Processes markdown code blocks in the streaming content
   * @param content The new content to process
   * @returns The processed content with highlighted code if applicable
   */
  private processStreamingContent(content: string): string {
    let processedContent = '';

    // Add the new content to the current buffer
    this.streamedResponse += content;

    // Check for code block markers
    const codeBlockStart = /```(\w*)\n/;
    const codeBlockEnd = /```\n?/;

    // Process the incoming content
    for (const char of content) {
      this.codeBlockBuffer += char;

      // Check for start of code block
      if (!this.inCodeBlock && this.codeBlockBuffer.match(codeBlockStart)) {
        this.inCodeBlock = true;
        const match = this.codeBlockBuffer.match(codeBlockStart);
        this.currentCodeLang = match?.[1] || 'plaintext';
        this.codeBlockBuffer = '';
        processedContent += `\n${chalk.cyan('```')}${chalk.yellow(this.currentCodeLang)}\n`;
        continue;
      }

      // Check for end of code block
      if (this.inCodeBlock && this.codeBlockBuffer.endsWith('```')) {
        this.inCodeBlock = false;
        // Remove the trailing ``` from buffer
        this.codeBlockBuffer = this.codeBlockBuffer.slice(0, -3);

        // Highlight the code
        if (this.codeBlockBuffer.length > 0) {
          const highlighted = CodeHighlighter.highlightCodeInline(
            this.codeBlockBuffer,
            this.currentCodeLang,
          );
          processedContent += highlighted;
        }

        // Add the closing marker
        processedContent += `\n${chalk.cyan('```')}\n`;

        this.codeBlockBuffer = '';
        this.currentCodeLang = '';
        continue;
      }

      // If we're not accumulating a potential marker, just output the character
      if (!this.inCodeBlock) {
        // Highlight inline code
        if (this.codeBlockBuffer === '`') {
          processedContent += chalk.yellow('`');
          this.codeBlockBuffer = '';
        } else if (this.codeBlockBuffer.length > 1 && this.codeBlockBuffer.endsWith('`')) {
          // Check for inline code ending
          const inlineCode = this.codeBlockBuffer.slice(0, -1);
          processedContent += chalk.yellow(`\`${inlineCode}\``);
          this.codeBlockBuffer = '';
        } else if (this.codeBlockBuffer.length > 20) {
          // If buffer is getting long without finding markers, flush it
          processedContent += this.codeBlockBuffer;
          this.codeBlockBuffer = '';
        }
      }
    }

    return processedContent;
  }

  /**
   * Update streaming assistant response
   * Appends new content and updates the display
   */
  updateAssistantResponseStreaming(content: string): void {
    if (!content) return;

    // Stop the spinner when we start receiving content
    if (!this.hasReceivedContent) {
      this.stopSpinner();
      this.hasReceivedContent = true;
    }

    // If we're capturing sandbox output, don't send to normal streaming output
    if (this.isCapturingOutput) {
      return;
    }

    // Process the content for code highlighting
    const processedContent = this.processStreamingContent(content);

    // Write the processed content
    if (processedContent) {
      process.stdout.write(processedContent);
    }
  }

  /**
   * Finalize the streaming response
   * Completes the streaming UI and adds formatting
   */
  finalizeAssistantResponseStreaming(): void {
    this.stopSpinner();
    this.isStreaming = false;

    // Flush any remaining content in the buffer
    if (this.codeBlockBuffer.length > 0) {
      process.stdout.write(this.codeBlockBuffer);
      this.codeBlockBuffer = '';
    }

    this.hasReceivedContent = false;
    this.inCodeBlock = false;
    this.isCapturingOutput = false;

    // Add a final newline for spacing
    console.log('\n');
    this.printDivider(true);
  }

  /**
   * Print user input
   */
  printUserInput(input: string): void {
    this.hasShownDivider = false;

    // Format multiline input for better visibility
    if (input.includes('\n')) {
      const lines = input.split('\n');
      console.log(chalk.bold.blue(figures.arrowRight) + ' ' + chalk.white.bold(lines[0]));

      for (let i = 1; i < lines.length; i++) {
        console.log(chalk.dim('  ' + lines[i]));
      }
    } else {
      console.log(chalk.bold.blue(figures.arrowRight) + ' ' + chalk.white.bold(input));
    }

    this.printDivider();
    this.isProcessing = true;
  }

  /**
   * Process events from agent for display
   */
  async processAgentEvent(event: Event): Promise<void> {
    switch (event.type) {
      case EventType.ASSISTANT_STREAMING_MESSAGE:
        if (typeof event.content === 'string') {
          this.updateAssistantResponseStreaming(event.content);
        }
        break;
      case EventType.TOOL_CALL:
        if (this.options.debug) {
          this.printSystemEvent('info', `Tool call: ${event.name}`);
        }
        break;
      case EventType.TOOL_RESULT:
        if (this.options.debug) {
          this.printSystemEvent('info', `Tool result: ${event.name}`);
        }
        break;
      case EventType.SYSTEM:
        if (event.level && event.message) {
          this.printSystemEvent(event.level as any, event.message);
        }
        break;
    }
  }

  /**
   * Update the prompt
   */
  updatePrompt(): void {
    this.stopSpinner();
    const promptSymbol = chalk.cyan.bold('> ');
    this.rl.setPrompt(promptSymbol);
    this.rl.prompt(true);
  }

  /**
   * Clean up resources when shutting down
   */
  cleanup(): void {
    this.stopSpinner();
  }

  /**
   * Handle real-time output from code execution
   * @param chunk The output chunk
   * @param isError Whether this is an error output
   */
  public handleSandboxOutput(chunk: string, isError = false): void {
    // Start capturing mode if this is the first sandbox output
    // and we're currently in streaming mode
    if (this.isStreaming && !this.isCapturingOutput) {
      this.isCapturingOutput = true;

      // Add a visual separator to indicate sandbox output
      process.stdout.write('\n' + chalk.cyan('┈'.repeat(40)) + '\n');
      process.stdout.write(chalk.cyan.bold('📦 Sandbox Output:\n\n'));
    }

    // Get current time for buffering
    const now = Date.now();

    // Add to the buffer
    this.sandboxOutputBuffer += chunk;

    // Determine if we should flush based on timing or content
    const shouldFlush =
      this.sandboxOutputBuffer.includes('\n') ||
      (now - this.lastOutputTime > 100 && this.sandboxOutputBuffer.length > 0);

    if (shouldFlush) {
      // Apply appropriate styling to the output
      const styledChunk = isError
        ? chalk.red(this.sandboxOutputBuffer)
        : chalk.white(this.sandboxOutputBuffer);

      // Write to stdout directly
      process.stdout.write(styledChunk);

      // Reset buffer and update timestamp
      this.sandboxOutputBuffer = '';
      this.lastOutputTime = now;
    }
  }
}
