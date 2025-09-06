/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogLevel } from '@tarko/interface';
import { AgentServer, resolveAgentImplementation } from '@tarko/agent-server';
import { ConsoleInterceptor } from '../../utils';
import { AgentCLIRunCommandOptions } from '../../types';

/**
 * Emit structured monitoring event
 */
function emitMonitorEvent(type: string, data: any): void {
  const event = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  // Output as JSON line for monitoring tools
  console.log(JSON.stringify(event));
}

/**
 * Process a query in silent mode and output results to stdout
 */
export async function processSilentRun(options: AgentCLIRunCommandOptions): Promise<void> {
  const { input, format = 'text', includeLogs = false, agentServerInitOptions, monitorFormat } = options;

  const { appConfig } = agentServerInitOptions;

  const isDebugMode = appConfig.logLevel === LogLevel.DEBUG;
  const shouldCaptureLogs = includeLogs || isDebugMode;
  const shouldSilenceLogs = !isDebugMode;
  const enableMonitoring = monitorFormat === 'json';

  // Emit initial status for monitoring
  if (enableMonitoring) {
    emitMonitorEvent('status', { state: 'starting', message: 'Initializing agent execution' });
  }

  const { agentConstructor } = await resolveAgentImplementation(appConfig.agent);
  
  if (enableMonitoring) {
    emitMonitorEvent('status', { state: 'executing', message: 'Agent execution started' });
  }
  
  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      const agent = new agentConstructor(appConfig);

      try {
        const executionResult = await agent.run(input);
        
        if (enableMonitoring) {
          emitMonitorEvent('status', { state: 'completed', message: 'Agent execution completed successfully' });
        }
        
        return executionResult;
      } catch (error) {
        if (enableMonitoring) {
          emitMonitorEvent('status', { state: 'error', message: `Agent execution failed: ${error}` });
        }
        throw error;
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

  // Emit completion event for monitoring
  if (enableMonitoring) {
    emitMonitorEvent('completion', { 
      status: 'idle', 
      result: result,
      ...(shouldCaptureLogs ? { logs } : {})
    });
  }

  // Output based on format (only if not in monitoring mode)
  if (!enableMonitoring) {
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
}

/**
 * Process a query in server mode with result caching
 */
export async function processServerRun(options: AgentCLIRunCommandOptions): Promise<void> {
  const {
    input,
    format = 'text',
    includeLogs = false,
    isDebug = false,
    agentServerInitOptions,
    monitorFormat,
  } = options;
  
  const enableMonitoring = monitorFormat === 'json';
  
  // Emit initial status for monitoring
  if (enableMonitoring) {
    emitMonitorEvent('status', { state: 'starting', message: 'Starting AgentServer for execution' });
  }

  const { appConfig } = agentServerInitOptions;

  appConfig.server = {
    ...(appConfig.server || {}),
    port: 8899,
  };

  const { result, logs } = await ConsoleInterceptor.run(
    async () => {
      let server: AgentServer | undefined;
      try {
        server = new AgentServer(agentServerInitOptions);

        if (enableMonitoring) {
          emitMonitorEvent('status', { state: 'executing', message: 'AgentServer started, processing query' });
        }

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
          if (enableMonitoring) {
            emitMonitorEvent('status', { state: 'error', message: `Server request failed: ${response.statusText}` });
          }
          throw new Error(`Server request failed: ${response.statusText}`);
        }

        const queryResult = await response.json();
        
        if (enableMonitoring) {
          emitMonitorEvent('status', { state: 'completed', message: 'Query processing completed successfully' });
        }
        
        return queryResult;
      } catch (error) {
        if (enableMonitoring) {
          emitMonitorEvent('status', { state: 'error', message: `Server execution failed: ${error}` });
        }
        throw error;
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

  // Emit completion event for monitoring
  if (enableMonitoring) {
    emitMonitorEvent('completion', { 
      status: 'idle', 
      result: result,
      ...(includeLogs ? { logs } : {})
    });
  }

  // Output based on format (only if not in monitoring mode)
  if (!enableMonitoring) {
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
}
