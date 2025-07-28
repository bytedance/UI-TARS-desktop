/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSAppConfig } from '@agent-tars/interface';
import { AgentServer } from '@multimodal/agent-server';
import { ConsoleInterceptor } from '../utils/console-interceptor';
import { getBootstrapCliOptions } from './state';

interface ServerRunOptions {
  appConfig: AgentTARSAppConfig;
  input: string;
  format?: 'json' | 'text';
  includeLogs?: boolean;
  isDebug?: boolean;
  agentConstructor: new (options: any) => any;
  agentName: string;
}

/**
 * Process a query in server mode with result caching
 * This allows results to be stored and retrieved later from the UI
 */
export async function processServerRun(options: ServerRunOptions): Promise<void> {
  const {
    appConfig,
    input,
    format = 'text',
    includeLogs = false,
    isDebug = false,
    agentConstructor,
    agentName,
  } = options;

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  appConfig.server = {
    ...(appConfig.server || {}),
    // Using different port from `agent-tars start`.
    port: 8899,
  };

  // Get bootstrap options for build info
  const bootstrapOptions = getBootstrapCliOptions();

  // Start with console interception for clean output
  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      let server: AgentServer | undefined;
      try {
        // Create and start server with injected agent
        server = new AgentServer(
          {
            agentConstructor,
            agentOptions: appConfig,
          },
          {
            agioProvider: bootstrapOptions.agioProvider,
            version: bootstrapOptions.version,
            buildTime: bootstrapOptions.buildTime,
            gitHash: bootstrapOptions.gitHash,
          },
        );

        await server.start();

        // Send request to server
        const response = await fetch(
          `http://localhost:${appConfig.server!.port}/api/v1/oneshot/query`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: input,
              sessionName: input,
              sessionTags: ['run'],
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Server request failed: ${response.statusText}`);
        }

        return await response.json();
      } finally {
        // Ensure server is stopped within the interceptor context
        if (server) {
          try {
            await server.stop();
          } catch (stopError) {
            if (isDebug) {
              console.error(`Error stopping server: ${stopError}`);
            }
          }
        }
      }
    },
    {
      silent: !isDebug,
      capture: includeLogs || isDebug,
      debug: isDebug,
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
    if (result.result?.content) {
      process.stdout.write(result.result.content);
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
