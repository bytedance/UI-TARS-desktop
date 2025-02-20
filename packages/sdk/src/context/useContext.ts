/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentContext } from '../types';
import { DEFAULT_CONTEXT } from '../constants';

// @ts-ignore
const globalThis = (typeof window !== 'undefined' ? window : global) as any;

const GLOBAL_CONTEXT_KEY = Symbol.for('@ui-tars/sdk/context');

if (!globalThis[GLOBAL_CONTEXT_KEY]) {
  globalThis[GLOBAL_CONTEXT_KEY] = DEFAULT_CONTEXT;
}

export function setContext(context: AgentContext): void {
  globalThis[GLOBAL_CONTEXT_KEY] = context;
}

export function useContext<T = AgentContext>(): T {
  return globalThis[GLOBAL_CONTEXT_KEY] as T;
}
