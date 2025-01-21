/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
