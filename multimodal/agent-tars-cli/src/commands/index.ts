/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { registerServeCommand } from './serve';
import { registerInteractiveCommand } from './interactive';
import { registerRequestCommand } from './request';

/**
 * Register all CLI commands
 */
export function registerCommands(cli: CAC): void {
  registerServeCommand(cli);
  registerInteractiveCommand(cli);
  registerRequestCommand(cli);
}
