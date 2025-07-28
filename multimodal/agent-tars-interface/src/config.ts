/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentServerOptions } from '@multimodal/agent-server-interface';
import { AgentTARSOptions } from './core';

export interface AgentTARSAppConfig extends AgentTARSOptions, AgentServerOptions {}
