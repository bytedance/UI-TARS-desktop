/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './types';
export * from './builder';
export * from './static-path';

// Import for convenience exports
import { AgentUIBuilder } from './builder';
import type { AgentUIBuilderInputOptions, AgentUIBuilderResult, PostProcessor } from './types';

// Convenience exports for backward compatibility
export const buildHTMLInMemory = (input: AgentUIBuilderInputOptions): Promise<AgentUIBuilderResult> =>
  AgentUIBuilder.buildHTML(input, { destination: 'memory' });

export const buildHTMLToFile = (
  input: AgentUIBuilderInputOptions,
  filePath: string,
  overwrite = false,
): Promise<AgentUIBuilderResult> =>
  AgentUIBuilder.buildHTML(input, {
    destination: 'file',
    fileSystem: { filePath, overwrite },
  });

export const buildHTMLWithProcessor = (
  input: AgentUIBuilderInputOptions,
  postProcessor: PostProcessor,
): Promise<AgentUIBuilderResult> =>
  AgentUIBuilder.buildHTML(input, {
    destination: 'custom',
    postProcessor,
  });

export const generateDefaultFilePath = AgentUIBuilder.generateDefaultFilePath;
export const createShareProviderProcessor = AgentUIBuilder.createShareProviderProcessor;
