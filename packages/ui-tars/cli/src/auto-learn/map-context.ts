/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// Thin compatibility layer that re-exports runtime resolver and prompt helpers.
export {
  extractNavigationSubtaskFromRuntimeMapView,
  parseRuntimeIntent,
  extractTargetPageLabelFromRuntimeMapView,
  shouldUseRuntimeMapView,
} from './runtime-resolver';
export {
  buildNavigationGoalPrompt,
  buildOnPageActionPrompt,
  buildOnPageHistoryMessages,
} from './runtime-prompts';
