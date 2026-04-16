/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export { autoLearnAndRun } from './manager';
export { loadMap } from './map-storage';
export {
  buildAppMapContextPrompt,
  buildNavigationGoalPrompt,
  buildOnPageActionPrompt,
  buildOnPageHistoryMessages,
  extractNavigationSubtask,
  extractTargetPageName,
  shouldUseAppMapContext,
} from './map-context';
export type { AutoLearnConfig } from './manager';
export type { AppMap } from './types';
