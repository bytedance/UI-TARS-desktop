/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC } from 'cac';
import { registerServeCommand } from './serve';
import { registerInteractiveUICommand } from './interactive-ui';
import { registerRequestCommand } from './request';
import { registerRunCommand } from './run';
import { registerWorkspaceCommand } from './workspace';

/**
 * Register all CLI commands
 */
export function registerCommands(cli: CAC): void {
  registerServeCommand(cli);
  registerInteractiveUICommand(cli);
  registerRequestCommand(cli);
  registerRunCommand(cli);
  registerWorkspaceCommand(cli);
}
