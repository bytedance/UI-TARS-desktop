#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { bootstrapCli } from './index';

export { bootstrapCli };

// @ts-expect-error The `require` object is modified by Rspack here,
// so we use the deprecated api `process.mainModule` and it's stable.
if (process.mainModule.filename === __filename) {
  bootstrapCli();
}
