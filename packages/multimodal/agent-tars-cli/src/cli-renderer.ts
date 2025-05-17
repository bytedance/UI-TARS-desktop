/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import readline from 'readline';
import { EventType, Event } from '@agent-tars/core';

// Utility for terminal colors and styles
const styles = {
  // Reset
  reset: '\x1b[0m',
  // Text styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
};

// Box drawing characters
const box = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

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
 * Enhanced CLI renderer for Agent TARS
 * Provides a cleaner, more visually appealing CLI experience
 */
export class CLIRenderer {
  private options: CLIRendererOptions;
  private rl: readline.Interface;
  private hasShownDivider = false;
  private terminalWidth: number;

  constructor(readlineInterface: readline.Interface, options: CLIRendererOptions = {}) {
    this.rl = readlineInterface;
    this.options = {
      showTools: false,
      showSystemEvents: false,
      useColors: true,
      ...options,
    };

    // Use provided terminal width or default to 80 characters
    this.terminalWidth = options.terminalWidth || process.stdout.columns || 80;
  }

  /**
   * Apply style formatting to text
   */
  private style(text: string, ...styleNames: (keyof typeof styles)[]): string {
    if (!this.options.useColors) return text;

    const stylesCodes = styleNames.map((name) => styles[name]).join('');
    return stylesCodes + text + styles.reset;
  }

  /**
   * Clear the current line
   */
  private clearLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  /**
   * Render a box with the given content
   */
  private renderBox(lines: string[], boxTitle?: string): string[] {
    // Calculate the width of the box based on the longest line
    const contentWidth = Math.min(
      this.terminalWidth - 4, // Leave room for borders and padding
      Math.max(...lines.map((line) => line.length)) + 4, // Add padding on both sides
    );

    // Create top border with optional title
    let topBorder = box.topLeft + box.horizontal.repeat(contentWidth - 2) + box.topRight;
    if (boxTitle) {
      const titleText = ` ${boxTitle} `;
      const titlePos = Math.floor((contentWidth - titleText.length) / 2);
      topBorder =
        box.topLeft +
        box.horizontal.repeat(titlePos) +
        titleText +
        box.horizontal.repeat(contentWidth - 2 - titlePos - titleText.length) +
        box.topRight;
    }

    // Create content lines with padding
    const paddedLines = lines.map((line) => {
      // Trim the line if it's too long
      const trimmedLine =
        line.length > contentWidth - 4 ? line.substring(0, contentWidth - 7) + '...' : line;

      return (
        box.vertical +
        ' ' +
        this.style(trimmedLine.padEnd(contentWidth - 4), 'dim') +
        ' ' +
        box.vertical
      );
    });

    // Create bottom border
    const bottomBorder = box.bottomLeft + box.horizontal.repeat(contentWidth - 2) + box.bottomRight;

    return [topBorder, ...paddedLines, bottomBorder];
  }

  /**
   * Print configuration info in a box
   */
  printConfigBox(config: ConfigInfo): void {
    const title = this.style('Agent TARS Config', 'bold', 'cyan');

    const lines = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        return `${formattedKey}: ${value}`;
      });

    const boxLines = this.renderBox(lines, title);
    boxLines.forEach((line) => console.log(line));
    console.log(''); // Add an extra line after the box
  }

  /**
   * Print a divider line
   */
  printDivider(forceDisplay = false): void {
    if (this.hasShownDivider && !forceDisplay) return;

    this.clearLine();
    const divider = '─'.repeat(Math.min(this.terminalWidth - 2, 60));
    console.log(this.style(divider, 'gray'));
    this.hasShownDivider = true;
  }

  /**
   * Print welcome message
   */
  printWelcome(): void {
    console.log(
      this.style('\nAgent TARS is ready!', 'bold', 'green') +
        ' ' +
        this.style('Type your query or /exit to quit.\n', 'dim'),
    );
    this.printDivider(true);
  }

  /**
   * Print user input
   */
  printUserInput(input: string): void {
    this.hasShownDivider = false;
    console.log(this.style('You: ', 'bold', 'blue') + input);
    this.printDivider();
  }

  /**
   * Print assistant response
   */
  printAssistantResponse(response: string): void {
    this.clearLine();
    this.hasShownDivider = false;
    console.log(this.style('Agent TARS: ', 'bold', 'green') + response);
    this.printDivider();
  }

  /**
   * Print tool execution
   */
  printToolExecution(name: string, args: Record<string, unknown>): void {
    if (!this.options.showTools) return;

    this.clearLine();
    const formattedArgs = JSON.stringify(args);
    console.log(
      this.style('🔧 Tool: ', 'cyan') +
        this.style(name, 'bold') +
        this.style(` ${formattedArgs}`, 'dim'),
    );
  }

  /**
   * Print tool result
   */
  printToolResult(name: string, result: unknown, error?: string): void {
    if (!this.options.showTools) return;

    this.clearLine();
    if (error) {
      console.log(this.style('❌ Tool Error: ', 'red') + this.style(name, 'bold') + ' - ' + error);
    } else {
      // Format and possibly truncate result for display
      const content =
        typeof result === 'string'
          ? result.length > 100
            ? `${result.substring(0, 100)}...`
            : result
          : '[Complex Result]';

      console.log(
        this.style('✅ Tool Result: ', 'green') + this.style(name, 'bold') + ' - ' + content,
      );
    }
  }

  /**
   * Print system event
   */
  printSystemEvent(level: 'info' | 'warning' | 'error', message: string): void {
    if (!this.options.showSystemEvents) return;

    this.clearLine();
    const prefix =
      level === 'info'
        ? this.style('ℹ️ Info: ', 'blue')
        : level === 'warning'
          ? this.style('⚠️ Warning: ', 'yellow')
          : this.style('❌ Error: ', 'red');

    console.log(prefix + message);
  }

  /**
   * Print processing indicator
   */
  printProcessing(): void {
    this.clearLine();
    console.log(this.style('Agent TARS is thinking...', 'italic', 'magenta'));
  }

  /**
   * Process agent events for display
   */
  processAgentEvent(event: Event): void {
    switch (event.type) {
      case EventType.TOOL_CALL:
        this.printToolExecution(event.name, event.arguments);
        break;
      case EventType.TOOL_RESULT:
        this.printToolResult(event.name, event.content, event.error);
        break;
      case EventType.SYSTEM:
        this.printSystemEvent(event.level, event.message);
        break;
    }
  }

  /**
   * Update the prompt with the specified text
   */
  updatePrompt(text?: string): void {
    const basePrompt = this.style('❯ ', 'bold');
    this.rl.setPrompt(text ? `${text}${basePrompt}` : basePrompt);
    this.rl.prompt(true);
  }
}
