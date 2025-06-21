/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { parse } from 'yaml';

const workspaceFile = readFileSync(resolve(__dirname, 'pnpm-workspace.yaml'), 'utf8');
const workspaceConfig = parse(workspaceFile);

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul', // or 'v8'
    },
    projects: workspaceConfig.packages,
  },
});
