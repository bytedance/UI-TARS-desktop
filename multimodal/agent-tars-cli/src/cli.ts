#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { printWelcomeLogo } from './logo';
import { registerCommands } from './commands';

// Display ASCII art LOGO immediately at program entry
printWelcomeLogo();

// Create CLI with custom styling
const cli = cac('tars');

// Use package.json version
cli.version(__VERSION__);
cli.help();

// Register all commands
registerCommands(cli);

// Parse command line arguments
cli.parse();
