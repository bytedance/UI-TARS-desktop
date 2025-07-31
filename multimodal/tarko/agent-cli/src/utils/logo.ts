/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';

/**
 * Display ASCII art logo for generic agent
 */
export function printWelcomeLogo(
  title: string,
  version: string,
  subtitle?: string,
  customArt?: string | string[],
  url?: string,
): void {
  // Define brand colors for gradient
  const brandColor1 = '#4d9de0';
  const brandColor2 = '#7289da';

  // Create a gradient function
  const brandGradient = gradient(brandColor1, brandColor2);
  const logoGradient = gradient('#888', '#fff');

  // Use custom art if provided, otherwise use default TARKO art
  const defaultAgentArt = [
    '████████╗  █████╗  ██████╗  ██╗  ██╗  ██████╗ ',
    '╚══██╔══╝ ██╔══██╗ ██╔══██╗ ██║ ██╔╝ ██╔═══██╗',
    '   ██║    ███████║ ██████╔╝ █████╔╝  ██║   ██║',
    '   ██║    ██╔══██║ ██╔══██╗ ██╔═██╗  ██║   ██║',
    '   ██║    ██║  ██║ ██║  ██║ ██║  ██╗ ╚██████╔╝',
    '   ╚═╝    ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝  ╚═════╝ ',
  ].join('\n');

  // Handle multiple arts or single art
  const arts = customArt ? (Array.isArray(customArt) ? customArt : [customArt]) : [defaultAgentArt];

  // Build logo content
  const logoContent: string[] = [];

  // Add each art with gradient styling
  arts.forEach((art, index) => {
    logoContent.push(brandGradient.multiline(art, { interpolation: 'hsv' }));
    // Add spacing between arts (except for the last one)
    if (index < arts.length - 1) {
      logoContent.push('');
    }
  });

  // Add title and version
  logoContent.push('');
  logoContent.push(`${brandGradient(title)} ${chalk.dim(`v${version}`)}`);

  // Add subtitle if provided
  if (subtitle) {
    logoContent.push('');
    logoContent.push(chalk.dim(logoGradient(subtitle)));
  }

  // Add URL if provided
  if (url) {
    logoContent.push('');
    logoContent.push(chalk.dim(logoGradient(url)));
  }

  // Create a box around the logo
  const boxedLogo = boxen(logoContent.join('\n'), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderColor: brandColor2,
    borderStyle: 'classic',
    dimBorder: true,
  });

  console.log(boxedLogo);
}
