/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createUseStore } from 'zutron';

import type { AppState } from '@main/store/types';

export const useStore = createUseStore<AppState>(window.zutron);
