/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portions Copyright 2024-present zutron. All rights reserved.
 * Use of this source code is governed by a MIT license that can be
 * found in https://github.com/goosewobbler/zutron
 */
import { useStore as useZustandStore, type StoreApi } from 'zustand';
import { createStore as createZustandStore } from 'zustand/vanilla';
import type { AppState } from '@main/store/types';

export interface Handlers<S extends AnyState> {
  getState(): Promise<S>;
  subscribe(callback: (newState: S) => void): () => void;
}

type AnyState = Record<string, unknown>;
const createStore = <S extends AnyState>(bridge: Handlers<S>): StoreApi<S> => {
  const store = createZustandStore<Partial<S>>(
    (setState: StoreApi<S>['setState']) => {
      // subscribe to changes
      bridge.subscribe((state) => setState(state));

      // get initial state
      bridge.getState().then((state) => setState(state));

      // no state keys - they will all come from main
      return {};
    },
  );

  return store as StoreApi<S>;
};

type ExtractState<S> = S extends { getState: () => infer T } ? T : never;

type ReadonlyStoreApi<T> = Pick<
  StoreApi<T>,
  'getState' | 'getInitialState' | 'subscribe'
>;

type UseBoundStore<S extends ReadonlyStoreApi<unknown>> = {
  (): ExtractState<S>;
  <U>(selector: (state: ExtractState<S>) => U): U;
} & S;

const createUseStore = <S extends AppState>(
  bridge: Handlers<S>,
): UseBoundStore<StoreApi<S>> => {
  console.log('bridge', bridge);
  const vanillaStore = createStore<S>(bridge);
  const useBoundStore = (selector: (state: S) => unknown) =>
    useZustandStore(vanillaStore, selector);

  Object.assign(useBoundStore, vanillaStore);

  // return store hook
  return useBoundStore as UseBoundStore<StoreApi<S>>;
};

export const useStore = createUseStore<AppState>(window.zustandBridge);
export const getState = useStore.getState;
