/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSOptions } from './core';
import { AgentTARSServerOptions } from './server';

export interface AgentTARSAppConfig extends AgentTARSOptions, AgentTARSServerOptions {}
