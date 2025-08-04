/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngineType } from '@tarko/agent-interface';

/**
 * ProviderEngineSelector - Maps model providers to their optimal tool call engines
 *
 * This utility provides intelligent selection of the most appropriate tool call engine
 * based on model provider capabilities and best practices:
 *
 * - volcengine: Uses structured_outputs for best performance with JSON schema responses
 * - openai, azure-openai, anthropic: Use native tool calling capabilities
 * - Default fallback to native for maximum compatibility
 *
 * @param provider - The model provider name
 * @returns The recommended tool call engine type for the provider
 */
export function getToolCallEngineForProvider(provider?: string): ToolCallEngineType {
  if (!provider) {
    return 'native';
  }

  switch (provider.toLowerCase()) {
    case 'volcengine':
      return 'structured_outputs';
    case 'openai':
    case 'azure-openai':
    case 'anthropic':
      return 'native';
    default:
      return 'native';
  }
}
