/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// Re-export types from the model-provider package for backwards compatibility
import {
  ModelProviderName,
  ActualModelProviderName,
  ModelProviderServingConfig,
  ModelProvider,
  ModelDefaultSelection,
} from '@multimodal/model-provider/types';

export type {
  ModelProviderName,
  ActualModelProviderName,
  ModelProviderServingConfig,
  ModelProvider,
  ModelDefaultSelection,
};

/**
 * Modle feature flags, note that for now we DO NOT implement it fully.
 */
export enum ModelFeatureFlag {
  ChatCompletion = 0,
  ChatCompletionStreaming = 1,
  ToolCalls = 2,
  JSON = 3,
  Images = 4,
  Thinking = 5,
}
