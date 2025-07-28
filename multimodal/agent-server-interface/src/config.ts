/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentServerOptions } from './server';
import { AgentOptions } from '@multimodal/agent-interface';

export type AgentAppConfig<T extends AgentOptions = AgentOptions> = T & AgentServerOptions;
