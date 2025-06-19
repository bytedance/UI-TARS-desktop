/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';

/**
 * Display ASCII art LOGO
 */
export function printWelcomeLogo(version: string): void {
  // Define brand colors for gradient
  const brandColor1 = '#4d9de0'; // AGENT blue
  const brandColor2 = '#7289da'; // TARS purplish-blue

  // Create a gradient function
  const brandGradient = gradient(brandColor1, brandColor2);
  const logoGradient = gradient('#888', '#fff');

  // ASCII art logo for AGENT
  const agentArt = [
    ' █████  ██████  ███████ ███    ██ ████████',
    '██   ██ ██      ██      ████   ██    ██   ',
    '███████ ██   ██ █████   ██ ██  ██    ██   ',
    '██   ██ ██   ██ ██      ██  ██ ██    ██   ',
    '██   ██ ███████ ███████ ██   ████    ██   ',
  ].join('\n');

  // ASCII art logo for TARS
  const tarsArt = [
    '████████  █████  ██████   ███████',
    '   ██    ██   ██ ██   ██  ██     ',
    '   ██    ███████ ██████   ███████',
    '   ██    ██   ██ ██   ██       ██',
    '   ██    ██   ██ ██   ██  ███████',
  ].join('\n');

  // Combine the parts with styling
  const logoContent = [
    brandGradient.multiline(agentArt, { interpolation: 'hsv' }),
    '',
    brandGradient.multiline(tarsArt, { interpolation: 'hsv' }),
    '',
    '',
    `${brandGradient('An open-source Multimodal AI Agent')} ${chalk.dim(`v${version}`)}`,
    '',
    chalk.dim(logoGradient('https://agent-tars.com')),
  ].join('\n');

  // Create a box around the logo
  const boxedLogo = boxen(logoContent, {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderColor: brandColor2,
    borderStyle: 'classic',
    dimBorder: true,
  });

  console.log(boxedLogo);
}
