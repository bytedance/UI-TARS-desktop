/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import highlight from 'cli-highlight';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Enhanced code highlighter for terminal output
 *
 * This utility provides terminal-based syntax highlighting and formatting
 * for code execution and results with file information and visual enhancements.
 */
export class CodeHighlighter {
  /**
   * Maps input language to the correct highlight.js language identifier
   *
   * @param language The input language name
   * @returns The correct language identifier for highlight.js
   */
  private static mapLanguage(language: string): string {
    // Map language names to highlight.js identifiers
    const languageMap: Record<string, string> = {
      node: 'javascript',
      nodejs: 'javascript',
      js: 'javascript',
      py: 'python',
      ts: 'typescript',
      tsx: 'typescript',
      jsx: 'javascript',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      // Add more mappings as needed
    };

    return languageMap[language.toLowerCase()] || language;
  }

  /**
   * Highlight code inline without boxed formatting for streaming content
   *
   * @param code The code to highlight
   * @param language The programming language
   * @returns Highlighted code string
   */
  static highlightCodeInline(code: string, language: string): string {
    // Map the language to the correct highlight.js identifier
    const highlightLanguage = this.mapLanguage(language);

    // Highlight the code using cli-highlight
    try {
      return highlight(code, {
        language: highlightLanguage,
        theme: {
          keyword: chalk.magenta,
          built_in: chalk.cyan,
          string: chalk.green,
          number: chalk.yellow,
          function: chalk.blue,
          title: chalk.blue.bold,
          comment: chalk.gray.italic,
          class: chalk.blue.bold,
          literal: chalk.magenta,
          type: chalk.cyan.italic,
        },
        ignoreIllegals: true,
      });
    } catch (error) {
      // Fall back to plain text if highlighting fails
      return code;
    }
  }

  /**
   * Highlights code based on language with beautiful formatting
   *
   * @param code The code to highlight
   * @param language The programming language
   * @param fileName Optional file name to display
   * @returns Highlighted code string with formatting
   */
  static highlightCode(code: string, language: string, fileName?: string): string {
    // Map the language to the correct highlight.js identifier
    const highlightLanguage = this.mapLanguage(language);

    // Highlight the code using cli-highlight
    const highlighted = highlight(code, {
      language: highlightLanguage,
      theme: {
        keyword: chalk.magenta,
        built_in: chalk.cyan,
        string: chalk.green,
        number: chalk.yellow,
        function: chalk.blue,
        title: chalk.blue.bold,
        comment: chalk.gray.italic,
        class: chalk.blue.bold,
        literal: chalk.magenta,
        type: chalk.cyan.italic,
      },
      ignoreIllegals: true,
    });

    // Create a title box if filename is provided
    const titleBox = fileName
      ? this.createTitleBox(fileName, language, 'code')
      : chalk.blue.bold(`========== ${language.toUpperCase()} CODE ==========`);

    // Add an extra newline before the title box to prevent output overlap
    return `\n${titleBox}\n${highlighted}\n${chalk.blue('─'.repeat(80))}\n`;
  }

  /**
   * Highlights execution results with visual enhancements
   *
   * @param result The execution result to highlight
   * @param success Whether execution was successful
   * @param fileName Optional file name associated with the result
   * @returns Highlighted result string with formatting
   */
  static highlightResult(result: string, success: boolean, fileName?: string): string {
    // Create a title box for the result
    const titleBox = fileName
      ? this.createTitleBox(fileName, success ? 'output' : 'error', success ? 'success' : 'error')
      : success
        ? chalk.green.bold('========== EXECUTION RESULT ==========')
        : chalk.red.bold('========== EXECUTION ERROR ==========');

    // Apply colors to the result content
    let colorizedResult = result;

    // Specially highlight execution time information
    colorizedResult = colorizedResult.replace(
      /=== EXECUTION TIME ===\n(\d+)ms/g,
      `=== ${chalk.cyan('EXECUTION TIME')} ===\n${chalk.yellow('$1')}ms`,
    );

    // Apply overall color to error messages
    if (!success) {
      colorizedResult = chalk.red(colorizedResult);
    }

    // Add an extra newline before the title box to prevent output overlap
    return `\n${titleBox}\n${colorizedResult}\n${chalk.blue('─'.repeat(80))}\n`;
  }

  /**
   * Creates a boxed title with appropriate styling
   *
   * @param fileName The file name to display
   * @param type The type of content (code, output, error)
   * @param status The status for color coding (code, success, error)
   * @returns A styled box containing the file information
   */
  private static createTitleBox(
    fileName: string,
    type: string,
    status: 'code' | 'success' | 'error',
  ): string {
    // Determine colors based on status
    const colors = {
      code: {
        border: chalk.blue,
        background: chalk.bgBlue.white,
        text: chalk.white,
      },
      success: {
        border: chalk.green,
        background: chalk.bgGreen.black,
        text: chalk.white,
      },
      error: {
        border: chalk.red,
        background: chalk.bgRed.white,
        text: chalk.white,
      },
    };

    const color = colors[status];
    const typeText = type.charAt(0).toUpperCase() + type.slice(1);

    return boxen(color.text(`${fileName} (${typeText})`), {
      borderColor: status === 'code' ? 'blue' : status === 'success' ? 'green' : 'red',
      borderStyle: 'round',
      padding: {
        left: 1,
        right: 1,
      },
      margin: {
        bottom: 1,
      },
      dimBorder: false,
    });
  }

  /**
   * Highlights LLM output with visual enhancements
   *
   * @param content The LLM model output content
   * @param label Optional label to display (e.g., "Thinking" or "Response")
   * @returns Highlighted LLM output string with formatting
   */
  static highlightLLMOutput(content: string, label = 'LLM OUTPUT'): string {
    // Create a title box for the LLM output
    const titleBox = boxen(chalk.cyan.bold(`${label}`), {
      borderColor: 'cyan',
      borderStyle: 'round',
      padding: {
        left: 1,
        right: 1,
      },
      margin: {
        bottom: 1,
      },
      dimBorder: false,
    });

    // Enhanced code block handling with improved regex
    let formattedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return '```' + lang + '\n' + this.highlightCodeInline(code, lang || 'plaintext') + '```';
    });

    // Apply some basic formatting to the content
    formattedContent = formattedContent.replace(/`([^`]+)`/g, (_, code) => chalk.yellow(code));

    // Highlight any potential JSON in the output
    formattedContent = formattedContent.replace(/({[\s\S]*?})/g, (match) => {
      try {
        // Try to parse and prettify JSON
        const parsed = JSON.parse(match);
        return highlight(JSON.stringify(parsed, null, 2), {
          language: 'json',
          theme: {
            string: chalk.green,
            number: chalk.yellow,
          },
        });
      } catch (e) {
        // If not valid JSON, return as is
        return match;
      }
    });

    // Add an extra newline before the title box to prevent output overlap
    return `\n${titleBox}\n${formattedContent}\n${chalk.cyan('─'.repeat(80))}\n`;
  }
}
