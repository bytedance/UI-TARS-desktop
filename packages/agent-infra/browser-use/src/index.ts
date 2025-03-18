/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export { Agent } from './agent/service';
export { getBuildDomTreeScript } from './utils';
export { createSelectorMap, parseNode, removeHighlights } from './dom/service';
export type { RawDomTreeNode } from './dom/raw_types';
export { DOMElementNode } from './dom/views';
export * from './browser/utils';
