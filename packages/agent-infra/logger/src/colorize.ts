/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorName, TextStyle } from './types';

// Check if running in browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Check if color output is supported (Node.js environment)
const supportsColor =
  !isBrowser &&
  !('NO_COLOR' in process.env || process.env.FORCE_COLOR === '0') &&
  (process.env.FORCE_COLOR !== undefined || process.stdout?.isTTY);

/**
 * ANSI color codes for terminal output
 */
const ANSI_COLORS: Record<ColorName, string> = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
};

/**
 * ANSI text style codes
 */
const ANSI_STYLES: Record<TextStyle, string> = {
  bold: '\x1b[1m',
  normal: '',
};

/**
 * CSS color values for browser console
 */
export const CSS_COLOR_VALUES: Record<ColorName, string> = {
  black: '#1E1E2E',

  red: '#F87171',
  green: '#10B981',
  yellow: '#FBBF24',
  blue: '#3B82F6',
  magenta: '#A78BFA',
  cyan: '#06B6D4',
  white: '#F3F4F6',

  gray: '#9CA3AF',
  reset: 'inherit',
};

// CSS color styles for browser console
const CSS_COLORS: Record<ColorName, string> = {} as Record<ColorName, string>;
Object.entries(CSS_COLOR_VALUES).forEach(([key, value]) => {
  CSS_COLORS[key as ColorName] = `color: ${value}`;
});

/**
 * CSS text style values
 */
const CSS_STYLES: Record<TextStyle, string> = {
  bold: 'font-weight: bold',
  normal: '',
};

/**
 * Adds color to text in both Node.js and browser environments
 * Returns formatted text for Node.js or special format for browser console
 *
 * @param text - The text to colorize
 * @param color - The color to apply
 * @param style - The text style to apply
 * @returns Colorized text string
 */
export function colorize(
  text: string,
  color: ColorName,
  style: TextStyle = 'normal',
): string {
  if (!text) return text;

  if (isBrowser) {
    // For browser, we still return the original text
    // The actual coloring happens in the log function
    return text;
  }

  // In Node.js environment, add ANSI color codes if supported
  if (supportsColor) {
    let result = text;

    if (style !== 'normal') {
      result = `${ANSI_STYLES[style]}${result}`;
    }

    result = `${ANSI_COLORS[color]}${result}`;

    return `${result}${ANSI_COLORS.reset}`;
  }

  // Return original text in environments without color support
  return text;
}

/**
 * Logs colored text in both browser and Node.js environments
 * Ensures consistent behavior across platforms
 *
 * @param text - The text to log with color
 * @param color - The color to apply
 * @param style - The text style to apply
 */
export function colorLog(
  text: string,
  color: ColorName,
  style: TextStyle = 'normal',
): void {
  if (isBrowser) {
    let cssStyle = CSS_COLORS[color] || '';
    if (style !== 'normal') {
      cssStyle += '; ' + CSS_STYLES[style];
    }
    console.log(`%c${text}`, cssStyle);
  } else if (supportsColor) {
    console.log(colorize(text, color, style));
  } else {
    console.log(text);
  }
}
