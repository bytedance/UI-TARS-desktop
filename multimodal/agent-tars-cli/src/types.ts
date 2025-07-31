/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/agent-server-interface';

/**
 * Agent TARS specific CLI arguments extending the base CLI arguments
 */
export interface AgentTARSCLIArguments extends AgentCLIArguments {
  // Browser configuration
  browser?: {
    control?: 'dom' | 'visual-grounding' | 'hybrid';
    headless?: boolean;
    cdpEndpoint?: string;
  };

  // Planner configuration
  planner?: {
    enable?: boolean;
    maxSteps?: number;
  };

  // Search configuration
  search?: {
    provider?: 'browser_search' | 'tavily' | 'bing_search';
    count?: number;
    apiKey?: string;
  };

  // AGIO configuration
  agio?: {
    provider?: string;
  };

  // MCP configuration
  mcpImpl?: 'stdio' | 'in-memory';

  // Experimental features
  experimental?: {
    dumpMessageHistory?: boolean;
  };

  // Deprecated options for backward compatibility
  browserControl?: string;
  browserCdpEndpoint?: string;
}
