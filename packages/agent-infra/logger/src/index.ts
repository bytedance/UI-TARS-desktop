/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './types';
export * from './console-logger';
export { colorize, colorLog } from './colorize';

// Explicitly export Logger interface for better IDE support
export type { Logger } from './types';
