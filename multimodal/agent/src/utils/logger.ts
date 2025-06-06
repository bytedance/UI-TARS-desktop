/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

export { ConsoleLogger };
// Create the root logger
const rootLogger = new ConsoleLogger();

// Set default log level based on environment variables
if (typeof process !== 'undefined' && process.env.AGENT_DEBUG) {
  rootLogger.setLevel(LogLevel.DEBUG);
} else {
  rootLogger.setLevel(LogLevel.SUCCESS);
}

/**
 * Create and get a module-specific logger
 * @param module The module name, which will be used as the log prefix
 * @returns A logger instance specific to the module
 */
export function getLogger(module: string) {
  return rootLogger.spawn(module);
}

// Export the main logger and log levels for consumers
export { rootLogger, LogLevel };
