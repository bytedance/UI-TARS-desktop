/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rslib/core';
import { execSync } from 'child_process';

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

/**
 * Get current git commit hash
 * @returns Short git hash or 'unknown' if git is not available
 */
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('Failed to get git hash:', error);
    return 'unknown';
  }
}

export default defineConfig({
  source: {
    entry: {
      index: ['src/index.ts'],
    },
    define: {
      __BUILD_TIME__: JSON.stringify(Date.now()),
      __GIT_HASH__: JSON.stringify(getGitHash()),
    },
  },
  lib: [
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
      dts: true,
      banner: { js: BANNER },
      autoExternal: {
        dependencies: false,
        optionalDependencies: true,
        peerDependencies: true,
      },
      output: {
        externals: ['@agent-tars/core', '@tarko/agent-server', '@tarko/shared-utils', '@tarko/agent-ui-builder'],
      },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: false,
    sourceMap: false,
  },
});
