/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConstructor, AgentAppConfig, LogLevel } from '@multimodal/agent-server-interface';
import { ConsoleInterceptor } from '../utils/console-interceptor';

interface SilentRunOptions {
  appConfig: AgentAppConfig;
  input: string;
  agentConstructor: AgentConstructor;
  agentName: string;
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
  const { appConfig, agentConstructor, input, format = 'text', includeLogs = false } = options;

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  // Determine if we're in debug mode
  const isDebugMode = appConfig.logLevel === LogLevel.DEBUG;

  // Don't capture or silence console in debug mode
  const shouldCaptureLogs = includeLogs || isDebugMode;
  const shouldSilenceLogs = !isDebugMode;

  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      // Create an agent instance with provided config
      const agent = new agentConstructor(appConfig);

      try {
        // Run the agent with the input query
        return await agent.run(input);
      } finally {
        // Ensure agent is shut down properly
        await agent.dispose();
      }
    },
    {
      silent: shouldSilenceLogs, // Only silence logs if not in debug mode
      capture: shouldCaptureLogs, // Always capture logs in debug mode
      debug: isDebugMode,
    },
  );

  // Output based on format
  if (format === 'json') {
    // Output as JSON with optional logs
    const output = {
      ...result,
      ...(shouldCaptureLogs ? { logs } : {}),
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
    if (shouldCaptureLogs && logs.length > 0 && !isDebugMode) {
      process.stdout.write('\n\n--- Logs ---\n');
      process.stdout.write(logs.join('\n'));
    }
  }
}
