/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import chalk from 'chalk';

/**
 * Display ASCII art LOGO
 */
export function printWelcomeLogo(): void {
  console.log('');

  // ASCII art logo with enhanced TARS visibility
  const asciiLogo = [
    '  █████   ██████  ███████ ███    ██ ████████',
    ' ██   ██ ██       ██      ████   ██    ██   ',
    ' ███████ ██   ███ █████   ██ ██  ██    ██   ',
    ' ██   ██ ██    ██ ██      ██  ██ ██    ██   ',
    ' ██   ██  ██████  ███████ ██   ████    ██   ',
    '                                     ',
    '████████  █████  ██████   ███████ ',
    '   ██    ██   ██ ██   ██  ██      ',
    '   ██    ███████ ██████   ███████ ',
    '   ██    ██   ██ ██   ██       ██ ',
    '   ██    ██   ██ ██   ██  ███████ ',
  ];

  // Use more harmonious color scheme - blue for AGENT and a more subtle shade for TARS
  const agentColor = '#4d9de0';
  const tarsColor = '#7289da'; // Changed from bright orange to a more subtle blue-purple

  asciiLogo.forEach((line, index) => {
    if (index < 6) {
      // AGENT part - blue
      console.log(chalk.hex(agentColor)(line));
    } else {
      // TARS part - more subtle color
      console.log(chalk.hex(tarsColor)(line));
    }
  });

  console.log();
  console.log(chalk.dim(`Agent TARS CLI v${__VERSION__ || '0.0.0'}`));
  console.log();
}
