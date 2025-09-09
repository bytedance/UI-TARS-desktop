#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { AguiCore } from './core';
import { AguiCLIOptions } from './types';

const cli = cac('agui');

// Version from package.json
cli.version('0.3.0-beta.10');

// Main dump command
cli
  .command('<trace>', 'Generate agent UI HTML from trace file')
  .option('--out <path>', 'Output file path')
  .option('--transformer <path>', 'Path to transformer file')
  .option('--config <path>', 'Path to config file')
  .option('--upload <url>', 'Upload URL for sharing')
  .action(async (tracePath: string, options: AguiCLIOptions) => {
    try {
      if (options.upload) {
        // Upload mode
        const shareUrl = await AguiCore.upload(tracePath, options.upload, options);
        console.log(`✅ Uploaded successfully: ${shareUrl}`);
      } else {
        // Dump mode
        const outputPath = await AguiCore.dump(tracePath, options);
        console.log(`✅ Generated HTML: ${outputPath}`);
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Help command
cli.help(() => {
  console.log(`
  AGUI CLI - Agent UI Builder Command Line Interface
  
  Generate and share agent replay HTML files from trace data.
  
  Examples:
    agui ./trace.json
    agui ./trace.json --out ./report.html
    agui ./trace.json --transformer ./transformer.ts
    agui ./trace.json --config ./config.json
    agui ./trace.json --upload http://share.example.com
  `);
});

// Parse CLI arguments
cli.parse();
