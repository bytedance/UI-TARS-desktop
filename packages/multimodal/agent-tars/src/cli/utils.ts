// /packages/multimodal/agent-tars/src/cli/utils.ts
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { TEST_MODEL_PROVIDERS } from '@multimodal/agent/_config';
import { AgentTARSOptions } from '../types';

/**
 * Ensures a working directory exists and returns its path
 * @param sessionId Unique session identifier
 * @returns Path to the working directory
 */
export function ensureWorkingDirectory(sessionId: string): string {
  const workingDirectory = path.join(process.cwd(), 'workspace', sessionId);

  // Ensure working directory exists
  try {
    fs.mkdirSync(workingDirectory, { recursive: true });
    console.log(`Created or verified working directory: ${workingDirectory}`);
  } catch (error) {
    console.error(`Failed to create working directory ${workingDirectory}:`, error);
    throw new Error(
      `Failed to initialize agent workspace: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return workingDirectory;
}

/**
 * Get default agent configuration
 * @returns Common agent configuration
 */
export function getDefaultAgentConfig() {
  return {
    model: {
      providers: TEST_MODEL_PROVIDERS,
      defaults: {
        provider: 'azure-openai',
        model: 'aws_sdk_claude37_sonnet',
      },
    },
    tollCallEngine: 'PROMPT_ENGINEERING',
    maxIterations: 100,
    temperature: 0,
    thinking: {
      type: 'disabled',
    },
  } satisfies AgentTARSOptions;
}
