/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    entry: ['src/**/*.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    bundle: false,
    outDir: 'dist',
  };
});
