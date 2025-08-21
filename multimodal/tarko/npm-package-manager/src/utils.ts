/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentImplementation } from '@tarko/interface';
import { TarkoNPMPackageManager, AgentInputType } from './TarkoNPMPackageManager';

/**
 * Check if input is a valid NPM package identifier
 */
export function isNPMPackage(input: string): boolean {
  // @scope/package or package-name patterns
  return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(input);
}

/**
 * Resolve agent implementation from NPM input
 * This is the main integration point for the CLI
 */
export async function resolveAgentFromNPMInput(
  input: string,
  options?: {
    update?: boolean;
    tag?: string;
    globalStoreDir?: string;
    npmRegistry?: string;
  }
): Promise<AgentImplementation | null> {
  const packageManager = new TarkoNPMPackageManager({
    globalStoreDir: options?.globalStoreDir,
    npmRegistry: options?.npmRegistry,
  });

  const inputType = packageManager.parseAgentInput(input);
  
  // Only handle NPM packages
  if (inputType !== 'npm-package') {
    return null;
  }

  try {
    return await packageManager.createAgentImplementation(input, {
      update: options?.update,
      tag: options?.tag,
    });
  } catch (error) {
    throw new Error(
      `Failed to resolve NPM agent '${input}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if input could be an NPM package and provide suggestions
 */
export function analyzeAgentInput(input: string): {
  type: AgentInputType;
  suggestions?: string[];
  isNPMCandidate: boolean;
} {
  const packageManager = new TarkoNPMPackageManager();
  const type = packageManager.parseAgentInput(input);
  
  const isNPMCandidate = type === 'npm-package' || (
    type === 'unknown' && 
    !input.includes('/') && 
    !input.includes('.') &&
    /^[a-z0-9-]+$/.test(input)
  );

  const suggestions: string[] = [];
  
  if (isNPMCandidate && !input.startsWith('tarko-')) {
    suggestions.push(`tarko-${input}`);
  }
  
  if (isNPMCandidate && !input.startsWith('@')) {
    suggestions.push(`@tarko/${input}`);
  }

  return {
    type,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    isNPMCandidate,
  };
}
