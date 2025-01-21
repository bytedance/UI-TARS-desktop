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
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tsconfigPath from 'vite-tsconfig-paths';
import { defineProject } from 'vitest/config';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineProject({
  root: './',
  test: {
    globals: true,
    setupFiles: [resolve(__dirname, '../../scripts/vitest-setup.ts')],
    environment: 'node',
    includeSource: [resolve(__dirname, '.')],
  },

  plugins: [
    tsconfigPath({
      projects: ['../../tsconfig.node.json'],
    }),
  ],
});
