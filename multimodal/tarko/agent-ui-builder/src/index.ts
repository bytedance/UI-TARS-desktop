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
  new AgentUIBuilder(input).build({ destination: 'memory' });

export const buildHTMLToFile = (
  input: AgentUIBuilderInputOptions,
  filePath: string,
  overwrite = false,
): Promise<AgentUIBuilderResult> =>
  new AgentUIBuilder(input).build({
    destination: 'file',
    fileSystem: { filePath, overwrite },
  });

export const buildHTMLWithProcessor = (
  input: AgentUIBuilderInputOptions,
  postProcessor: PostProcessor,
): Promise<AgentUIBuilderResult> =>
  new AgentUIBuilder(input).build({
    destination: 'custom',
    postProcessor,
  });

// Static utility functions
export const generateDefaultFilePath = AgentUIBuilder.generateDefaultFilePath;
export const createShareProviderProcessor = AgentUIBuilder.createShareProviderProcessor;

// Static convenience method for one-off builds
export const buildHTML = (input: AgentUIBuilderInputOptions, output?: AgentUIBuilderOutputOptions): Promise<AgentUIBuilderResult> =>
  new AgentUIBuilder(input).build(output);

// Static convenience method for HTML generation only
export const generateHTML = (input: AgentUIBuilderInputOptions): string =>
  new AgentUIBuilder(input).generateHTML();
