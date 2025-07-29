/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export default {
  '*': ['secretlint --no-maskSecrets'],
  '**/*.{ts,tsx}': ['npx prettier --write'],
  'src/{main,preload}/**/*.{ts,tsx}': [() => 'npm run typecheck:node'],
  'src/renderer/**/*.{ts,tsx}': [() => 'npm run typecheck:web'],
};
