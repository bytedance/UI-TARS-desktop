/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';
import { AgentUIBuilderInputOptions } from '@tarko/agent-ui-builder';

/**
 * CLI options for the agui command
 */
export interface AguiCLIOptions {
  /** Output file path */
  out?: string;
  /** Path to transformer file */
  transformer?: string;
  /** Path to config file */
  config?: string;
  /** Upload URL for sharing */
  upload?: string;
}

/**
 * Transformer function type
 */
export type TraceTransformer<T = unknown> = (input: T) => { events: AgentEventStream.Event[] };

/**
 * Supported trace formats
 */
export interface TraceData {
  events: AgentEventStream.Event[];
}

/**
 * AGUI configuration type
 */
export type AguiConfig = Partial<AgentUIBuilderInputOptions>;
