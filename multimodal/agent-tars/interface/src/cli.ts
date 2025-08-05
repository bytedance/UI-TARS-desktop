/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentCLIArguments } from '@tarko/interface';
import { AgentTARSAppConfig } from './config';

/**
 * Command line interface arguments definition
 * Used to capture and parse CLI input parameters
 *
 * This interface leverages the CLI parser's automatic nesting capability for dot notation
 * (e.g., --model.id maps directly to model.id in the parsed object structure)
 * By picking from AgentTARSAppConfig, we ensure type safety and avoid duplication
 */
export type AgentTARSCLIArguments = Pick<
  AgentTARSAppConfig,
  'workspace' | 'browser' | 'planner' | 'search' | 'agio'
> &
  AgentCLIArguments & {
    // Deprecated shortcut options for backward compatibility
    browserControl?: string;
    browserCdpEndpoint?: string;
  };
