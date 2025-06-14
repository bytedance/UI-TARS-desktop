/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARS } from '@agent-tars/core';
import { AgentTARSAppConfig } from '@agent-tars/interface';
import { ConsoleInterceptor } from '../utils/console-interceptor';

interface SilentRunOptions {
  appConfig: AgentTARSAppConfig;
  input: string;
  format?: 'json' | 'text';
  /**
   * If true, will also include logs in the output (debug mode)
   */
  includeLogs?: boolean;
}

/**
 * Process a query in silent mode and output results to stdout
 */
export async function processSilentRun(options: SilentRunOptions): Promise<void> {
  const { appConfig, input, format = 'text', includeLogs = false } = options;

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      // Create an agent instance with provided config
      const agent = new AgentTARS(appConfig);

      try {
        // Run the agent with the input query
        return await agent.run(input);
      } finally {
        // Ensure agent is shut down properly
        await agent.cleanup();
      }
    },
    {
      silent: true,
      capture: includeLogs,
      debug: includeLogs,
    },
  );

  // Output based on format
  if (format === 'json') {
    // Output as JSON with optional logs
    const output = {
      ...result,
      ...(includeLogs ? { logs } : {}),
    };
    process.stdout.write(JSON.stringify(output, null, 2));
  } else {
    // Output as plain text (just the content)
    if (result.content) {
      process.stdout.write(result.content);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2));
    }

    // If includeLogs is true, append logs after content
    if (includeLogs && logs.length > 0) {
      process.stdout.write('\n\n--- Logs ---\n');
      process.stdout.write(logs.join('\n'));
    }
  }
}
