/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// Public auto-learn surface:
// - UIMap is the persisted learning asset
// - RuntimeMapView is the budget-aware execution slice derived from UIMap
export { autoLearnAndRun } from './manager';
export { loadUIMap, saveUIMap } from './map-storage';
export { buildRuntimeMapView, buildRuntimeMapViewPrompt, expandRuntimeMapView, RUNTIME_BUDGETS } from './runtime-map-view';
export { DEFAULT_RUNTIME_LOCALE, RUNTIME_LOCALES, resolveRuntimeLocale } from './runtime-locale';
export {
  buildNavigationGoalPrompt,
  buildOnPageActionPrompt,
  buildOnPageHistoryMessages,
  extractNavigationSubtaskFromRuntimeMapView,
  parseRuntimeIntent,
  extractTargetPageLabelFromRuntimeMapView,
  shouldUseRuntimeMapView,
} from './map-context';
export type { AutoLearnConfig } from './manager';
export type { CompletionPolicy, RuntimeIntent, UIMap, RuntimeBudget, RuntimeMapView } from './types';
