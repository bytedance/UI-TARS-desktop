/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LogLevel } from '@tarko/interface';
import { resolve } from 'node:path';

// FIXME: using defineConfig
export default {
  model: {
    provider: 'openai-non-streaming',
    baseURL: process.env.OMNI_TARS_BASE_URL,
    apiKey: process.env.OMNI_TARS_API_KEY,
    id: process.env.OMNI_TARS_MODEL_ID,
  },
  logLevel: LogLevel.DEBUG,
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'A multimodal AI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Excute ls -al',
      'Write hello world using python',
    ],
  },
  aioSandboxUrl: process.env.AIO_SANDBOX_URL,
  ignoreSandboxCheck: true,
  snapshot: { storageDirectory: resolve(__dirname, 'snapshots'), enable: true },
};
