/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './types';
export * from './builder';
export * from './static-path';

// Import for convenience exports
import { AgentUIBuilder } from './builder';

// Convenience exports for backward compatibility
export const buildHTMLInMemory = AgentUIBuilder.buildInMemory;
export const buildHTMLToFile = AgentUIBuilder.buildToFile;
export const buildHTMLWithProcessor = AgentUIBuilder.buildWithProcessor;
export const generateDefaultFilePath = AgentUIBuilder.generateDefaultFilePath;
export const createShareProviderProcessor = AgentUIBuilder.createShareProviderProcessor;
