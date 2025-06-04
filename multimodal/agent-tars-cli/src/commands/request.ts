/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { processRequestCommand } from '../request-command';

/**
 * Register the 'request' command
 */
export function registerRequestCommand(cli: CAC): void {
  cli
    .command('request', 'Send a direct request to an LLM provider')
    .option('--provider <provider>', 'LLM provider name (required)')
    .option('--model <model>', 'Model name (required)')
    .option('--body <body>', 'Path to request body JSON file or JSON string (required)')
    .option('--apiKey [apiKey]', 'Custom API key')
    .option('--baseURL [baseURL]', 'Custom base URL')
    .option('--stream', 'Enable streaming mode')
    .option('--thinking', 'Enable reasoning mode')
    .option('--format [format]', 'Output format: "raw" (default) or "semantic"', { default: 'raw' })
    .action(async (options = {}) => {
      try {
        await processRequestCommand(options);
      } catch (err) {
        console.error('Failed to process request:', err);
        process.exit(1);
      }
    });
}
