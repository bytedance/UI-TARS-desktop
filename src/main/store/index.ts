/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { type AppState } from './types';

export type Subscribe = (
  listener: (state: AppState, prevState: AppState) => void,
) => () => void;
export type Handlers = Record<string, () => void>;

export type Store = {
  getState: () => AppState;
  getInitialState: () => AppState;
  setState: (stateSetter: (state: AppState) => AppState) => void;
  subscribe: Subscribe;
};
