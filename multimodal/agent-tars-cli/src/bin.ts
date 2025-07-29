#!/usr/bin/env node

/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSCLI } from './index';

// Get version from package.json
const packageJson = require('../package.json');

// Create and bootstrap CLI
const cli = new AgentTARSCLI();

cli.bootstrap({
  version: packageJson.version,
  buildTime: __BUILD_TIME__,
  gitHash: __GIT_HASH__,
  binName: 'agent-tars',
  agentResolver: async (agentParam = 'agent-tars') => {
    // Handle built-in agents
    if (agentParam === 'agent-tars') {
      const { AgentTARS } = await import('@agent-tars/core');
      return {
        agentConstructor: AgentTARS,
        agentName: 'Agent TARS',
      };
    }

    // Handle custom agent modules
    try {
      const customAgentModule = await import(agentParam);
      const AgentConstructor =
        customAgentModule.default || customAgentModule.Agent || customAgentModule;

      if (!AgentConstructor || typeof AgentConstructor !== 'function') {
        throw new Error(`Invalid agent module: ${agentParam}. Must export an Agent constructor.`);
      }

      return {
        agentConstructor: AgentConstructor,
        agentName: `Custom Agent (${agentParam})`,
      };
    } catch (error) {
      throw new Error(
        `Failed to load agent "${agentParam}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
