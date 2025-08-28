/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge, DeepPartial } from '@tarko/shared-utils';
import { AgentTARSOptions } from '../types';

/**
 * Creates default configuration options for AgentTARS
 */
export const AGENT_TARS_DEFAULT_OPTIONS: AgentTARSOptions = {
  search: {
    provider: 'browser_search',
    count: 10,
    browserSearch: {
      engine: 'google',
      needVisitedUrls: false,
    },
  },
  browser: {
    type: 'local',
    headless: false,
    control: 'hybrid',
  },
  mcpImpl: 'in-memory',
  mcpServers: {},
  maxTokens: 8192,
  enableStreamingToolCallEvents: true,
};

/**
 * Applies default options and merges with user options
 *
 * @param options User-provided options
 * @returns Complete merged options
 */
export function applyDefaultOptions<T extends AgentTARSOptions>(options: DeepPartial<T>): T {
  return deepMerge(AGENT_TARS_DEFAULT_OPTIONS, options) as T;
}
