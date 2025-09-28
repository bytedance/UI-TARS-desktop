/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Claude model detection and header utilities
 */

/**
 * Check if a model is a Claude model
 */
export function isClaudeModel(model: string): boolean {
  const claudePatterns = [
    /^claude-/i,
    /^anthropic\//i,
  ];
  return claudePatterns.some((pattern) => pattern.test(model));
}

/**
 * Get Claude-specific beta features headers
 */
export function getClaudeHeaders(): Record<string, string> {
  const betaFeatures = [
    'fine-grained-tool-streaming-2025-05-14',
    'token-efficient-tools-2025-02-19',
  ];

  return {
    'anthropic-beta': betaFeatures.join(','),
  };
}

/**
 * Automatically add Claude headers to model configuration if it's a Claude model
 */
export function addClaudeHeadersIfNeeded(
  model: string,
  existingHeaders?: Record<string, string>,
): Record<string, string> {
  if (!isClaudeModel(model)) {
    return existingHeaders || {};
  }

  const claudeHeaders = getClaudeHeaders();
  return {
    ...existingHeaders,
    ...claudeHeaders,
  };
}
