/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger } from '@tarko/mcp-agent';
import { BrowserControlMode } from '../types';
import { ModelProviderName } from '@tarko/agent';

/**
 * Supported providers for GUI-based browser control strategies
 */
const GUI_SUPPORTED_PROVIDERS: ModelProviderName[] = ['volcengine'];

/**
 * Validates the browser control mode based on model provider capabilities
 *
 * @param provider - The model provider name
 * @param requestedMode - The requested browser control mode
 * @param logger - Logger instance for user feedback
 * @returns The validated browser control mode (may be changed if unsupported)
 */
export function validateBrowserControlMode(
  provider: ModelProviderName | string | undefined,
  requestedMode: BrowserControlMode | undefined,
  logger: ConsoleLogger,
): BrowserControlMode {
  // Default to mixed mode if not specified
  const defaultMode: BrowserControlMode = 'hybrid';
  const requestedModeValue = requestedMode || defaultMode;

  // Early return if mode is already browser-use-only
  if (requestedModeValue === 'dom') {
    return requestedModeValue;
  }

  // If provider is not specified or not in GUI supported list, enforce browser-use-only
  if (!provider || !GUI_SUPPORTED_PROVIDERS.includes(provider as ModelProviderName)) {
    // Get friendly provider name for logging
    const providerName = provider ? provider : 'Unknown';

    // Log the restriction and enforcement
    logger.warn(
      `Vision-based browser control (${requestedModeValue}) is not supported with ${providerName}`,
    );
    logger.info(
      'Currently, vision-based browser control ("hyrid" / "visual-grounding") is only supported with Doubao 1.5 VL. ' +
        'Switching to "dom" mode.',
    );

    // Force browser-use-only mode
    return 'dom';
  }

  // Provider supports the requested mode, return it
  return requestedModeValue;
}
