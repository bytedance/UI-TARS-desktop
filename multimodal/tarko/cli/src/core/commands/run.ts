/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel } from '@tarko/agent-server-interface';
import { AgentServer } from '@tarko/agent-server';
import { ConsoleInterceptor } from '../../utils';
import { RunOptions } from '../../types';

/**
 * Process a query in silent mode and output results to stdout
 */
export async function processSilentRun(options: RunOptions): Promise<void> {
  const { appConfig, agentConstructor, input, format = 'text', includeLogs = false } = options;

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  const isDebugMode = appConfig.logLevel === LogLevel.DEBUG;
  const shouldCaptureLogs = includeLogs || isDebugMode;
  const shouldSilenceLogs = !isDebugMode;

  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      const agent = new agentConstructor(appConfig);

      try {
        return await agent.run(input);
      } finally {
        await agent.dispose();
      }
    },
    {
      silent: shouldSilenceLogs,
      capture: shouldCaptureLogs,
      debug: isDebugMode,
    },
  );

  // Output based on format
  if (format === 'json') {
    const output = {
      ...result,
      ...(shouldCaptureLogs ? { logs } : {}),
    };
    process.stdout.write(JSON.stringify(output, null, 2));
  } else {
    if (result.content) {
      process.stdout.write(result.content);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2));
    }

    if (shouldCaptureLogs && logs.length > 0 && !isDebugMode) {
      process.stdout.write('\n\n--- Logs ---\n');
      process.stdout.write(logs.join('\n'));
    }
  }
}

/**
 * Process a query in server mode with result caching
 */
export async function processServerRun(options: RunOptions): Promise<void> {
  const {
    appConfig,
    input,
    format = 'text',
    includeLogs = false,
    isDebug = false,
    agentConstructor,
    agentServerExtraOptions,
  } = options;

  if (!appConfig.workspace) {
    appConfig.workspace = {};
  }

  appConfig.server = {
    ...(appConfig.server || {}),
    port: 8899,
  };

  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      let server: AgentServer | undefined;
      try {
        server = new AgentServer(
          {
            agentConstructor,
            agentOptions: appConfig,
          },
          agentServerExtraOptions,
        );

        await server.start();

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

  if (format === 'json') {
    const output = {
      ...result,
      ...(includeLogs ? { logs } : {}),
    };
    process.stdout.write(JSON.stringify(output, null, 2));
  } else {
    if (result.result?.content) {
      process.stdout.write(result.result.content);
    } else {
      process.stdout.write(JSON.stringify(result, null, 2));
    }

    if (includeLogs && logs.length > 0) {
      process.stdout.write('\n\n--- Logs ---\n');
      process.stdout.write(logs.join('\n'));
    }
  }
}
