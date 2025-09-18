/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARS, AgentTARSOptions } from '../src';

/**
 * Example: AIO Agent TARS with sandbox support
 * 
 * This example demonstrates how to create an Agent TARS instance
 * that connects to an AIO Sandbox for remote execution.
 */

export interface AIOAgentTARSOptions extends AgentTARSOptions {
  aioSandbox: string;
}

export default class AIOAgentTARS<
  T extends AIOAgentTARSOptions = AIOAgentTARSOptions,
> extends AgentTARS<T> {
  static label = 'AIOAgentTARS';

  constructor(options: T) {
    console.log('Creating AIO Agent TARS with options:', {
      aioSandbox: options.aioSandbox,
      model: options.model,
    });
    
    if (options.aioSandbox) {
      /**
       * The aioSandbox option automatically:
       * 1. Excludes all internal MCP Servers (browser, search, filesystem, commands)
       * 2. Connects to AIO Sandbox MCP at ${aioSandbox}/mcp
       * 3. Disables local browser operations
       */
      console.log(`🌐 Connecting to AIO Sandbox: ${options.aioSandbox}`);
    }

    super(options);
  }
}

// Usage example:
if (require.main === module) {
  const aioAgent = new AIOAgentTARS({
    aioSandbox: 'http://localhost:8080',
    model: {
      provider: 'openai',
      name: 'gpt-4',
    },
    search: {
      provider: 'browser_search',
    },
  });

  console.log('✅ AIO Agent TARS created successfully');
  console.log('Working directory:', aioAgent.getWorkingDirectory());
}
