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
  // Server configuration
  /** Server port number - maps to server.port */
  port?: number;

  // Deprecated options, for backward compatible
  provider?: string;
  apiKey?: string;
  baseURL?: string;
  browserControl?: string;
  browserCdpEndpoint?: string;
  shareProvider?: string;

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

  // Allow additional properties for extensibility
  [key: string]: any;
};
