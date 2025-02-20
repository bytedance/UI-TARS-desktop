/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentContext } from '../types';
import { DEFAULT_CONTEXT } from '../constants';

const isBrowser: boolean =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

// @ts-ignore
const _globalThis: any = isBrowser ? window : global;

const GLOBAL_CONTEXT_KEY = Symbol.for('@ui-tars/sdk/context');

if (!_globalThis[GLOBAL_CONTEXT_KEY]) {
  _globalThis[GLOBAL_CONTEXT_KEY] = DEFAULT_CONTEXT;
}

export function setContext(context: AgentContext): void {
  _globalThis[GLOBAL_CONTEXT_KEY] = context;
}

export function useContext<T = AgentContext>(): T {
  return _globalThis[GLOBAL_CONTEXT_KEY] as T;
}
