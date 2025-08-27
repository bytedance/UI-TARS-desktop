/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig } from './config';

/**
 * Command line interface arguments definition
 * Used to capture and parse CLI input parameters
 *
 * This interface leverages the CLI parser's automatic nesting capability for dot notation
 * (e.g., --model.id maps directly to model.id in the parsed object structure)
 * By picking from AgentAppConfig, we ensure type safety and avoid duplication
 */
export type AgentCLIArguments = Pick<
  AgentAppConfig,
  'model' | 'thinking' | 'toolCallEngine' | 'share' | 'snapshot' | 'logLevel' | 'server'
> & {
  /** Server port number - maps to server.port */
  port?: number;

  // Deprecated options, for backward compatible
  provider?: string;
  apiKey?: string;
  baseURL?: string;
  shareProvider?: string;
  thinking?: boolean;

  /** Configuration file paths or URLs */
  config?: string[];

  // Logging configuration shortcuts
  /** Enable debug mode (highest priority, shows tool calls and system events) */
  debug?: boolean;
  /** Reduce startup logging to minimum */
  quiet?: boolean;

  // LLM behavior configuration
  /** Enable streaming mode for LLM responses */
  stream?: boolean;

  /** Open the web UI in the default browser on server start */
  open?: boolean;

  /**
   * Agent implementation to use
   * Can be a built-in agent name or a path to a custom agent module
   */
  agent?: string;

  /** Run in headless mode (for run command) */
  headless?: boolean;

  /** Input query for headless mode */
  input?: string | string[];

  /** Output format for headless mode */
  format?: 'json' | 'text';

  /** Include captured logs in output (for headless mode) */
  includeLogs?: boolean;

  /** Use cache for headless mode execution (for headless mode) */
  useCache?: boolean;

  // Allow additional properties for extensibility
  [key: string]: any;
};
