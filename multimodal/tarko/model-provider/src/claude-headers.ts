/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Claude model detection and header utilities
 */

const ANTHROPIC_BETA_HEADER = 'anthropic-beta';

const DEFAULT_BETA_FEATURES: string[] = [
  'fine-grained-tool-streaming-2025-05-14',
  'token-efficient-tools-2025-02-19',
];

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
  return {
    [ANTHROPIC_BETA_HEADER]: DEFAULT_BETA_FEATURES.join(','),
  };
}

/**
 * Automatically add Claude headers to model configuration if it's a Claude model
 *
 * `anthropic-beta` is a comma-separated list, so a value the caller already provided is
 * extended rather than replaced: overwriting it would make every beta flag outside
 * {@link DEFAULT_BETA_FEATURES} impossible to request.
 */
export function addClaudeHeadersIfNeeded(
  model: string,
  existingHeaders?: Record<string, string>,
): Record<string, string> {
  if (!isClaudeModel(model)) {
    return existingHeaders || {};
  }

  const headers: Record<string, string> = { ...existingHeaders };

  // Header field names are case-insensitive, so the entry the caller wrote is reused
  // instead of sending a second 'anthropic-beta' header.
  const betaKey =
    Object.keys(headers).find((key) => key.toLowerCase() === ANTHROPIC_BETA_HEADER) ??
    ANTHROPIC_BETA_HEADER;

  const features = [...DEFAULT_BETA_FEATURES];
  for (const feature of (headers[betaKey] ?? '').split(',')) {
    const trimmed = feature.trim();
    if (trimmed && !features.includes(trimmed)) {
      features.push(trimmed);
    }
  }

  headers[betaKey] = features.join(',');

  return headers;
}
