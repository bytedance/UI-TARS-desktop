/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';
import { AgentUIBuilderInputOptions } from '@tarko/agent-ui-builder';

/**
 * Deep partial utility type
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

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
  /** Dump transformed JSON to file */
  dumpTransformed?: boolean;
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
 * AGUI configuration type - allows deep partial configuration
 */
export type AguiConfig = DeepPartial<AgentUIBuilderInputOptions>;

/**
 * Helper function to define transformer with type safety
 */
export function defineTransformer<T = unknown>(
  transformer: TraceTransformer<T>,
): TraceTransformer<T> {
  return transformer;
}

/**
 * Helper function to define config with type safety
 */
export function defineConfig(config: AguiConfig): AguiConfig {
  return config;
}
