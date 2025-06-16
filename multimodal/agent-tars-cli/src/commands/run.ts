/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { AgentTARSCLIArguments, addCommonOptions, processCommonOptions } from './options';
import { processSilentRun } from '../core/run';

/**
 * Register the 'run' command for silent execution
 */
export function registerRunCommand(cli: CAC): void {
  const runCommand = cli.command(
    'run',
    'Run Agent TARS in silent mode and output results to stdout',
  );

  runCommand
    .option('--input [...query]', 'Input query to process (required)')
    .option('--format [format]', 'Output format: "json" or "text" (default: "text")', {
      default: 'text',
    })
    .option('--include-logs', 'Include captured logs in the output (for debugging)', {
      default: false,
    });

  addCommonOptions(runCommand).action(async (options: AgentTARSCLIArguments = {}) => {

    try {
      // Ensure input is provided
      if (!options.input || (Array.isArray(options.input) && options.input.length === 0)) {
        console.error('Error: --input parameter is required');
        process.exit(1);
      }

      const { appConfig } = await processCommonOptions({
        ...options,
        quiet: true, // Force quiet mode for silent operation
      });

      // Process the query in silent mode
      await processSilentRun({
        appConfig,
        input: Array.isArray(options.input) ? options.input.join(' ') : options.input,
        format: options.format as 'json' | 'text',
        includeLogs: options.includeLogs,
      });
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
}
